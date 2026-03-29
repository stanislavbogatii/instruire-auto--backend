import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationsDto } from './dto/create-reservations.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { HistoryService } from './history.service';
import { Car, Instructor, InstructorsGroup, Reservation } from '@prisma/client';
import { BusyReservationResponse } from './dto/ busy-reservation.dto';

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
    private historyService: HistoryService
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

  async createReservationsForUser(userId: number, dto: CreateReservationsDto, createdBy?: number) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.createReservations(userId, dto, createdBy);
  }

  async createReservations(userId: number, dto: CreateReservationsDto, createdBy?: number): Promise<Reservation[]> {
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

        const isCiocanaGroup = ((instructorsGroup?.sector || '').trim().toLowerCase() === 'ciocana');

        if (isCiocanaGroup) {
          if (reservations.length === 0) return [];

          // For Ciocana groups use dedicated Botanica/Ciocana split logic.
          const groupInstructors = await tx.instructor.findMany({
            where: {
              isActive: true,
              instructorsGroupId,
            },
          });

          if (!groupInstructors.length) {
            throw new NotFoundException("Instructors in this group not found");
          }

          const botanicaInstructor = groupInstructors.find(
            instructor => (instructor.sector || '').trim().toLowerCase() === 'botanica'
          );

          if (!botanicaInstructor) {
            throw new NotFoundException("Botanica instructor in this group not found");
          }

          const ciocanaInstructors = groupInstructors.filter(
            instructor => (instructor.sector || '').trim().toLowerCase() === 'ciocana'
          );

          const botanicaReservationsCount = await tx.reservation.count({
            where: {
              userId,
              sector: 'Botanica',
              deletedAt: null,
            },
          });

          const botanicaSlotsToFill = Math.max(0, 7 - botanicaReservationsCount);
          const botanicaAssignmentsCount = Math.min(botanicaSlotsToFill, reservations.length);
          const hasCiocanaAssignments = reservations.length > botanicaAssignmentsCount;

          if (hasCiocanaAssignments && !ciocanaInstructors.length) {
            throw new NotFoundException("Ciocana instructors in this group not found");
          }

          const requestedStartTimes = reservations.map(item => new Date(item.startTime));
          const existingReservations = await tx.reservation.findMany({
            where: {
              instructorId: { in: groupInstructors.map(instructor => instructor.id) },
              startTime: { in: requestedStartTimes },
              deletedAt: null,
            },
            select: {
              instructorId: true,
              startTime: true,
            },
          });

          const occupiedSlots = new Set(
            existingReservations
              .filter((reservation): reservation is { instructorId: number; startTime: Date } => reservation.instructorId !== null)
              .map(reservation => this.buildReservationSlotKey(reservation.instructorId, reservation.startTime))
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
                  `No available Ciocana instructor at ${startTime.toISOString()}`,
                  null,
                  'Ciocana'
                )
              );
              continue;
            }

            plannedSlots.add(assignedSlotKey);
            plannedReservations.push({
              item,
              instructorId: assignedCiocanaInstructor.id,
              startTime,
              sector: 'Ciocana',
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
          },
        });

        if (!instructors.length) {
          throw new NotFoundException("Instructors in this group not found");
        }

        if (reservations.length === 0) return [];

        const requestedStartTimes = reservations.map(item => new Date(item.startTime));
        const existingReservations = await tx.reservation.findMany({
          where: {
            instructorId: { in: instructors.map(instructor => instructor.id) },
            startTime: { in: requestedStartTimes },
            deletedAt: null,
          },
          select: {
            instructorId: true,
            startTime: true,
          },
        });

        const occupiedSlots = new Set(
          existingReservations
            .filter((reservation): reservation is { instructorId: number; startTime: Date } => reservation.instructorId !== null)
            .map(reservation => this.buildReservationSlotKey(reservation.instructorId, reservation.startTime))
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
        const N = Math.min(7, reservations.length);

        const userReservationsCount = await tx.reservation.count({
          where: { userId, deletedAt: null },
        });

        const allCiocana = reservations.every(r => ((r.sector || '').trim().toLowerCase() === 'ciocana'));

        let botanicaInstructor: Instructor | null = null;
        const reservationErrors: ReservationConflict[] = [];
        let botanicaUnavailableForBatch = false;

        if (userReservationsCount === 0 && allCiocana && N > 0) {
          botanicaInstructor = await tx.instructor.findFirst({
            where: {
              sector: 'Botanica',
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

        const existingReservations = await tx.reservation.findMany({
          where: {
            instructorId: { in: relevantInstructorIds },
            startTime: { in: startTimes },
            deletedAt: null,
          },
          select: {
            instructorId: true,
            startTime: true,
          },
        });

        const occupiedSlots = new Set(
          existingReservations
            .filter((reservation): reservation is { instructorId: number; startTime: Date } => reservation.instructorId !== null)
            .map(reservation => this.buildReservationSlotKey(reservation.instructorId, reservation.startTime))
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
    return `${instructorId}:${startTime.toISOString()}`;
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

  async getUserReservations(userId: number) {
    return await this.prisma.reservation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { startTime: 'asc' },
      include: {
        instructor: {
          select: {
            phone: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
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

    return {
      data: reservations,
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
    return this.prisma.reservation.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        instructor: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true
          }
        },
        car: {
          select: {
            id: true,
            plateNumber: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });
  }

  async getReservationsByInstructorId(instructorId: number) {
    return this.prisma.reservation.findMany({
      where: {
        instructorId,
        deletedAt: null
      },
      include: {
        instructor: {
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true
          }
        },
        car: {
          select: {
            id: true,
            plateNumber: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });
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
              isActive: true 
            } 
          } 
        }, 
        include: { 
          instructors: { 
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
        } 
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
