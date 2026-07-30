import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { WsService } from '../ws/ws.service';
import { Cron } from '@nestjs/schedule';
import * as moment from 'moment-timezone';
import { NotificationType } from '@prisma/client';
import {
  LESSON_REMINDER_START_AT,
  LESSON_REMINDER_TARGET_BOOKED,
  LESSON_REMINDER_MAX_PER_RUN,
} from '../common/constants/notifications';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private wsService: WsService,
  ) {}

  // Run every day at 11:00 AM Chisinau time
  // TEMPORARILY DISABLED - Uncomment to re-enable daily notifications
  // @Cron('0 11 * * *', {
  //   timeZone: 'Europe/Chisinau'
  // })
  async sendDailyNotifications() {
    await this.sendNotificationsForNextDay();
  }

  async sendNotificationsForNextDay() {
    const tomorrow = moment().tz('Europe/Chisinau').add(1, 'day').startOf('day');
    const dayAfterTomorrow = moment(tomorrow).add(1, 'day');

    const reservations = await this.prisma.reservation.findMany({
      where: {
        startTime: {
          gte: tomorrow.toDate(),
          lt: dayAfterTomorrow.toDate(),
        }
      },
      select: {
        id: true,
        startTime: true,
        sector: true,
        user: {
          select: {
            email: true,
            firstName: true
          }
        },
        instructor: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    this.logger.log(`Found ${reservations.length} reservations for tomorrow`);

    for (const reservation of reservations) {
      const confirmationToken = this.generateConfirmationToken(reservation.id);
      const confirmationUrl = `${process.env.FRONTEND_URL}/confirm-reservation/${confirmationToken}`;

      if (!reservation.user?.email) {
        this.logger.warn(`No email found for reservation ${reservation.id}`);
        continue;
      }

      await this.mailService.sendReservationConfirmation(
        reservation.user.email,
        {
          firstName: reservation.user.firstName || 'Student',
          instructorName: `${reservation.instructor?.firstName || ''} ${reservation.instructor?.lastName || ''}`.trim() || 'Instructor',
          startTime: moment(reservation.startTime).format('HH:mm'),
          sector: reservation.sector || 'Nespecificat',
          confirmationUrl
        }
      );

      this.logger.log(`Notification sent to ${reservation.user.email} for reservation ${reservation.id}`);
    }
  }

  private generateConfirmationToken(reservationId: number): string {
    // In a real application, you should use a proper token generation/verification system
    // This is a simplified version for demonstration
    return Buffer.from(`${reservationId}-${Date.now()}`).toString('base64');
  }

  // Add a method to confirm a reservation
  async confirmReservation(reservationId: number) {
    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { isConfirmed: true }
    });

    return updated;
  }

  // ─── In-app notification panel ────────────────────────────────────────────

  async create(
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      },
    });

    this.wsService.emitNotification(userId, notification);

    return notification;
  }

  async findAllForUser(userId: number, page: number = 1, limit: number = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException(`Notificarea cu id=${id} nu a fost găsită`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  // Manual ADMIN/MANAGER-triggered notification for a document ready for pickup.
  async notifyDocumentReady(userId: number, message?: string) {
    return this.create(
      userId,
      NotificationType.EXAM_DOCUMENT,
      'Document disponibil',
      message || 'Documentul tău este gata pentru ridicare.',
    );
  }

  // ─── Lesson-12+ booking reminders (2.5-2.7) ────────────────────────────────
  // No "lesson completed" event exists in this app - lessons become "past"
  // purely by startTime elapsing (same proxy instructor-ratings already uses),
  // so this runs once a day rather than firing the instant a lesson ends.
  //
  // Capped at LESSON_REMINDER_MAX_PER_RUN per run: on first deploy, everyone
  // who already qualifies would otherwise be notified in one batch. Students
  // are processed in a stable (id ascending) order, and the "unread reminder
  // already exists" skip below means already-notified students are excluded
  // on the next run - so the backlog drains a batch at a time across several
  // days instead of firing all at once, with no extra state to track.

  @Cron('0 12 * * *', { timeZone: 'Europe/Chisinau' })
  async sendLessonReminders() {
    const now = new Date();

    const students = await this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    let sentCount = 0;

    for (const student of students) {
      if (sentCount >= LESSON_REMINDER_MAX_PER_RUN) break;

      const completedCount = await this.prisma.reservation.count({
        where: { userId: student.id, isCancelled: false, deletedAt: null, startTime: { lt: now } },
      });
      if (completedCount < LESSON_REMINDER_START_AT) continue;

      const futureBookedCount = await this.prisma.reservation.count({
        where: { userId: student.id, isCancelled: false, deletedAt: null, startTime: { gte: now } },
      });
      if (futureBookedCount >= LESSON_REMINDER_TARGET_BOOKED) continue;

      const hasUnreadReminder = await this.prisma.notification.findFirst({
        where: { userId: student.id, type: NotificationType.LESSON_REMINDER, isRead: false },
      });
      if (hasUnreadReminder) continue;

      await this.create(
        student.id,
        NotificationType.LESSON_REMINDER,
        'Programează-ți următoarele lecții',
        `Ai finalizat ${completedCount} lecții. Mai programează ${LESSON_REMINDER_TARGET_BOOKED - futureBookedCount} lecții pentru a continua.`,
        { completedCount, futureBookedCount },
      );
      sentCount++;
    }
  }
}
