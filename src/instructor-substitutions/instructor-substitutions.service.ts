import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInstructorSubstitutionDto } from './dto/create-instructor-substitution.dto';
import { UpdateInstructorSubstitutionDto } from './dto/update-instructor-substitution.dto';
import { ListInstructorSubstitutionsDto } from './dto/list-instructor-substitutions.dto';

const INSTRUCTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  sector: true,
  color: true,
  instructorType: true,
};

@Injectable()
export class InstructorSubstitutionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────

  /** Normalize a Date to UTC midnight (date-only comparison) */
  private toUTCDate(dateStr: string): Date {
    const d = new Date(dateStr);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private dayRange(date: Date): { gte: Date; lt: Date } {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start, lt: end };
  }

  private getInstructorDisplayName(
    instructor?: { firstName?: string | null; lastName?: string | null } | null,
  ): string {
    const full = `${instructor?.firstName ?? ''} ${instructor?.lastName ?? ''}`.trim();
    return full || 'Instructor';
  }

  /** A substitute can cover at most one base instructor per day. */
  private async assertSubstituteAvailableOnDate(
    substituteInstructorId: number,
    date: Date,
    excludeId?: number,
  ) {
    const existing = await this.prisma.instructorSubstitution.findFirst({
      where: {
        substituteInstructorId,
        date: this.dayRange(date),
        isActive: true,
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
      include: { baseInstructor: { select: INSTRUCTOR_SELECT } },
    });

    if (!existing) return;

    const baseName = this.getInstructorDisplayName(existing.baseInstructor);
    throw new ConflictException(
      `Instructorul de schimb inlocuieste deja pe ${baseName} in ziua ${date.toISOString().slice(0, 10)}`,
    );
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async create(dto: CreateInstructorSubstitutionDto) {
    const { baseInstructorId, substituteInstructorId, date } = dto;

    // Validate both instructors exist
    const [base, substitute] = await Promise.all([
      this.prisma.instructor.findUnique({ where: { id: baseInstructorId } }),
      this.prisma.instructor.findUnique({ where: { id: substituteInstructorId } }),
    ]);

    if (!base) throw new NotFoundException(`Instructorul de bază cu id=${baseInstructorId} nu există`);
    if (!substitute) throw new NotFoundException(`Instructorul de schimb cu id=${substituteInstructorId} nu există`);

    // Validate substitute has type SCHIMB
    if (substitute.instructorType !== 'SCHIMB') {
      throw new BadRequestException(
        `Instructorul cu id=${substituteInstructorId} nu are tipul SCHIMB (tipul curent: ${substitute.instructorType})`,
      );
    }

    // Validate date is present
    const normalizedDate = this.toUTCDate(date);

    // Check for existing substitution for this base instructor on this day
    const existing = await this.prisma.instructorSubstitution.findFirst({
      where: {
        baseInstructorId,
        date: this.dayRange(normalizedDate),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Există deja o înlocuire pentru instructorul cu id=${baseInstructorId} în ziua ${date}`,
      );
    }

    await this.assertSubstituteAvailableOnDate(
      substituteInstructorId,
      normalizedDate,
    );

    return this.prisma.instructorSubstitution.create({
      data: {
        baseInstructorId,
        substituteInstructorId,
        date: normalizedDate,
        isActive: true,
      },
      include: {
        baseInstructor: { select: INSTRUCTOR_SELECT },
        substituteInstructor: { select: INSTRUCTOR_SELECT },
      },
    });
  }

  async findAll(filters: ListInstructorSubstitutionsDto) {
    const { date, dateFrom, dateTo, baseInstructorId, substituteInstructorId, isActive } = filters;

    const dateFilter: any = {};
    if (date) {
      const r = this.dayRange(this.toUTCDate(date));
      dateFilter.gte = r.gte;
      dateFilter.lt = r.lt;
    } else {
      if (dateFrom) {
        dateFilter.gte = this.toUTCDate(dateFrom);
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = d;
      }
    }

    return this.prisma.instructorSubstitution.findMany({
      where: {
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        ...(baseInstructorId !== undefined ? { baseInstructorId } : {}),
        ...(substituteInstructorId !== undefined ? { substituteInstructorId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      orderBy: [{ date: 'asc' }, { baseInstructorId: 'asc' }],
      include: {
        baseInstructor: { select: INSTRUCTOR_SELECT },
        substituteInstructor: { select: INSTRUCTOR_SELECT },
      },
    });
  }

  async findOne(id: number) {
    const sub = await this.prisma.instructorSubstitution.findUnique({
      where: { id },
      include: {
        baseInstructor: { select: INSTRUCTOR_SELECT },
        substituteInstructor: { select: INSTRUCTOR_SELECT },
      },
    });
    if (!sub) throw new NotFoundException(`Înlocuire cu id=${id} nu a fost găsită`);
    return sub;
  }

  async update(id: number, dto: UpdateInstructorSubstitutionDto) {
    const current = await this.findOne(id);

    // If changing the substitute, validate SCHIMB type
    if (dto.substituteInstructorId !== undefined) {
      const substitute = await this.prisma.instructor.findUnique({
        where: { id: dto.substituteInstructorId },
      });
      if (!substitute) {
        throw new NotFoundException(`Instructorul de schimb cu id=${dto.substituteInstructorId} nu există`);
      }
      if (substitute.instructorType !== 'SCHIMB') {
        throw new BadRequestException(
          `Instructorul cu id=${dto.substituteInstructorId} nu are tipul SCHIMB (tipul curent: ${substitute.instructorType})`,
        );
      }
    }

    const nextSubstituteId =
      dto.substituteInstructorId !== undefined
        ? dto.substituteInstructorId
        : current.substituteInstructorId;
    const nextDate =
      dto.date !== undefined ? this.toUTCDate(dto.date) : new Date(current.date);
    const willBeActive =
      dto.isActive !== undefined ? dto.isActive : current.isActive;

    if (willBeActive) {
      await this.assertSubstituteAvailableOnDate(nextSubstituteId, nextDate, id);
    }

    return this.prisma.instructorSubstitution.update({
      where: { id },
      data: {
        ...(dto.substituteInstructorId !== undefined ? { substituteInstructorId: dto.substituteInstructorId } : {}),
        ...(dto.date !== undefined ? { date: this.toUTCDate(dto.date) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        baseInstructor: { select: INSTRUCTOR_SELECT },
        substituteInstructor: { select: INSTRUCTOR_SELECT },
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.instructorSubstitution.delete({ where: { id } });
  }

  // ─── Substitution resolution (used by ReservationsService) ──────────────

  /**
   * Returns the active substitution for a base instructor on a specific date,
   * or null if none exists.
   */
  async getActiveSubstitution(baseInstructorId: number, date: Date) {
    const range = this.dayRange(date);
    return this.prisma.instructorSubstitution.findFirst({
      where: { baseInstructorId, date: range, isActive: true },
      include: { substituteInstructor: { select: INSTRUCTOR_SELECT } },
    });
  }

  /**
   * Returns all active substitutions whose date falls within a given range.
   * Used to bulk-enrich calendar data without N+1 queries.
   */
  async getActiveSubstitutionsForDateRange(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    return this.prisma.instructorSubstitution.findMany({
      where: { date: { gte: start, lte: end }, isActive: true },
      include: {
        baseInstructor: { select: INSTRUCTOR_SELECT },
        substituteInstructor: { select: INSTRUCTOR_SELECT },
      },
    });
  }

  /**
   * Enriches a list of reservations with effectiveInstructor.
   * If a reservation's instructor is substituted on its day, effectiveInstructor = substitute.
   * Otherwise effectiveInstructor = the original instructor.
   *
   * Also used to find which reservations a substitute "inherits" for a given day.
   */
  enrichReservations(
    reservations: any[],
    substitutions: Awaited<ReturnType<InstructorSubstitutionsService['getActiveSubstitutionsForDateRange']>>,
  ) {
    return reservations.map((r) => {
      const rDate = new Date(r.startTime);
      rDate.setUTCHours(0, 0, 0, 0);

      const sub = substitutions.find(
        (s) =>
          s.baseInstructorId === r.instructorId &&
          new Date(s.date).toISOString().slice(0, 10) === rDate.toISOString().slice(0, 10),
      );

      return {
        ...r,
        effectiveInstructor: sub ? sub.substituteInstructor : r.instructor ?? null,
        substitution: sub
          ? { id: sub.id, substituteInstructorId: sub.substituteInstructorId }
          : null,
      };
    });
  }
}
