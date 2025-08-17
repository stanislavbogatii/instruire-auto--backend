import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Cron } from '@nestjs/schedule';
import * as moment from 'moment-timezone';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Run every day at 11:00 AM Chisinau time
  @Cron('0 11 * * *', {
    timeZone: 'Europe/Chisinau'
  })
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
}
