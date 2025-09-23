import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationsDto } from './dto/create-reservations.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { HistoryService } from './history.service';
import { ApiTags } from '@nestjs/swagger';
import { Car, Instructor, InstructorsGroup, Reservation } from '@prisma/client';
import { start } from 'repl';
import { BusyReservationResponse } from './dto/ busy-reservation.dto';
import { group } from 'console';

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

  async createReservationsForUser(userId: number, dto: CreateReservationsDto) {
    // Validate that the target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.createReservations(userId, dto);
  }

  async createReservations(userId: number, dto: CreateReservationsDto) {
    const created: any = [];
    let instructorId = dto.instructorId;
    let instructorsGroupId = dto.instructorsGroupId;

    if (instructorsGroupId) {
      const instructors = await this.prisma.instructor.findMany({
        where: {
          isActive: true,
          instructorsGroupId
        }
      });

      if (!instructors.length) {
        throw new NotFoundException("Instructors in this group not found");
      }

      let instructorIndex = 0;

      for (const item of dto.reservations) {
        const startTime = new Date(item.startTime);

        let assignedInstructor: Instructor | null = null;
        let tries = 0;

        while (!assignedInstructor && tries < instructors.length) {
          const currentInstructor = instructors[instructorIndex % instructors.length];

          const existing = await this.prisma.reservation.findFirst({
            where: {
              instructorId: currentInstructor.id,
              startTime
            }
          });

          if (!existing) {
            assignedInstructor = currentInstructor;
          } else {
            instructorIndex++;
            tries++;
          }
        }

        if (!assignedInstructor) {
          throw new BadRequestException(
            `No available instructor at ${startTime.toISOString()}`
          );
        }

        const reservation = await this.prisma.reservation.create({
          data: {
            userId,
            instructorId: assignedInstructor.id,
            startTime,
            sector: item.sector || '',
            gearbox: item.gearbox || '',
            privateMessage: item.privateMessage || '',
            color: item.color || '',
            instructorsGroupId,
          },
          include: {
            instructor: true,
            instructorsGroup: true,
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

        try {
          await this.historyService.createHistoryRecord(
            reservation.id,
            'CREATE' as any, 
            reservation,
            userId
          );
        } catch (error) {
          console.warn('Failed to create history record:', error.message);
        }

        created.push(reservation);
        instructorIndex++; 
      }
    } else if (instructorId) {
      const instructor = await this.prisma.instructor.findFirst({
        where: { id: instructorId },
      });
      if (!instructor) throw new NotFoundException("Instructor not found");

      const reservations = dto.reservations || [];
      if (reservations.length === 0) return []; 

      const startTimes = reservations.map(r => new Date(r.startTime));

      const N = Math.min(7, reservations.length);

      const userReservationsCount = await this.prisma.reservation.count({
        where: { userId },
      });

      const allCiocana = reservations.every(r => ((r.sector || '').toLowerCase() === 'ciocana'));

      let botanicaInstructor: Instructor | null = null;
      if (userReservationsCount === 0 && allCiocana && N > 0) {
        const firstNStartTimes = startTimes.slice(0, N);

        botanicaInstructor = await this.prisma.instructor.findFirst({
          where: {
            sector: 'Botanica',
            reservations: {
              none: {
                startTime: { in: firstNStartTimes },
              },
            },
          },
        });

        if (!botanicaInstructor) {
          throw new BadRequestException(
            `No available Botanica instructor found for first ${N} reservations`
          );
        }
      }

      const ciocanaTimes = botanicaInstructor ? startTimes.slice(N) : startTimes;
      if (ciocanaTimes.length > 0) {
        const existingCiocana = await this.prisma.reservation.findMany({
          where: {
            instructorId,
            startTime: { in: ciocanaTimes },
          },
          select: { startTime: true },
        });

        if (existingCiocana.length > 0) {
          const conflictTimes = existingCiocana.map(r => r.startTime.toISOString());
          throw new BadRequestException(
            `Instructor ${instructorId} is already reserved at: ${conflictTimes.join(', ')}`
          );
        }
      }

      if (botanicaInstructor) {
        const existingBotanica = await this.prisma.reservation.findMany({
          where: {
            instructorId: botanicaInstructor.id,
            startTime: { in: startTimes.slice(0, N) },
          },
          select: { startTime: true },
        });
        if (existingBotanica.length > 0) {
          const conflictTimes = existingBotanica.map(r => r.startTime.toISOString());
          throw new BadRequestException(
            `Botanica instructor ${botanicaInstructor.id} is already reserved at: ${conflictTimes.join(', ')}`
          );
        }
      }


      for (const [index, item] of reservations.entries()) {
        const startTime = new Date(item.startTime);

        let usedInstructorId = instructorId;
        let usedSector = item.sector || '';

        if (botanicaInstructor && index < N) {
          usedInstructorId = botanicaInstructor.id;
          usedSector = 'Botanica';
        }

        const reservation = await this.prisma.reservation.create({
          data: {
            userId,
            instructorId: usedInstructorId,
            startTime,
            sector: usedSector,
            gearbox: item.gearbox || '',
            privateMessage: item.privateMessage || '',
            color: item.color || '',
            instructorsGroupId: null,
          },
          include: {
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
          },
        });

        try {
          await this.historyService.createHistoryRecord(
            reservation.id,
            'CREATE' as any,
            reservation,
            userId
          );
        } catch (error) {
          console.warn('Failed to create history record:', error?.message ?? error);
        }

        created.push(reservation);
      }

      return created;

    }




    return created;
  }

  async getUserReservations(userId: number) {
    return await this.prisma.reservation.findMany({
      where: { userId },
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

  async findAll() {
    return await this.prisma.reservation.findMany({
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

  async update(id: number, dto: UpdateReservationDto, changedBy?: number) {
    const oldReservation = await this.prisma.reservation.findUnique({
      where: { id },
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
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException(`Reservation with id=${id} not found`);
    }

    // Create history record for the deletion before deleting
    try {
      await this.historyService.createHistoryRecord(
        id,
        'DELETE' as any, // We'll fix this enum issue later
        reservation,
        changedBy
      );
    } catch (error) {
      console.warn('Failed to create history record:', error.message);
    }

    await this.prisma.reservation.delete({
      where: {id}
    });
  }

  async confirmReservation(id: number, changedBy?: number) {
    const oldReservation = await this.prisma.reservation.findUnique({
      where: { id },
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
    const oldReservation = await this.prisma.reservation.findUnique({
      where: { id },
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

  async getReservationsByUserId(userId: number) {
    return this.prisma.reservation.findMany({
      where: {
        userId
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
        instructorId
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
      instructorId: instructor.id,
      total_instructors: 1,
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
      groupId: instructors_group_id,
      total_instructors: instructors.length,
      reservations 
    }; 
  }

  async findBusyReservation( 
    minFreeDays: number, 
    gearbox: string, 
    sector: string,  
    type: string,
  ): Promise<BusyReservationResponse | null> { 
    const today = new Date(); 
    const threeMonthsLater = new Date(); 
    threeMonthsLater.setMonth(today.getMonth() + 3); 
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
                    gte: today, 
                    lte: threeMonthsLater 
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

      // Собираем ВСЕ резервации от ВСЕХ групп и инструкторов (не только от наименее занятой группы)
      const allGroupReservations = validGroups.flatMap(group =>
        group.instructors.flatMap(instructor => 
          instructor.isActive && instructor.cars.some(car => car.gearbox === gearbox)
            ? instructor.reservations
            : []
        )
      );

      // Убираем дубликаты резерваций по времени
      const uniqueReservations = allGroupReservations.filter((reservation, index, self) => 
        index === self.findIndex(r => r.startTime.getTime() === reservation.startTime.getTime())
      );

      const reservations = uniqueReservations.map(r => ({ 
        id: r.id, 
        startTime: r.startTime 
      })); 

      // Подсчитываем общее количество инструкторов по всем группам
      const totalInstructors = validGroups.reduce((total, group) => 
        total + group.instructors.filter(instructor => 
          instructor.isActive && 
          instructor.cars.some(car => car.gearbox === gearbox)
        ).length, 0
      );

      return { 
        groupId: 0, // 0 означает "все группы"
        total_instructors: totalInstructors,
        reservations: reservations.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
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

    // Собираем ВСЕ резервации от ВСЕХ инструкторов (не только от наименее занятого)
    const allInstructorReservations = instructors.flatMap(instructor => instructor.reservations);

    // Убираем дубликаты резерваций по времени
    const uniqueReservations = allInstructorReservations.filter((reservation, index, self) => 
      index === self.findIndex(r => r.startTime.getTime() === reservation.startTime.getTime())
    );
  
    const reservations = uniqueReservations.map(r => ({ 
      id: r.id, 
      startTime: r.startTime 
    })); 
  
    return { 
      instructorId: 0, // 0 означает "все инструкторы"
      total_instructors: instructors.length,
      reservations: reservations.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
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
