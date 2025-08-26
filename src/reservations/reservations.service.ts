import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationsDto } from './dto/create-reservations.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiTags } from '@nestjs/swagger';
import { Car, Instructor, InstructorsGroup, Reservation } from '@prisma/client';
import { start } from 'repl';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}
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

        created.push(reservation);
        instructorIndex++; 
      }
    } else if (instructorId) {
      const instructor = await this.prisma.instructor.findFirst({
        where: {
          id: instructorId
        }
      });
      if (!instructor) throw new NotFoundException("Instructor not found");
      const startTimes = dto.reservations.map(r => new Date(r.startTime));

      const existingReservations = await this.prisma.reservation.findMany({
        where: {
          instructorId,
          startTime: {
            in: startTimes,
          },
        },
        select: {
          startTime: true,
        },
      });

      if (existingReservations.length > 0) {
        const conflictTimes = existingReservations.map(r => r.startTime.toISOString());
        throw new BadRequestException(
          `Instructor ${instructorId} is already reserved at: ${conflictTimes.join(', ')}`
        );
      }

      for (const item of dto.reservations) {
        const startTime = new Date(item.startTime);
        const reservation = await this.prisma.reservation.create({
          data: {
            userId,
            instructorId: instructorId,
            startTime,
            sector: item.sector || '',
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
                phone: true
              }
            }
          }
        });

        created.push(reservation);
      }
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

  async update(id: number, dto: UpdateReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    return this.prisma.reservation.update({
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
  }


  async delete(id: number) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException(`Reservation with id=${id} not found`);
    }
    await this.prisma.reservation.delete({
      where: {id}
    })
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

  async findBusyReservation( 
    minFreeDays: number, 
    gearbox: string, 
    sector: string,  
    type: string 
  ) { 
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
          reservations: { 
            where: { 
              startTime: { 
                gte: today, 
                lte: threeMonthsLater 
              } 
            } 
          }, 
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
      // Фильтруем группы, у которых есть хотя бы один инструктор с нужной коробкой
      const validGroups = groups.filter(group => 
        group.instructors.some(instructor => 
          instructor.isActive && 
          instructor.cars.some(car => car.gearbox === gearbox)
        )
      );
      if (validGroups.length === 0) return null;

      // Находим группу с наименьшим количеством резерваций среди всех инструкторов
      let leastBusyGroup = validGroups[0];
      let minTotalReservations = this.countTotalGroupReservations(validGroups[0]);

      for (let i = 1; i < validGroups.length; i++) {
        const totalReservations = this.countTotalGroupReservations(validGroups[i]);
        if (totalReservations < minTotalReservations) {
          minTotalReservations = totalReservations;
          leastBusyGroup = validGroups[i];
        }
      }

      // Собираем все резервации группы (и групповые, и индивидуальные инструкторов)
      const allGroupReservations = [
        ...leastBusyGroup.reservations,
        ...leastBusyGroup.instructors.flatMap(instructor => instructor.reservations)
      ];

      const reservations = allGroupReservations.map(r => ({ 
        id: r.id, 
        startTime: r.startTime 
      })); 
      return { 
        groupId: leastBusyGroup.id, 
        reservations 
      }; 
    } 
  
    // Поиск самого незанятого индивидуального инструктора
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

    // Находим инструктора с наименьшим количеством резерваций
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
      startTime: r.startTime 
    })); 
  
    return { 
      instructorId: leastBusyInstructor.id, 
      reservations 
    }; 
  } 

  private countTotalGroupReservations(group: InstructorsGroup & {  
    reservations: Reservation[];  
    instructors: (Instructor & {cars: Car[]; reservations: Reservation[]})[] 
  }): number {
    // Считаем групповые резервации + резервации всех инструкторов группы
    const groupReservations = group.reservations.length;
    const instructorsReservations = group.instructors.reduce((total, instructor) => {
      return total + instructor.reservations.length;
    }, 0);
    
    return groupReservations + instructorsReservations;
  }


}
