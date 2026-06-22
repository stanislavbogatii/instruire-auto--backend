import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePracticalExamSlotDto } from './dto/create-practical-exam-slot.dto';
import { UpdatePracticalExamSlotDto } from './dto/update-practical-exam-slot.dto';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import {
  UpdateReservationStatusDto,
  PracticalExamReservationStatus,
} from './dto/update-reservation-status.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { BookForStudentDto } from './dto/book-for-student.dto';
import { User } from '@prisma/client';

/** Final statuses — no more changes possible after these */
const FINAL_STATUSES: PracticalExamReservationStatus[] = [
  PracticalExamReservationStatus.PASSED,
  PracticalExamReservationStatus.FAILED,
  PracticalExamReservationStatus.ABSENT,
  PracticalExamReservationStatus.CANCELLED,
];

const RESERVATION_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
};

const SLOT_INCLUDE = {
  instructor: true,
  reservations: {
    orderBy: { positionInCar: 'asc' as const },
    include: { user: { select: RESERVATION_USER_SELECT } },
  },
};

@Injectable()
export class PracticalExamSlotsService {
  constructor(private prisma: PrismaService) {}

  // ─── Slot CRUD ─────────────────────────────────────────────────────────

  async create(dto: CreatePracticalExamSlotDto) {
    const { date, instructorId, ...rest } = dto;
    return this.prisma.practicalExamSlot.create({
      data: {
        ...rest,
        date: new Date(date),
        ...(instructorId ? { instructor: { connect: { id: instructorId } } } : {}),
      },
      include: SLOT_INCLUDE,
    });
  }

  async findAll() {
    return this.prisma.practicalExamSlot.findMany({
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: SLOT_INCLUDE,
    });
  }

  async findOne(id: number) {
    const slot = await this.prisma.practicalExamSlot.findUnique({
      where: { id },
      include: SLOT_INCLUDE,
    });
    if (!slot) throw new NotFoundException(`PracticalExamSlot with id=${id} not found`);
    return slot;
  }

  async update(id: number, dto: UpdatePracticalExamSlotDto) {
    await this.findOne(id);
    const { date, instructorId, ...rest } = dto;
    return this.prisma.practicalExamSlot.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
        ...(instructorId !== undefined
          ? instructorId === null
            ? { instructor: { disconnect: true } }
            : { instructor: { connect: { id: instructorId } } }
          : {}),
      },
      include: SLOT_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.practicalExamSlot.delete({ where: { id } });
  }

  // ─── Weekly schedule generation ────────────────────────────────────────

  async generateFromSchedule(dto: GenerateSlotsDto) {
    const { daysOfWeek, times, sector, gearbox, capacity, instructorId, startDate, endDate } = dto;

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    if (end < start) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const slotsToCreate: {
      date: Date;
      time: string;
      sector: string;
      gearbox: string;
      capacity: number;
      isActive: boolean;
      instructorId: number | null;
    }[] = [];

    const cursor = new Date(start);
    while (cursor <= end) {
      if (daysOfWeek.includes(cursor.getUTCDay())) {
        for (const time of times) {
          slotsToCreate.push({
            date: new Date(cursor),
            time,
            sector,
            gearbox,
            capacity,
            isActive: true,
            instructorId: instructorId ?? null,
          });
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (slotsToCreate.length === 0) return { created: 0 };

    await this.prisma.practicalExamSlot.createMany({ data: slotsToCreate });
    return { created: slotsToCreate.length };
  }

  // ─── Shared booking validation ─────────────────────────────────────────

  private async assertCanBook(userId: number) {
    // Block if student already passed the practical exam
    const passed = await this.prisma.practicalExamSlotReservation.findFirst({
      where: { userId, status: PracticalExamReservationStatus.PASSED },
    });
    if (passed) {
      throw new ConflictException(
        'Examenul practic este deja promovat; nu poți crea o programare nouă',
      );
    }

    // Task 10: only one SCHEDULED reservation allowed
    const scheduled = await this.prisma.practicalExamSlotReservation.findFirst({
      where: { userId, status: PracticalExamReservationStatus.SCHEDULED },
    });
    if (scheduled) {
      throw new ConflictException('You already have an active practical exam reservation');
    }

    // Task 11: last reservation must have a final result
    const lastReservation = await this.prisma.practicalExamSlotReservation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (lastReservation && !FINAL_STATUSES.includes(lastReservation.status as PracticalExamReservationStatus)) {
      throw new ConflictException('Your last practical exam reservation does not have a final result yet');
    }

    // Extra: no ongoing theoretical exam
    const pendingExam = await this.prisma.exam.findFirst({
      where: { userId, status: 'IN_PROGRESS' },
    });
    if (pendingExam) {
      throw new ConflictException('You have a theoretical exam in progress without a final result');
    }
  }

  // ─── Available slots for student (Task 7) ─────────────────────────────

  async findAvailableForStudent(student: User) {
    if (!student.canBookPracticalExam) {
      throw new ForbiddenException('You are not allowed to book a practical exam');
    }

    await this.assertCanBook(student.id);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const slots = await this.prisma.practicalExamSlot.findMany({
      where: { isActive: true, date: { gte: today } },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: {
        instructor: true,
        reservations: {
          where: { status: PracticalExamReservationStatus.SCHEDULED },
          select: { positionInCar: true },
        },
      },
    });

    return slots.map((slot) => ({
        ...slot,
        bookedCount: slot.reservations.length,
        availableSpots: Math.max(0, slot.capacity - slot.reservations.length),
      }));
  }

  // ─── Book a slot (Tasks 8, 10, 11) ────────────────────────────────────

  async bookSlot(student: User, slotId: number, color?: string) {
    if (!student.canBookPracticalExam) {
      throw new ForbiddenException('You are not allowed to book a practical exam');
    }

    await this.assertCanBook(student.id);

    const slot = await this.prisma.practicalExamSlot.findUnique({
      where: { id: slotId },
      include: {
        reservations: {
          where: { status: PracticalExamReservationStatus.SCHEDULED },
          orderBy: { positionInCar: 'asc' },
        },
      },
    });
    if (!slot) throw new NotFoundException(`Slot with id=${slotId} not found`);
    if (!slot.isActive) throw new BadRequestException('This slot is not active');

    const activeCount = slot.reservations.length;
    if (activeCount >= slot.capacity) {
      throw new ConflictException('This slot is fully booked');
    }

    return this.prisma.practicalExamSlotReservation.create({
      data: {
        slotId,
        userId: student.id,
        positionInCar: activeCount + 1,
        color: color ?? '',
        status: PracticalExamReservationStatus.SCHEDULED,
      },
      include: {
        slot: { include: { instructor: true } },
        user: { select: RESERVATION_USER_SELECT },
      },
    });
  }

  // ─── Admin/Manager: book on behalf of a student ─────────────────────────

  async bookSlotForStudent(slotId: number, studentId: number, color?: string) {
    // Verify student exists
    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`User with id=${studentId} not found`);

    await this.assertCanBook(studentId);

    const slot = await this.prisma.practicalExamSlot.findUnique({
      where: { id: slotId },
      include: {
        reservations: {
          where: { status: PracticalExamReservationStatus.SCHEDULED },
          orderBy: { positionInCar: 'asc' },
        },
      },
    });
    if (!slot) throw new NotFoundException(`Slot with id=${slotId} not found`);
    if (!slot.isActive) throw new BadRequestException('This slot is not active');

    const activeCount = slot.reservations.length;
    if (activeCount >= slot.capacity) {
      throw new ConflictException('This slot is fully booked');
    }

    return this.prisma.practicalExamSlotReservation.create({
      data: {
        slotId,
        userId: studentId,
        positionInCar: activeCount + 1,
        color: color ?? '',
        status: PracticalExamReservationStatus.SCHEDULED,
      },
      include: {
        slot: { include: { instructor: true } },
        user: { select: RESERVATION_USER_SELECT },
      },
    });
  }

  // ─── Delete a reservation (Admin/Manager) ──────────────────────────────

  async deleteReservation(reservationId: number) {
    const reservation = await this.prisma.practicalExamSlotReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new NotFoundException(`Reservation with id=${reservationId} not found`);

    return this.prisma.practicalExamSlotReservation.delete({ where: { id: reservationId } });
  }

  // ─── Update reservation status (Admin/Manager) ─────────────────────────

  async updateReservationStatus(
    actor: User,
    reservationId: number,
    dto: UpdateReservationStatusDto,
  ) {
    const reservation = await this.prisma.practicalExamSlotReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) throw new NotFoundException(`Reservation with id=${reservationId} not found`);

    const currentStatus = reservation.status as PracticalExamReservationStatus;

    if (FINAL_STATUSES.includes(currentStatus)) {
      throw new BadRequestException(`Reservation already has a final status: ${currentStatus}`);
    }

    // Students can only cancel their own SCHEDULED reservation
    const isPrivileged = actor.role === 'ADMIN' || actor.role === 'MANAGER';
    if (!isPrivileged) {
      if (reservation.userId !== actor.id) {
        throw new ForbiddenException('Not allowed to update this reservation');
      }
      if (dto.status !== PracticalExamReservationStatus.CANCELLED) {
        throw new ForbiddenException('Students can only cancel their own reservation');
      }
    }

    return this.prisma.practicalExamSlotReservation.update({
      where: { id: reservationId },
      data: { status: dto.status },
      include: {
        slot: { include: { instructor: true } },
        user: { select: RESERVATION_USER_SELECT },
      },
    });
  }

  // ─── List reservations for a slot ordered by positionInCar ────────────

  async getSlotReservations(slotId: number) {
    await this.findOne(slotId);
    return this.prisma.practicalExamSlotReservation.findMany({
      where: { slotId },
      orderBy: { positionInCar: 'asc' },
      include: { user: { select: RESERVATION_USER_SELECT } },
    });
  }

  // ─── Student: my active reservation ───────────────────────────────────

  async getMyReservation(userId: number) {
    return this.prisma.practicalExamSlotReservation.findFirst({
      where: { userId, status: PracticalExamReservationStatus.SCHEDULED },
      include: { slot: { include: { instructor: true } } },
    });
  }

  // ─── Student: cancel own active reservation ───────────────────────────

  async cancelMyReservation(userId: number) {
    const reservation = await this.prisma.practicalExamSlotReservation.findFirst({
      where: { userId, status: PracticalExamReservationStatus.SCHEDULED },
    });
    if (!reservation) throw new NotFoundException('No active reservation found');

    return this.prisma.practicalExamSlotReservation.update({
      where: { id: reservation.id },
      data: { status: PracticalExamReservationStatus.CANCELLED },
      include: {
        slot: { include: { instructor: true } },
        user: { select: RESERVATION_USER_SELECT },
      },
    });
  }

  // ─── Student: exam history ─────────────────────────────────────────────

  async getMyHistory(userId: number) {
    return this.prisma.practicalExamSlotReservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        slot: {
          select: {
            date: true,
            time: true,
            sector: true,
            gearbox: true,
            instructor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  // ─── Admin/Manager: list reservations with filters ──────────────────────────

  async listReservations(filters: ListReservationsDto) {
    const { date, dateFrom, dateTo, instructorId, sector, gearbox, status } = filters;

    const dateFilter: { gte?: Date; lte?: Date; equals?: Date } = {};
    if (date) {
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      dateFilter.gte = d;
      dateFilter.lte = next;
    } else {
      if (dateFrom) {
        const d = new Date(dateFrom);
        d.setUTCHours(0, 0, 0, 0);
        dateFilter.gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = d;
      }
    }

    return this.prisma.practicalExamSlotReservation.findMany({
      where: {
        ...(status ? { status } : {}),
        slot: {
          ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
          ...(instructorId ? { instructorId } : {}),
          ...(sector ? { sector } : {}),
          ...(gearbox ? { gearbox } : {}),
        },
      },
      orderBy: [{ slot: { date: 'asc' } }, { slot: { time: 'asc' } }, { positionInCar: 'asc' }],
      include: {
        user: { select: RESERVATION_USER_SELECT },
        slot: { include: { instructor: true } },
      },
    });
  }
}
