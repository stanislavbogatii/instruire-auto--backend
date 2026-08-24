import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationsDto } from './dto/create-reservations.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { HistoryService } from './history.service';
import { Car, Instructor, InstructorsGroup, Prisma, Reservation } from '@prisma/client';
import { BusyReservationResponse } from './dto/ busy-reservation.dto';
import { InstructorSubstitutionsService } from 'src/instructor-substitutions/instructor-substitutions.service';
import {
  MANDATORY_POLIGON_LESSONS,
  POLIGON_SECTOR,
  isPoligonRequiredSector,
  normalizeSector,
} from 'src/common/constants/sectors';
import {
  AutoAssignReservationsDto,
  InstructorAssignmentMode,
} from './dto/auto-assign-reservations.dto';

/**
 * Un instructor de tip SCHIMB nu are coloana proprie in calendar: apare doar ca
 * overlay peste coloana instructorului pe care il acopera intr-o zi anume. O
 * rezervare atribuita direct unui astfel de instructor nu are nicio celula in
 * care sa fie desenata si dispare din grafic, deci nu poate fi ales automat.
 */
const ASSIGNABLE_INSTRUCTOR_WHERE: Prisma.InstructorWhereInput = {
  instructorType: { not: 'SCHIMB' },
};

type ReservationConflict = {
  index: number;
  startTime: string;
  instructorId: number | null;
  sector: string;
  message: string;
  reservation: CreateReservationsDto['reservations'][number];
};

type PendingReservationCreate = {
  item: CreateReservationsDto['reservations'][number];
  instructorId: number;
  startTime: Date;
  sector: string;
  instructorsGroupId: number | null;
};

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private historyService: HistoryService,
    private substitutionsService: InstructorSubstitutionsService,
  ) {}
  private readonly dailySlots = [
    '07:00',
    '08:30',
    '10:00',
    '11:30',
    '13:30',
    '15:00',
    '16:30',
    '18:00',
    '19:30',
  ];

  async createReservationsForUser(
    userId: number,
    dto: CreateReservationsDto,
    createdBy?: number,
    ignoreInstructorBlackouts = false,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Staff booking from the calendar targets one explicit instructor cell, so the
    // mandatory-poligon reassignment must not silently move the lesson elsewhere.
    return this.createReservations(
      userId,
      dto,
      createdBy,
      ignoreInstructorBlackouts,
      true,
    );
  }

  async assignReservationsForUser(
    userId: number,
    dto: AutoAssignReservationsDto,
    createdBy?: number,
    ignoreInstructorBlackouts = false,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.assignReservations(userId, dto, createdBy, ignoreInstructorBlackouts);
  }

  async createReservations(
    userId: number,
    dto: CreateReservationsDto,
    createdBy?: number,
    ignoreInstructorBlackouts = false,
    respectRequestedInstructor = false,
  ): Promise<Reservation[]> {
    let created: Array<Reservation> = [];
    const instructorId = dto.instructorId;
    const instructorsGroupId = dto.instructorsGroupId;
    const reservations = dto.reservations || [];

    if (instructorsGroupId) {
      created = await this.prisma.$transaction(async (tx) => {
        const instructorsGroup = await tx.instructorsGroup.findUnique({
          where: { id: instructorsGroupId },
          select: { sector: true },
        });

        const isCiocanaGroup = isPoligonRequiredSector(instructorsGroup?.sector);

        if (isCiocanaGroup) {
          if (reservations.length === 0) return [];

          const destinationSector = instructorsGroup?.sector || '';

          // Sectors requiring the mandatory poligon lessons use a dedicated Botanica/destination split logic.
          const groupInstructors = await tx.instructor.findMany({
            where: {
              isActive: true,
              instructorsGroupId,
              ...ASSIGNABLE_INSTRUCTOR_WHERE,
            },
          });

          if (!groupInstructors.length) {
            throw new NotFoundException("Instructors in this group not found");
          }

          const botanicaInstructor = groupInstructors.find(
            instructor => normalizeSector(instructor.sector) === normalizeSector(POLIGON_SECTOR)
          );

          if (!botanicaInstructor) {
            throw new NotFoundException("Botanica instructor in this group not found");
          }

          const ciocanaInstructors = groupInstructors.filter(
            instructor => normalizeSector(instructor.sector) === normalizeSector(destinationSector)
          );

          const botanicaReservationsCount = await tx.reservation.count({
            where: {
              userId,
              sector: POLIGON_SECTOR,
              deletedAt: null,
            },
          });

          const botanicaSlotsToFill = Math.max(0, MANDATORY_POLIGON_LESSONS - botanicaReservationsCount);
          const botanicaAssignmentsCount = Math.min(botanicaSlotsToFill, reservations.length);
          const hasCiocanaAssignments = reservations.length > botanicaAssignmentsCount;

          if (hasCiocanaAssignments && !ciocanaInstructors.length) {
            throw new NotFoundException(`${destinationSector} instructors in this group not found`);
          }

          const requestedStartTimes = reservations.map(item => new Date(item.startTime));
          const occupiedSlots = await this.buildOccupiedSlots(
            tx,
            groupInstructors.map(instructor => instructor.id),
            requestedStartTimes,
            ignoreInstructorBlackouts,
          );
          const plannedSlots = new Set<string>();
          const plannedReservations: PendingReservationCreate[] = [];
          const reservationErrors: ReservationConflict[] = [];
          let ciocanaInstructorIndex = 0;

          for (const [index, item] of reservations.entries()) {
            const startTime = new Date(item.startTime);

            if (index < botanicaAssignmentsCount) {
              const slotKey = this.buildReservationSlotKey(botanicaInstructor.id, startTime);

              if (occupiedSlots.has(slotKey) || plannedSlots.has(slotKey)) {
                reservationErrors.push(
                  this.buildReservationConflict(
                    index,
                    item,
                    `Botanica instructor ${botanicaInstructor.id} is already reserved at: ${startTime.toISOString()}`,
                    botanicaInstructor.id,
                    'Botanica'
                  )
                );
                continue;
              }

              plannedSlots.add(slotKey);
              plannedReservations.push({
                item,
                instructorId: botanicaInstructor.id,
                startTime,
                sector: 'Botanica',
                instructorsGroupId,
              });
              continue;
            }

            let assignedCiocanaInstructor: Instructor | null = null;
            let assignedSlotKey = '';
            let tries = 0;

            while (!assignedCiocanaInstructor && tries < ciocanaInstructors.length) {
              const currentInstructor = ciocanaInstructors[ciocanaInstructorIndex % ciocanaInstructors.length];
              const slotKey = this.buildReservationSlotKey(currentInstructor.id, startTime);

              if (!occupiedSlots.has(slotKey) && !plannedSlots.has(slotKey)) {
                assignedCiocanaInstructor = currentInstructor;
                assignedSlotKey = slotKey;
              } else {
                ciocanaInstructorIndex++;
                tries++;
              }
            }

            if (!assignedCiocanaInstructor) {
              reservationErrors.push(
                this.buildReservationConflict(
                  index,
                  item,
                  `No available ${destinationSector} instructor at ${startTime.toISOString()}`,
                  null,
                  destinationSector
                )
              );
              continue;
            }

            plannedSlots.add(assignedSlotKey);
            plannedReservations.push({
              item,
              instructorId: assignedCiocanaInstructor.id,
              startTime,
              sector: destinationSector,
              instructorsGroupId,
            });
            ciocanaInstructorIndex++;
          }

          if (reservationErrors.length > 0) {
            this.throwReservationConflicts(reservationErrors);
          }

          return Promise.all(
            plannedReservations.map(plannedReservation =>
              tx.reservation.create({
                data: {
                  userId,
                  instructorId: plannedReservation.instructorId,
                  startTime: plannedReservation.startTime,
                  sector: plannedReservation.sector,
                  gearbox: plannedReservation.item.gearbox || '',
                  privateMessage: plannedReservation.item.privateMessage || '',
                  color: plannedReservation.item.color || '',
                  instructorsGroupId: plannedReservation.instructorsGroupId,
                  isFavorite: plannedReservation.item.isFavorite || false,
                  isImportant: plannedReservation.item.isImportant || false,
                },
                include: this.getReservationCreateInclude(),
              })
            )
          );
        }

        const instructors = await tx.instructor.findMany({
          where: {
            isActive: true,
            instructorsGroupId,
            ...ASSIGNABLE_INSTRUCTOR_WHERE,
          },
        });

        if (!instructors.length) {
          throw new NotFoundException("Instructors in this group not found");
        }

        if (reservations.length === 0) return [];

        const requestedStartTimes = reservations.map(item => new Date(item.startTime));
        const occupiedSlots = await this.buildOccupiedSlots(
          tx,
          instructors.map(instructor => instructor.id),
          requestedStartTimes,
          ignoreInstructorBlackouts,
        );
        const plannedSlots = new Set<string>();
        const plannedReservations: PendingReservationCreate[] = [];
        const reservationErrors: ReservationConflict[] = [];
        let instructorIndex = 0;

        for (const [index, item] of reservations.entries()) {
          const startTime = new Date(item.startTime);

          let assignedInstructor: Instructor | null = null;
          let assignedSlotKey = '';
          let tries = 0;

          while (!assignedInstructor && tries < instructors.length) {
            const currentInstructor = instructors[instructorIndex % instructors.length];
            const slotKey = this.buildReservationSlotKey(currentInstructor.id, startTime);

            if (!occupiedSlots.has(slotKey) && !plannedSlots.has(slotKey)) {
              assignedInstructor = currentInstructor;
              assignedSlotKey = slotKey;
            } else {
              instructorIndex++;
              tries++;
            }
          }

          if (!assignedInstructor) {
            reservationErrors.push(
              this.buildReservationConflict(
                index,
                item,
                `No available instructor at ${startTime.toISOString()}`
              )
            );
            continue;
          }

          plannedSlots.add(assignedSlotKey);
          plannedReservations.push({
            item,
            instructorId: assignedInstructor.id,
            startTime,
            sector: item.sector || '',
            instructorsGroupId,
          });
          instructorIndex++;
        }

        if (reservationErrors.length > 0) {
          this.throwReservationConflicts(reservationErrors);
        }

        return Promise.all(
          plannedReservations.map(plannedReservation =>
            tx.reservation.create({
              data: {
                userId,
                instructorId: plannedReservation.instructorId,
                startTime: plannedReservation.startTime,
                sector: plannedReservation.sector,
                gearbox: plannedReservation.item.gearbox || '',
                privateMessage: plannedReservation.item.privateMessage || '',
                color: plannedReservation.item.color || '',
                instructorsGroupId: plannedReservation.instructorsGroupId,
                isFavorite: plannedReservation.item.isFavorite || false,
                isImportant: plannedReservation.item.isImportant || false,
              },
              include: this.getReservationCreateInclude(),
            })
          )
        );
      });
    } else if (instructorId) {
      created = await this.prisma.$transaction(async (tx) => {
        const instructor = await tx.instructor.findFirst({
          where: { id: instructorId },
        });
        if (!instructor) throw new NotFoundException("Instructor not found");

        if (reservations.length === 0) return [];

        const startTimes = reservations.map(r => new Date(r.startTime));
        const N = Math.min(MANDATORY_POLIGON_LESSONS, reservations.length);

        const allCiocana = reservations.every(r => isPoligonRequiredSector(r.sector));

        // The first lessons of a brand-new student are redirected to a poligon
        // instructor. This must never happen when the caller picked an explicit
        // instructor (staff booking a specific calendar cell).
        const applyMandatoryPoligon =
          !respectRequestedInstructor &&
          allCiocana &&
          N > 0 &&
          (await tx.reservation.count({ where: { userId, deletedAt: null } })) === 0;

        let botanicaInstructor: Instructor | null = null;
        const reservationErrors: ReservationConflict[] = [];
        let botanicaUnavailableForBatch = false;

        if (applyMandatoryPoligon) {
          botanicaInstructor = await tx.instructor.findFirst({
            where: {
              sector: POLIGON_SECTOR,
              isActive: true,
              ...ASSIGNABLE_INSTRUCTOR_WHERE,
              reservations: {
                none: {
                  startTime: { in: startTimes.slice(0, N) },
                  deletedAt: null,
                },
              },
            },
          });

          if (!botanicaInstructor) {
            botanicaUnavailableForBatch = true;

            for (let index = 0; index < N; index++) {
              const item = reservations[index];
              reservationErrors.push(
                this.buildReservationConflict(
                  index,
                  item,
                  `No available Botanica instructor for ${new Date(item.startTime).toISOString()}`,
                  null,
                  'Botanica'
                )
              );
            }
          }
        }

        const relevantInstructorIds = botanicaInstructor
          ? [instructorId, botanicaInstructor.id]
          : [instructorId];

        const occupiedSlots = await this.buildOccupiedSlots(
          tx,
          relevantInstructorIds,
          startTimes,
          ignoreInstructorBlackouts,
        );
        const plannedSlots = new Set<string>();
        const plannedReservations: PendingReservationCreate[] = [];

        for (const [index, item] of reservations.entries()) {
          const startTime = new Date(item.startTime);

          if (botanicaUnavailableForBatch && index < N) {
            continue;
          }

          let usedInstructorId = instructorId;
          let usedSector = item.sector || '';
          let conflictMessage = `Instructor ${instructorId} is already reserved at: ${startTime.toISOString()}`;

          if (botanicaInstructor && !botanicaUnavailableForBatch && index < N) {
            usedInstructorId = botanicaInstructor.id;
            usedSector = 'Botanica';
            conflictMessage = `Botanica instructor ${botanicaInstructor.id} is already reserved at: ${startTime.toISOString()}`;
          }

          const slotKey = this.buildReservationSlotKey(usedInstructorId, startTime);
          if (occupiedSlots.has(slotKey) || plannedSlots.has(slotKey)) {
            reservationErrors.push(
              this.buildReservationConflict(
                index,
                item,
                conflictMessage,
                usedInstructorId,
                usedSector
              )
            );
            continue;
          }

          plannedSlots.add(slotKey);
          plannedReservations.push({
            item,
            instructorId: usedInstructorId,
            startTime,
            sector: usedSector,
            instructorsGroupId: null,
          });
        }

        if (reservationErrors.length > 0) {
          this.throwReservationConflicts(reservationErrors);
        }

        return Promise.all(
          plannedReservations.map(plannedReservation =>
            tx.reservation.create({
              data: {
                userId,
                instructorId: plannedReservation.instructorId,
                startTime: plannedReservation.startTime,
                sector: plannedReservation.sector,
                gearbox: plannedReservation.item.gearbox || '',
                privateMessage: plannedReservation.item.privateMessage || '',
                color: plannedReservation.item.color || '',
                instructorsGroupId: plannedReservation.instructorsGroupId,
                isFavorite: plannedReservation.item.isFavorite || false,
                isImportant: plannedReservation.item.isImportant || false,
              },
              include: this.getReservationCreateInclude(),
            })
          )
        );
      });
    }

    for (const reservation of created) {
      try {
        await this.historyService.createHistoryRecord(
          reservation.id,
          'CREATE' as any,
          reservation,
          createdBy ?? userId
        );
      } catch (error) {
        console.warn('Failed to create history record:', error?.message ?? error);
      }
    }

    return created;
  }

  private buildReservationSlotKey(instructorId: number, startTime: Date): string {
    // Normalize to minute precision so blackout/reservation ISO variants still collide.
    const iso = startTime.toISOString();
    const normalized = `${iso.slice(0, 16)}:00.000Z`;
    return `${instructorId}:${normalized}`;
  }

  private normalizeSlotInstants(startTimes: Date[]): Date[] {
    return startTimes.map((value) => {
      const d = new Date(value);
      d.setUTCSeconds(0, 0);
      return d;
    });
  }

  /**
   * Admin/Manager booking on a blocked slot: remove the blackout first,
   * then create the reservation in the freed slot.
   */
  private async clearSingleBlackoutsForSlots(
    tx: Prisma.TransactionClient,
    instructorIds: number[],
    startTimes: Date[],
  ): Promise<number> {
    if (instructorIds.length === 0 || startTimes.length === 0) return 0;

    const timesMs = startTimes
      .map((value) => new Date(value).getTime())
      .filter((ms) => Number.isFinite(ms));
    if (!timesMs.length) return 0;

    const minMs = Math.min(...timesMs) - 24 * 60 * 60 * 1000;
    const maxMs = Math.max(...timesMs) + 24 * 60 * 60 * 1000;

    const wantedKeys = new Set<string>();
    for (const instructorId of instructorIds) {
      for (const startTime of startTimes) {
        wantedKeys.add(this.buildReservationSlotKey(instructorId, startTime));
      }
    }

    const candidates = await tx.instructorBlackout.findMany({
      where: {
        instructorId: { in: instructorIds },
        dateTime: {
          gte: new Date(minMs),
          lte: new Date(maxMs),
        },
      },
      select: { id: true, instructorId: true, dateTime: true },
    });

    const idsToDelete = candidates
      .filter((row) =>
        wantedKeys.has(
          this.buildReservationSlotKey(row.instructorId, row.dateTime),
        ),
      )
      .map((row) => row.id);

    if (!idsToDelete.length) return 0;

    const result = await tx.instructorBlackout.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    return result.count;
  }

  /**
   * Builds the set of "instructorId:startTime" keys that are unavailable for booking,
   * combining existing (non-deleted) reservations with instructor blackouts.
   */
  private async buildOccupiedSlots(
    tx: Prisma.TransactionClient,
    instructorIds: number[],
    startTimes: Date[],
    ignoreInstructorBlackouts = false,
  ): Promise<Set<string>> {
    if (instructorIds.length === 0 || startTimes.length === 0) return new Set();

    if (ignoreInstructorBlackouts) {
      await this.clearSingleBlackoutsForSlots(tx, instructorIds, startTimes);
    }

    const normalizedStartTimes = this.normalizeSlotInstants(startTimes);

    const [existingReservations, blackouts] = await Promise.all([
      tx.reservation.findMany({
        where: {
          instructorId: { in: instructorIds },
          startTime: { in: startTimes },
          deletedAt: null,
        },
        select: { instructorId: true, startTime: true },
      }),
      ignoreInstructorBlackouts
        ? Promise.resolve([])
        : tx.instructorBlackout.findMany({
            where: {
              instructorId: { in: instructorIds },
              OR: [
                { dateTime: { in: startTimes } },
                { dateTime: { in: normalizedStartTimes } },
              ],
            },
            select: { instructorId: true, dateTime: true },
          }),
    ]);

    const occupiedSlots = new Set<string>();
    for (const reservation of existingReservations) {
      if (reservation.instructorId !== null) {
        occupiedSlots.add(this.buildReservationSlotKey(reservation.instructorId, reservation.startTime));
      }
    }
    for (const blackout of blackouts) {
      occupiedSlots.add(this.buildReservationSlotKey(blackout.instructorId, blackout.dateTime));
    }
    return occupiedSlots;
  }

  /** Picks the eligible instructor with the fewest upcoming reservations. */
  private async pickLeastBusyInstructor(
    tx: Prisma.TransactionClient,
    instructors: Instructor[],
  ): Promise<Instructor> {
    if (instructors.length === 1) return instructors[0];

    const counts = await Promise.all(
      instructors.map(instructor =>
        tx.reservation.count({
          where: { instructorId: instructor.id, deletedAt: null, startTime: { gte: new Date() } },
        }),
      ),
    );

    let best = instructors[0];
    let bestCount = counts[0];
    for (let i = 1; i < instructors.length; i++) {
      if (counts[i] < bestCount) {
        bestCount = counts[i];
        best = instructors[i];
      }
    }
    return best;
  }

  /**
   * SINGLE mode: stick to an instructor the student already has lessons with
   * (in this eligible pool). Fall back to least-busy on first booking.
   */
  private async pickStickyOrLeastBusyInstructor(
    tx: Prisma.TransactionClient,
    userId: number,
    instructors: Instructor[],
  ): Promise<Instructor> {
    if (instructors.length === 0) {
      throw new NotFoundException('No eligible instructors in pool');
    }
    if (instructors.length === 1) return instructors[0];

    const poolIds = instructors.map(instructor => instructor.id);
    const existing = await tx.reservation.findMany({
      where: {
        userId,
        deletedAt: null,
        instructorId: { in: poolIds },
      },
      select: { instructorId: true, startTime: true },
      orderBy: { startTime: 'desc' },
    });

    if (existing.length > 0) {
      const counts = new Map<number, number>();
      for (const row of existing) {
        if (row.instructorId == null) continue;
        counts.set(row.instructorId, (counts.get(row.instructorId) || 0) + 1);
      }

      // Prefer the instructor with the most prior lessons in this pool;
      // tie-break by most recent appearance in `existing` (already newest-first).
      let bestId = existing.find(row => row.instructorId != null)?.instructorId ?? null;
      let bestCount = bestId != null ? counts.get(bestId) || 0 : -1;
      for (const [instructorId, count] of counts.entries()) {
        if (count > bestCount) {
          bestCount = count;
          bestId = instructorId;
        }
      }

      const sticky = instructors.find(instructor => instructor.id === bestId);
      if (sticky) return sticky;
    }

    return this.pickLeastBusyInstructor(tx, instructors);
  }

  /**
   * Among candidates (sticky first, then rest by least upcoming load), pick the
   * one free for every requested slot. If none cover all, keep sticky/least-busy.
   */
  private async pickSingleInstructorForSlots(
    tx: Prisma.TransactionClient,
    userId: number,
    instructors: Instructor[],
    startTimes: Date[],
    occupiedSlots: Set<string>,
  ): Promise<Instructor> {
    const preferred = await this.pickStickyOrLeastBusyInstructor(tx, userId, instructors);

    const isFreeForAll = (instructor: Instructor) =>
      startTimes.every(startTime => {
        const key = this.buildReservationSlotKey(instructor.id, startTime);
        return !occupiedSlots.has(key);
      });

    if (isFreeForAll(preferred)) return preferred;

    const others = instructors.filter(instructor => instructor.id !== preferred.id);
    if (others.length === 0) return preferred;

    const counts = await Promise.all(
      others.map(instructor =>
        tx.reservation.count({
          where: { instructorId: instructor.id, deletedAt: null, startTime: { gte: new Date() } },
        }),
      ),
    );
    const ranked = others
      .map((instructor, index) => ({ instructor, count: counts[index] }))
      .sort((a, b) => a.count - b.count)
      .map(entry => entry.instructor);

    for (const candidate of ranked) {
      if (isFreeForAll(candidate)) return candidate;
    }

    // No one covers every slot — keep sticky so retries stay on the same person.
    return preferred;
  }

  private buildReservationConflict(
    index: number,
    reservation: CreateReservationsDto['reservations'][number],
    message: string,
    instructorId: number | null = null,
    sector?: string,
  ): ReservationConflict {
    return {
      index,
      startTime: new Date(reservation.startTime).toISOString(),
      instructorId,
      sector: sector || reservation.sector || '',
      message,
      reservation,
    };
  }

  private throwReservationConflicts(reservationErrors: ReservationConflict[]): never {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Some reservations could not be created',
      reservationErrors,
    });
  }

  private getReservationCreateInclude() {
    return {
      instructor: true,
      instructorsGroup: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    };
  }

  /**
   * Finds active instructors matching a sector + gearbox pair.
   */
  private async findEligibleInstructors(sector: string, gearbox: string): Promise<Instructor[]> {
    return this.prisma.instructor.findMany({
      where: {
        isActive: true,
        sector,
        cars: { some: { gearbox } },
        ...ASSIGNABLE_INSTRUCTOR_WHERE,
      },
    });
  }

  /**
   * Identifies the instructors eligible for a student's selected sector + gearbox.
   * For sectors requiring the mandatory poligon lessons (Ciocana, Buiucani), also
   * returns the eligible Botanica instructor pool used for the first lessons.
   */
  async getEligibleInstructors(sector: string, gearbox: string) {
    const requiresPoligon = isPoligonRequiredSector(sector);

    const [sectorInstructors, poligonInstructors] = await Promise.all([
      this.findEligibleInstructors(sector, gearbox),
      requiresPoligon ? this.findEligibleInstructors(POLIGON_SECTOR, gearbox) : Promise.resolve([]),
    ]);

    return {
      sector,
      gearbox,
      requiresPoligon,
      poligonSector: requiresPoligon ? POLIGON_SECTOR : null,
      mandatoryPoligonLessons: requiresPoligon ? MANDATORY_POLIGON_LESSONS : 0,
      sectorInstructors,
      poligonInstructors,
    };
  }

  /**
   * Generates availability for a student's selected sector + gearbox, based
   * exclusively on eligible instructors, respecting existing reservations and
   * instructor blackouts. Returns, per day/time slot, how many eligible
   * instructors are free (split between the poligon pool and the destination
   * sector pool when applicable).
   *
   * When instructorMode=SINGLE, only the sticky/preferred instructor (per pool)
   * is counted — matching what auto-assign SINGLE will use for this user.
   */
  async getAvailability(
    sector: string,
    gearbox: string,
    startDate?: string,
    endDate?: string,
    instructorMode: InstructorAssignmentMode = InstructorAssignmentMode.MULTIPLE,
    userId?: number,
  ) {
    const today = new Date();
    const start = startDate ? new Date(startDate) : new Date(today);
    // Always expand to full calendar days so morning slots (e.g. 07:00) are not
    // dropped when the client sends a mid-day startDate ISO.
    start.setUTCHours(0, 0, 0, 0);
    const defaultEnd = new Date(start);
    defaultEnd.setUTCMonth(defaultEnd.getUTCMonth() + 3);
    const end = endDate ? new Date(endDate) : defaultEnd;
    end.setUTCHours(23, 59, 59, 999);

    const { requiresPoligon, sectorInstructors, poligonInstructors } = await this.getEligibleInstructors(
      sector,
      gearbox,
    );

    const mode = instructorMode || InstructorAssignmentMode.MULTIPLE;
    const singleMode = mode === InstructorAssignmentMode.SINGLE;

    let sectorPool = sectorInstructors;
    let poligonPool = poligonInstructors;
    let singleSectorInstructor: Instructor | null = null;
    let singlePoligonInstructor: Instructor | null = null;

    // Sector + poligon pools follow instructorMode (SINGLE = sticky one).
    if (singleMode && userId && sectorInstructors.length > 0) {
      singleSectorInstructor = await this.pickStickyOrLeastBusyInstructor(
        this.prisma,
        userId,
        sectorInstructors,
      );
      sectorPool = [singleSectorInstructor];
    }
    if (singleMode && userId && requiresPoligon && poligonInstructors.length > 0) {
      singlePoligonInstructor = await this.pickStickyOrLeastBusyInstructor(
        this.prisma,
        userId,
        poligonInstructors,
      );
      poligonPool = [singlePoligonInstructor];
    }

    const allInstructors = requiresPoligon ? [...poligonPool, ...sectorPool] : sectorPool;

    if (allInstructors.length === 0) {
      return {
        sector,
        gearbox,
        requiresPoligon,
        poligonSector: requiresPoligon ? POLIGON_SECTOR : null,
        instructorMode: mode,
        singleSectorInstructor: null,
        singlePoligonInstructor: null,
        days: [],
      };
    }

    const instructorIds = allInstructors.map(instructor => instructor.id);
    const poligonIds = new Set(poligonPool.map(instructor => instructor.id));
    const sectorIds = new Set(sectorPool.map(instructor => instructor.id));

    const [reservations, blackouts] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { instructorId: { in: instructorIds }, startTime: { gte: start, lte: end }, deletedAt: null },
        select: { instructorId: true, startTime: true },
      }),
      this.prisma.instructorBlackout.findMany({
        where: { instructorId: { in: instructorIds }, dateTime: { gte: start, lte: end } },
        select: { instructorId: true, dateTime: true },
      }),
    ]);

    const busySlots = new Set<string>();
    for (const reservation of reservations) {
      if (reservation.instructorId !== null) {
        busySlots.add(this.buildReservationSlotKey(reservation.instructorId, reservation.startTime));
      }
    }
    for (const blackout of blackouts) {
      busySlots.add(this.buildReservationSlotKey(blackout.instructorId, blackout.dateTime));
    }

    const now = new Date();
    const days: { date: string; slots: { time: string; poligonFreeInstructors: number; sectorFreeInstructors: number }[] }[] = [];

    const cursor = new Date(start);
    // cursor is already UTC midnight from start normalization above

    while (cursor <= end) {
      const slots: { time: string; poligonFreeInstructors: number; sectorFreeInstructors: number }[] = [];

      for (const time of this.dailySlots) {
        const [hours, minutes] = time.split(':').map(Number);
        const slotDate = new Date(cursor);
        slotDate.setUTCHours(hours, minutes, 0, 0);

        if (slotDate < now) continue;

        let poligonFree = 0;
        let sectorFree = 0;
        for (const instructor of allInstructors) {
          const slotKey = this.buildReservationSlotKey(instructor.id, slotDate);
          if (busySlots.has(slotKey)) continue;
          if (poligonIds.has(instructor.id)) poligonFree++;
          if (sectorIds.has(instructor.id)) sectorFree++;
        }

        slots.push({
          time,
          poligonFreeInstructors: requiresPoligon ? poligonFree : 0,
          sectorFreeInstructors: sectorFree,
        });
      }

      if (slots.length > 0) {
        days.push({ date: cursor.toISOString().slice(0, 10), slots });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const summarizeInstructor = (instructor: Instructor | null) =>
      instructor
        ? {
            id: instructor.id,
            firstName: instructor.firstName,
            lastName: instructor.lastName,
            sector: instructor.sector,
          }
        : null;

    return {
      sector,
      gearbox,
      requiresPoligon,
      poligonSector: requiresPoligon ? POLIGON_SECTOR : null,
      instructorMode: mode,
      singleSectorInstructor: summarizeInstructor(singleSectorInstructor),
      singlePoligonInstructor: summarizeInstructor(singlePoligonInstructor),
      days,
    };
  }

  /**
   * Automatically assigns eligible instructors to a batch of lesson start times based
   * on the student's selected sector, gearbox and instructor mode (single vs multiple).
   * Sectors requiring the mandatory poligon lessons (Ciocana, Buiucani) always route the
   * first lessons to eligible Botanica instructors first.
   */
  async assignReservations(
    userId: number,
    dto: AutoAssignReservationsDto,
    createdBy?: number,
    ignoreInstructorBlackouts = false,
  ): Promise<Reservation[]> {
    const { sector, gearbox, instructorMode } = dto;
    const startTimeDates = (dto.startTimes || []).map(startTime => new Date(startTime));

    if (startTimeDates.length === 0) return [];

    const requiresPoligon = isPoligonRequiredSector(sector);

    const created = await this.prisma.$transaction(async (tx) => {
      const sectorInstructors = await tx.instructor.findMany({
        where: {
          isActive: true,
          sector,
          cars: { some: { gearbox } },
          ...ASSIGNABLE_INSTRUCTOR_WHERE,
        },
      });

      if (sectorInstructors.length === 0) {
        throw new NotFoundException(`No eligible instructor found for sector ${sector} and gearbox ${gearbox}`);
      }

      const poligonInstructors = requiresPoligon
        ? await tx.instructor.findMany({
            where: {
              isActive: true,
              sector: POLIGON_SECTOR,
              cars: { some: { gearbox } },
              ...ASSIGNABLE_INSTRUCTOR_WHERE,
            },
          })
        : [];

      if (requiresPoligon && poligonInstructors.length === 0) {
        throw new NotFoundException(`No eligible ${POLIGON_SECTOR} instructor found for gearbox ${gearbox}`);
      }

      const poligonReservationsCount = requiresPoligon
        ? await tx.reservation.count({ where: { userId, sector: POLIGON_SECTOR, deletedAt: null } })
        : 0;

      const poligonSlotsRemaining = requiresPoligon
        ? Math.max(0, MANDATORY_POLIGON_LESSONS - poligonReservationsCount)
        : 0;
      const poligonAssignmentsCount = Math.min(poligonSlotsRemaining, startTimeDates.length);

      const allInstructorIds = [
        ...new Set([...poligonInstructors.map(i => i.id), ...sectorInstructors.map(i => i.id)]),
      ];
      const occupiedSlots = await this.buildOccupiedSlots(
        tx,
        allInstructorIds,
        startTimeDates,
        ignoreInstructorBlackouts,
      );
      const plannedSlots = new Set<string>();
      const plannedReservations: PendingReservationCreate[] = [];
      const reservationErrors: ReservationConflict[] = [];

      const singlePoligonInstructor =
        instructorMode === InstructorAssignmentMode.SINGLE &&
        requiresPoligon &&
        poligonAssignmentsCount > 0
          ? await this.pickSingleInstructorForSlots(
              tx,
              userId,
              poligonInstructors,
              startTimeDates.slice(0, poligonAssignmentsCount),
              occupiedSlots,
            )
          : null;
      const singleSectorInstructor =
        instructorMode === InstructorAssignmentMode.SINGLE
          ? await this.pickSingleInstructorForSlots(
              tx,
              userId,
              sectorInstructors,
              startTimeDates.slice(poligonAssignmentsCount),
              occupiedSlots,
            )
          : null;

      let poligonRoundRobinIndex = 0;
      let sectorRoundRobinIndex = 0;

      for (const [index, startTime] of startTimeDates.entries()) {
        const isPoligonLesson = index < poligonAssignmentsCount;
        const pool = isPoligonLesson ? poligonInstructors : sectorInstructors;
        const targetSector = isPoligonLesson ? POLIGON_SECTOR : sector;

        let assigned: Instructor | null = null;

        if (instructorMode === InstructorAssignmentMode.SINGLE) {
          const fixedInstructor = isPoligonLesson
            ? singlePoligonInstructor
            : singleSectorInstructor;
          if (fixedInstructor) {
            const slotKey = this.buildReservationSlotKey(fixedInstructor.id, startTime);
            if (!occupiedSlots.has(slotKey) && !plannedSlots.has(slotKey)) {
              assigned = fixedInstructor;
            }
          }
        } else {
          let tries = 0;
          let idx = isPoligonLesson ? poligonRoundRobinIndex : sectorRoundRobinIndex;

          while (!assigned && tries < pool.length) {
            const candidate = pool[idx % pool.length];
            const slotKey = this.buildReservationSlotKey(candidate.id, startTime);
            if (!occupiedSlots.has(slotKey) && !plannedSlots.has(slotKey)) {
              assigned = candidate;
            } else {
              idx++;
              tries++;
            }
          }

          if (isPoligonLesson) poligonRoundRobinIndex = idx + 1;
          else sectorRoundRobinIndex = idx + 1;
        }

        if (!assigned) {
          const fixedId =
            instructorMode === InstructorAssignmentMode.SINGLE
              ? (isPoligonLesson ? singlePoligonInstructor?.id : singleSectorInstructor?.id) ?? null
              : null;
          reservationErrors.push({
            index,
            startTime: startTime.toISOString(),
            instructorId: fixedId,
            sector: targetSector,
            message:
              fixedId
                ? `Instructor ${fixedId} is not available at ${startTime.toISOString()}`
                : `No available ${targetSector} instructor at ${startTime.toISOString()}`,
            reservation: {
              startTime: startTime.toISOString(),
              sector: targetSector,
              gearbox,
              privateMessage: dto.privateMessage,
              color: dto.color,
            } as CreateReservationsDto['reservations'][number],
          });
          continue;
        }

        const slotKey = this.buildReservationSlotKey(assigned.id, startTime);
        plannedSlots.add(slotKey);
        plannedReservations.push({
          item: {
            startTime: startTime.toISOString(),
            sector: targetSector,
            gearbox,
            privateMessage: dto.privateMessage,
            color: dto.color,
          } as CreateReservationsDto['reservations'][number],
          instructorId: assigned.id,
          startTime,
          sector: targetSector,
          instructorsGroupId: null,
        });
      }

      if (reservationErrors.length > 0) {
        this.throwReservationConflicts(reservationErrors);
      }

      return Promise.all(
        plannedReservations.map(plannedReservation =>
          tx.reservation.create({
            data: {
              userId,
              instructorId: plannedReservation.instructorId,
              startTime: plannedReservation.startTime,
              sector: plannedReservation.sector,
              gearbox: plannedReservation.item.gearbox || '',
              privateMessage: plannedReservation.item.privateMessage || '',
              color: plannedReservation.item.color || '',
              instructorsGroupId: null,
              isFavorite: false,
              // Student self-booking (auto-assign): important by default.
              isImportant: dto.isImportant ?? true,
            },
            include: this.getReservationCreateInclude(),
          }),
        ),
      );
    });

    for (const reservation of created) {
      try {
        await this.historyService.createHistoryRecord(reservation.id, 'CREATE' as any, reservation, createdBy ?? userId);
      } catch (error) {
        console.warn('Failed to create history record:', error?.message ?? error);
      }
    }

    return created;
  }

  async getUserReservations(userId: number) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { startTime: 'asc' },
      include: {
        instructor: {
          select: { id: true, phone: true, firstName: true, lastName: true },
        },
      },
    });
    if (!reservations.length) return reservations;
    const dates = reservations.map((r) => new Date(r.startTime));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const substitutions = await this.substitutionsService.getActiveSubstitutionsForDateRange(minDate, maxDate);
    return this.substitutionsService.enrichReservations(reservations, substitutions);
  }

  /**
   * Returns true if the user is an INSTRUCTOR with instructorType = SUPERIOR.
   * Used by the controller to block update/delete for SUPERIOR instructors.
   */
  async isInstructorSuperior(userId: number): Promise<boolean> {
    const instructor = await this.prisma.instructor.findUnique({
      where: { userId },
      select: { instructorType: true },
    });
    return instructor?.instructorType === 'SUPERIOR';
  }

  async findAll() {
    return await this.prisma.reservation.findMany({
      where: { deletedAt: null },
      include: {
        instructor: {
          select: {
            phone: true,
            firstName: true,
            lastName: true
          }
        },
        user: {
          select: {
            phone: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  async findByFilters(filters: FilterReservationsDto) {
    const where: any = {};

    // Apply filters
    if (filters.userId !== undefined) {
      where.userId = filters.userId;
    }

    if (filters.instructorId !== undefined) {
      where.instructorId = filters.instructorId;
    }

    if (filters.instructorsGroupId !== undefined) {
      where.instructorsGroupId = filters.instructorsGroupId;
    }

    if (filters.carId !== undefined) {
      where.carId = filters.carId;
    }

    if (filters.sector !== undefined) {
      where.sector = { contains: filters.sector };
    }

    if (filters.gearbox !== undefined) {
      where.gearbox = { contains: filters.gearbox };
    }

    if (filters.color !== undefined) {
      where.color = filters.color;
    }

    if (filters.isConfirmed !== undefined) {
      where.isConfirmed = filters.isConfirmed;
    }

    if (filters.isCancelled !== undefined) {
      where.isCancelled = filters.isCancelled;
    }

    if (filters.isFavorite !== undefined) {
      where.isFavorite = filters.isFavorite;
    }

    if (filters.isImportant !== undefined) {
      where.isImportant = filters.isImportant;
    }

    // Date range filters
    if (filters.startDateFrom || filters.startDateTo) {
      where.startTime = {};
      if (filters.startDateFrom) {
        where.startTime.gte = new Date(filters.startDateFrom);
      }
      if (filters.startDateTo) {
        where.startTime.lte = new Date(filters.startDateTo);
      }
    }

    // Sorting
    const sortBy = filters.sortBy || 'startTime';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = { [sortBy]: sortOrder };

    // Pagination
    const limit = filters.limit || 100;
    const skip = filters.skip || 0;

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { ...where, deletedAt: null },
        include: {
          instructor: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              sector: true,
              color: true
            }
          },
          user: {
            select: {
              id: true,
              phone: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          car: {
            select: {
              id: true,
              plateNumber: true,
              gearbox: true
            }
          },
          instructorsGroup: {
            select: {
              id: true,
              name: true,
              sector: true
            }
          }
        },
        orderBy,
        take: limit,
        skip
      }),
      this.prisma.reservation.count({ where: { ...where, deletedAt: null } })
    ]);

    // Enrich with effective instructor (substitution logic)
    let enrichedData: any[] = reservations;
    if (reservations.length > 0) {
      const dates = reservations.map((r) => new Date(r.startTime));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      const substitutions = await this.substitutionsService.getActiveSubstitutionsForDateRange(minDate, maxDate);
      enrichedData = this.substitutionsService.enrichReservations(reservations, substitutions);
    }

    return {
      data: enrichedData,
      total,
      limit,
      skip,
      hasMore: skip + reservations.length < total
    };
  }

  async update(id: number, dto: UpdateReservationDto, changedBy?: number) {
    const oldReservation = await this.prisma.reservation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!oldReservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        instructorId: dto.instructorId,
        sector: dto.sector,
        gearbox: dto.gearbox,
        privateMessage: dto.privateMessage,
        color: dto.color,
        isCancelled: dto.isCancelled,
        isFavorite: dto.isFavorite,
        isImportant: dto.isImportant,
      },
      include: {
        instructor: true,
        car: true
      }
    });

    // Create history record for the update
    try {
      await this.historyService.createHistoryRecord(
        id,
        'UPDATE' as any, // We'll fix this enum issue later
        updatedReservation,
        changedBy,
        oldReservation
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    return updatedReservation;
  }


  async delete(id: number, changedBy?: number) {
    const reservation = await this.prisma.reservation.findUnique({ 
      where: { id, deletedAt: null } 
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with id=${id} not found`);
    }

    // Soft delete: set deletedAt timestamp
    const deletedReservation = await this.prisma.reservation.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        instructor: true,
        car: true,
        user: true
      }
    });

    // Create history record for the deletion
    try {
      await this.historyService.createHistoryRecord(
        id,
        'DELETE' as any,
        deletedReservation,
        changedBy,
        reservation
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    return deletedReservation;
  }

  /**
   * Soft-deletes all non-deleted reservations for a student account.
   * Intended for ADMIN/MANAGER cleanup from the student profile.
   */
  async deleteAllForUser(userId: number, changedBy?: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const reservations = await this.prisma.reservation.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });

    if (reservations.length === 0) {
      return { deletedCount: 0, ids: [] as number[] };
    }

    const ids = reservations.map((reservation) => reservation.id);
    const deletedAt = new Date();

    await this.prisma.reservation.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt },
    });

    for (const id of ids) {
      try {
        const deletedReservation = await this.prisma.reservation.findUnique({
          where: { id },
          include: { instructor: true, car: true, user: true },
        });
        if (deletedReservation) {
          await this.historyService.createHistoryRecord(
            id,
            'DELETE' as any,
            deletedReservation,
            changedBy,
            deletedReservation,
          );
        }
      } catch (error) {
        console.warn('Failed to create history record:', error?.message ?? error);
      }
    }

    return { deletedCount: ids.length, ids };
  }

  async restoreReservation(id: number, changedBy?: number) {
    const reservation = await this.prisma.reservation.findUnique({ 
      where: { id } 
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with id=${id} not found`);
    }
    if (!reservation.deletedAt) {
      throw new BadRequestException(`Reservation with id=${id} is not deleted`);
    }

    // Restore: clear deletedAt timestamp
    const restoredReservation = await this.prisma.reservation.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        instructor: true,
        car: true,
        user: true
      }
    });

    // Create history record for the restoration
    try {
      await this.historyService.createHistoryRecord(
        id,
        'RESTORE' as any,
        restoredReservation,
        changedBy,
        reservation
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    return restoredReservation;
  }

  async confirmReservation(id: number, changedBy?: number) {
    const oldReservation = await this.prisma.reservation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!oldReservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: { isConfirmed: true },
      include: {
        instructor: true,
        car: true,
        user: true
      }
    });

    // Create history record for the confirmation
    try {
      await this.historyService.createHistoryRecord(
        id,
        'CONFIRM' as any,
        updatedReservation,
        changedBy,
        oldReservation
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    return updatedReservation;
  }

  async unconfirmReservation(id: number, changedBy?: number) {
    const oldReservation = await this.prisma.reservation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!oldReservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: { isConfirmed: false },
      include: {
        instructor: true,
        car: true,
        user: true
      }
    });

    // Create history record for the unconfirmation
    try {
      await this.historyService.createHistoryRecord(
        id,
        'UNCONFIRM' as any,
        updatedReservation,
        changedBy,
        oldReservation
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    return updatedReservation;
  }

  async cancelReservation(id: number, changedBy?: number) {
    const oldReservation = await this.prisma.reservation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!oldReservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: { isCancelled: true },
      include: {
        instructor: true,
        car: true,
        user: true
      }
    });

    // Create history record for the cancellation
    try {
      await this.historyService.createHistoryRecord(
        id,
        'UPDATE' as any,
        updatedReservation,
        changedBy,
        oldReservation
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    return updatedReservation;
  }

  async uncancelReservation(id: number, changedBy?: number) {
    const oldReservation = await this.prisma.reservation.findFirst({
      where: { id, deletedAt: null },
    });
    if (!oldReservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: { isCancelled: false },
      include: {
        instructor: true,
        car: true,
        user: true
      }
    });

    // Create history record for the uncancellation
    try {
      await this.historyService.createHistoryRecord(
        id,
        'UPDATE' as any,
        updatedReservation,
        changedBy,
        oldReservation
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    return updatedReservation;
  }

  async getReservationsByUserId(userId: number) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId, deletedAt: null },
      include: {
        instructor: { select: { id: true, phone: true, firstName: true, lastName: true } },
        car: { select: { id: true, plateNumber: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!reservations.length) return reservations;
    const dates = reservations.map((r) => new Date(r.startTime));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const substitutions = await this.substitutionsService.getActiveSubstitutionsForDateRange(minDate, maxDate);
    return this.substitutionsService.enrichReservations(reservations, substitutions);
  }

  async getReservationsByInstructorId(instructorId: number) {
    // Fetch own reservations
    const ownReservations = await this.prisma.reservation.findMany({
      where: { instructorId, deletedAt: null },
      include: {
        instructor: { select: { id: true, phone: true, firstName: true, lastName: true } },
        car: { select: { id: true, plateNumber: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    // Fetch reservations of base instructors that this instructor is substituting
    const substitutionsAsSubstitute = await this.prisma.instructorSubstitution.findMany({
      where: { substituteInstructorId: instructorId, isActive: true },
      include: { substituteInstructor: { select: { id: true, phone: true, firstName: true, lastName: true } } },
    });

    let inheritedReservations: any[] = [];
    if (substitutionsAsSubstitute.length > 0) {
      for (const sub of substitutionsAsSubstitute) {
        const dayStart = new Date(sub.date);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        const dayReservations = await this.prisma.reservation.findMany({
          where: {
            instructorId: sub.baseInstructorId,
            startTime: { gte: dayStart, lt: dayEnd },
            deletedAt: null,
          },
          include: {
            instructor: { select: { id: true, phone: true, firstName: true, lastName: true } },
            car: { select: { id: true, plateNumber: true } },
            user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
          },
        });
        inheritedReservations = inheritedReservations.concat(
          dayReservations.map((r) => ({
            ...r,
            effectiveInstructor: sub.substituteInstructor,
            substitution: { id: sub.id, baseInstructorId: sub.baseInstructorId },
          })),
        );
      }
    }

    // Determine date range of own reservations for bulk substitution lookup
    let enrichedOwn: any[] = ownReservations;
    if (ownReservations.length > 0) {
      const dates = ownReservations.map((r) => new Date(r.startTime));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      const substitutions = await this.substitutionsService.getActiveSubstitutionsForDateRange(minDate, maxDate);
      enrichedOwn = this.substitutionsService.enrichReservations(ownReservations, substitutions);
    }

    return [...enrichedOwn, ...inheritedReservations];
  }

  async findBusyReservationByInstructorId(instructor_id: number): Promise<BusyReservationResponse | null> {
    const instructor = await this.prisma.instructor.findFirst({
      where: {
        id: instructor_id
      },
      include: {
        reservations: true
      }
    }) as (Instructor & { reservations: Reservation[] });
    if (!instructor) {
      throw new NotFoundException(`Instructor with id ${instructor_id} not found`);
    }
    return {
      groupId: null,
      instructorsIds: [instructor.id],
      reservations: instructor.reservations
    }
  }

  async findBusyReservationByInstructorsGroupId(instructors_group_id: number): Promise<BusyReservationResponse | null> {
    const instructorsGroup = await this.prisma.instructorsGroup.findFirst({where: {id: instructors_group_id}});
    if (!instructorsGroup) {
      throw new NotFoundException(`Instructors group with id ${instructors_group_id} not found`);
    }
    const instructors = await this.prisma.instructor.findMany({
      where: {
        isActive: true,
        instructorsGroupId: instructors_group_id,
        ...ASSIGNABLE_INSTRUCTOR_WHERE,
      },
      include: {
        reservations: true
      }
    }) as (Instructor & { reservations: Reservation[]; cars: Car[] })[];
    if (instructors.length < 1) {
      throw new BadRequestException("Not found instructors in group with id ${instructors_group_id}");
    }


    const allGroupReservations = [
      ...instructors.flatMap(instructor => instructor.reservations)
    ];

    const reservations = allGroupReservations.map(r => ({ 
      id: r.id, 
      startTime: r.startTime 
    })); 

    return { 
      instructorsIds: instructors.map(i => i.id),
      groupId: instructors_group_id,
      reservations 
    }; 
  }

  async findBusyReservation( 
    minFreeDays: number, 
    gearbox: string, 
    sector: string,  
    type: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BusyReservationResponse | null> { 
    const today = new Date(); 
    const start = startDate ? new Date(startDate) : today;
    const threeMonthsLater = new Date(); 
    threeMonthsLater.setMonth(today.getMonth() + 3); 
    const end = endDate ? new Date(endDate) : threeMonthsLater;
    if (type === 'group') { 
      const groups = await this.prisma.instructorsGroup.findMany({ 
        where: { 
          sector, 
          instructors: { 
            some: { 
              cars: { 
                some: { gearbox } 
              }, 
              isActive: true,
              ...ASSIGNABLE_INSTRUCTOR_WHERE,
            } 
          } 
        }, 
        include: { 
          instructors: { 
            where: ASSIGNABLE_INSTRUCTOR_WHERE,
            include: { 
              cars: true,
              reservations: {
                where: { 
                  startTime: { 
                    gte: start, 
                    lte: end 
                  } 
                }
              }
            } 
          } 
        } 
      }) as (InstructorsGroup & {  
        reservations: Reservation[];  
        instructors: (Instructor & {cars: Car[]; reservations: Reservation[]})[] 
      })[]; 
      const validGroups = groups.filter(group => 
        group.instructors.some(instructor => 
          instructor.isActive && 
          instructor.cars.some(car => car.gearbox === gearbox)
        )
      );
      if (validGroups.length === 0) return null;

      let leastBusyGroup = validGroups[0];
      let minTotalReservations = this.countTotalGroupReservations(validGroups[0]);

      for (let i = 1; i < validGroups.length; i++) {
        const totalReservations = this.countTotalGroupReservations(validGroups[i]);
        if (totalReservations < minTotalReservations) {
          minTotalReservations = totalReservations;
          leastBusyGroup = validGroups[i];
        }
      }

      const allGroupReservations = leastBusyGroup.instructors.flatMap(instructor =>
        instructor.reservations.map(r => ({
          id: r.id,
          startTime: r.startTime,
          instructorId: r.instructorId,
          instructorSector: instructor.sector
        }))
      );

      return { 
        instructorsIds: leastBusyGroup.instructors.map(i => i.id),
        groupId: leastBusyGroup.id, 
        reservations: allGroupReservations 
      }; 
    } 
  
    const instructors = await this.prisma.instructor.findMany({ 
      where: { 
        isActive: true, 
        sector, 
        cars: { 
          some: { gearbox } 
        },
        ...ASSIGNABLE_INSTRUCTOR_WHERE,
      }, 
      include: { 
        reservations: { 
          where: { 
            startTime: { 
              gte: today, 
              lte: threeMonthsLater 
            } 
          } 
        }, 
        cars: true 
      } 
    }) as (Instructor & { reservations: Reservation[]; cars: Car[] })[]; 

    if (instructors.length === 0) return null;

    let leastBusyInstructor = instructors[0];
    let minReservations = instructors[0].reservations.length;

    for (let i = 1; i < instructors.length; i++) {
      if (instructors[i].reservations.length < minReservations) {
        minReservations = instructors[i].reservations.length;
        leastBusyInstructor = instructors[i];
      }
    }
  
    const reservations = leastBusyInstructor.reservations.map(r => ({ 
      id: r.id, 
      startTime: r.startTime,
      instructorId: r.instructorId,
      instructorSector: leastBusyInstructor.sector
    })); 
  
    return { 
      groupId: null,
      instructorsIds: [leastBusyInstructor.id], 
      reservations 
    }; 
  } 

  private countTotalGroupReservations(group: InstructorsGroup & {  
    reservations: Reservation[];  
    instructors: (Instructor & {cars: Car[]; reservations: Reservation[]})[] 
  }): number {
    const instructorsReservations = group.instructors.reduce((total, instructor) => {
      return total + instructor.reservations.length;
    }, 0);
    
    return instructorsReservations;
  }


}
