import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingStatsQueryDto } from './dto/rating-stats-query.dto';

@Injectable()
export class InstructorRatingsService {
  constructor(private prisma: PrismaService) {}

  // ─── Submit rating (student) ─────────────────────────────────────────────

  async submitRating(userId: number, dto: SubmitRatingDto) {
    const { reservationId, rating, comment } = dto;

    // Reservation must exist and belong to this student
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, userId, deletedAt: null },
    });
    if (!reservation) {
      throw new NotFoundException(`Rezervarea cu id=${reservationId} nu a fost găsită`);
    }

    // Reservation must have an instructor assigned
    if (!reservation.instructorId) {
      throw new BadRequestException('Rezervarea nu are instructor asignat');
    }

    // Reservation must be in the past (startTime < now)
    if (new Date(reservation.startTime) > new Date()) {
      throw new BadRequestException('Nu poți acorda rating pentru o lecție care nu a avut loc încă');
    }

    // One rating per reservation
    const existing = await this.prisma.instructorRating.findUnique({
      where: { reservationId },
    });
    if (existing) {
      throw new ConflictException('Ai acordat deja un rating pentru această lecție');
    }

    return this.prisma.instructorRating.create({
      data: {
        userId,
        instructorId: reservation.instructorId,
        reservationId,
        rating,
        comment: comment ?? null,
      },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true } },
        reservation: { select: { id: true, startTime: true } },
      },
    });
  }

  // ─── Check pending ratings (student) ──────────────────────────────────────
  // Returns past confirmed reservations that do not yet have a rating.

  async getPendingRatings(userId: number) {
    const now = new Date();
    const reservations = await this.prisma.reservation.findMany({
      where: {
        userId,
        deletedAt: null,
        isCancelled: false,
        instructorId: { not: null },
        startTime: { lt: now },
        rating: null,
      },
      select: {
        id: true,
        startTime: true,
        instructorId: true,
        instructor: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'desc' },
    });
    return reservations;
  }

  // ─── My ratings history (student) ─────────────────────────────────────────

  async getMyRatings(userId: number) {
    return this.prisma.instructorRating.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true } },
        reservation: { select: { id: true, startTime: true } },
      },
    });
  }

  // ─── All ratings for one reservation (student/admin) ──────────────────────

  async getRatingForReservation(reservationId: number) {
    return this.prisma.instructorRating.findUnique({
      where: { reservationId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        instructor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Monthly stats (Admin/Manager) ────────────────────────────────────────

  async getMonthlyStats(query: RatingStatsQueryDto) {
    const { instructorId, year, month } = query;

    const whereBase: any = {};
    if (instructorId) whereBase.instructorId = instructorId;

    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      whereBase.createdAt = { gte: start, lt: end };
    } else if (year) {
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      whereBase.createdAt = { gte: start, lt: end };
    }

    const ratings = await this.prisma.instructorRating.findMany({
      where: whereBase,
      select: {
        instructorId: true,
        rating: true,
        createdAt: true,
        instructor: { select: { id: true, firstName: true, lastName: true, sector: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by instructor → then by year-month
    const map = new Map<number, {
      instructor: any;
      months: Map<string, { count: number; sum: number }>;
    }>();

    for (const r of ratings) {
      if (!map.has(r.instructorId)) {
        map.set(r.instructorId, { instructor: r.instructor, months: new Map() });
      }
      const entry = map.get(r.instructorId)!;
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!entry.months.has(key)) entry.months.set(key, { count: 0, sum: 0 });
      const m = entry.months.get(key)!;
      m.count++;
      m.sum += r.rating;
    }

    return Array.from(map.values()).map(({ instructor, months }) => ({
      instructor,
      monthlyStats: Array.from(months.entries())
        .map(([month, { count, sum }]) => ({
          month,
          count,
          average: Math.round((sum / count) * 100) / 100,
        }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    }));
  }

  // ─── Annual stats (Admin/Manager) ─────────────────────────────────────────

  async getAnnualStats(query: RatingStatsQueryDto) {
    const { instructorId } = query;

    const whereBase: any = {};
    if (instructorId) whereBase.instructorId = instructorId;

    const ratings = await this.prisma.instructorRating.findMany({
      where: whereBase,
      select: {
        instructorId: true,
        rating: true,
        createdAt: true,
        instructor: { select: { id: true, firstName: true, lastName: true, sector: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const map = new Map<number, {
      instructor: any;
      years: Map<number, { count: number; sum: number }>;
    }>();

    for (const r of ratings) {
      if (!map.has(r.instructorId)) {
        map.set(r.instructorId, { instructor: r.instructor, years: new Map() });
      }
      const entry = map.get(r.instructorId)!;
      const yr = new Date(r.createdAt).getFullYear();
      if (!entry.years.has(yr)) entry.years.set(yr, { count: 0, sum: 0 });
      const y = entry.years.get(yr)!;
      y.count++;
      y.sum += r.rating;
    }

    return Array.from(map.values()).map(({ instructor, years }) => ({
      instructor,
      annualStats: Array.from(years.entries())
        .map(([year, { count, sum }]) => ({
          year,
          count,
          average: Math.round((sum / count) * 100) / 100,
        }))
        .sort((a, b) => a.year - b.year),
    }));
  }

  // ─── Aggregate overview (Admin/Manager) ────────────────────────────────────

  async getOverview(query: RatingStatsQueryDto) {
    const { instructorId, year, month } = query;

    const whereBase: any = {};
    if (instructorId) whereBase.instructorId = instructorId;
    if (year && month) {
      whereBase.createdAt = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    } else if (year) {
      whereBase.createdAt = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }

    const [ratings, instructors] = await Promise.all([
      this.prisma.instructorRating.groupBy({
        by: ['instructorId'],
        where: whereBase,
        _avg: { rating: true },
        _count: { rating: true },
        _min: { rating: true },
        _max: { rating: true },
      }),
      this.prisma.instructor.findMany({
        where: instructorId ? { id: instructorId } : {},
        select: { id: true, firstName: true, lastName: true, sector: true },
      }),
    ]);

    const instructorMap = new Map(instructors.map((i) => [i.id, i]));

    return ratings.map((r) => ({
      instructor: instructorMap.get(r.instructorId) ?? { id: r.instructorId },
      totalRatings: r._count.rating,
      average: Math.round((r._avg.rating ?? 0) * 100) / 100,
      min: r._min.rating,
      max: r._max.rating,
    })).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  }

  // ─── Individual ratings list (Admin/Manager) ───────────────────────────────

  async getAllRatings(query: RatingStatsQueryDto) {
    const { instructorId, year, month, rating } = query;
    const where: any = {};
    if (instructorId) where.instructorId = instructorId;
    if (rating) where.rating = rating;
    if (year && month) {
      where.createdAt = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
    } else if (year) {
      where.createdAt = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }

    return this.prisma.instructorRating.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, sector: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        reservation: { select: { id: true, startTime: true } },
      },
    });
  }

  // ─── Delete rating (Admin only) ───────────────────────────────────────────

  async deleteRating(ratingId: number) {
    const existing = await this.prisma.instructorRating.findUnique({
      where: { id: ratingId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Ratingul cu id=${ratingId} nu a fost găsit`);
    }

    await this.prisma.instructorRating.delete({
      where: { id: ratingId },
    });

    return { ok: true, id: ratingId };
  }

  async updateRating(ratingId: number, dto: UpdateRatingDto) {
    const existing = await this.prisma.instructorRating.findUnique({
      where: { id: ratingId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Ratingul cu id=${ratingId} nu a fost găsit`);
    }

    const comment =
      dto.comment === undefined
        ? undefined
        : String(dto.comment || '').trim() || null;

    return this.prisma.instructorRating.update({
      where: { id: ratingId },
      data: {
        rating: dto.rating,
        ...(dto.comment !== undefined ? { comment } : {}),
      },
      include: {
        instructor: { select: { id: true, firstName: true, lastName: true, sector: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        reservation: { select: { id: true, startTime: true } },
      },
    });
  }
}
