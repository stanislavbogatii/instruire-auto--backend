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
    for (const item of dto.reservations) {
      let instructorId = item.instructorId;
      let instructorsGroupId = item.instructorsGroupId;
      const startTime = new Date(item.startTime);

      if (!instructorId) {
        // Find all instructors that don't have reservations at the given time
        const availableInstructors = await this.prisma.instructor.findMany({
          where: {
            NOT: {
              reservations: {
                some: {
                  startTime
                }
              }
            }
          }
        });

        if (availableInstructors.length === 0) {
          throw new BadRequestException(`No available instructors for time ${startTime}`);
        }

        // Select a random instructor from available ones
        const randomIndex = Math.floor(Math.random() * availableInstructors.length);
        instructorId = availableInstructors[randomIndex].id;
      } 
      else if (instructorId) {
        const existingReservation = await this.prisma.reservation.findFirst({
          where: {
            instructorId,
            startTime
          }
        });

        if (existingReservation) {
          throw new BadRequestException(`Instructor ${instructorId} is not available at ${startTime}`);
        }
      }
      else if (instructorsGroupId) {
        const existingReservation = await this.prisma.reservation.findFirst({
          where: {
            instructorsGroupId,
            startTime
          }
        });

        if (existingReservation) {
          throw new BadRequestException(`Instructor ${instructorId} is not available at ${startTime}`);
        }
      }

      // const availableCar = await this.prisma.$transaction(async (prisma) => {
      //   const cars = await prisma.car.findMany({
      //     where: { instructorId }
      //   });

      //   for (const car of cars) {
      //     const existingReservation = await prisma.reservation.findFirst({
      //       where: {
      //         startTime,
      //         carId: car.id
      //       }
      //     });

      //     if (!existingReservation) {
      //       return car;  // Return the first available car
      //     }
      //   }
        
      //   return null;  // No available cars found
      // });

      // console.log('Found available car:', availableCar);

      // Create the reservation with the car if available
      // If instructorsGroupId is provided, verify it exists
      if (item.instructorsGroupId) {
        const group = await this.prisma.instructorsGroup.findUnique({
          where: { id: item.instructorsGroupId }
        });
        if (!group) {
          throw new BadRequestException(`Instructors group ${item.instructorsGroupId} not found`);
        }
      }

      const reservation = await this.prisma.reservation.create({
        data: {
          userId,
          instructorId,
          startTime,
          sector: item.sector || '',
          gearbox: item.gearbox || '',
          privateMessage: item.privateMessage || '',
          color: item.color || '',
          instructorsGroupId: item.instructorsGroupId || null,
          // ...(availableCar ? { carId: availableCar.id } : {})
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
    return created;
  }

  async getUserReservations(userId: number) {
    return await this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });
  }

  async findAll() {
    return await this.prisma.reservation.findMany();
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
        color: dto.color,  // Add this line
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

  async getReservationsByUser(userId: number) {
    return this.prisma.reservation.findMany({
      where: {
        userId
      },
      include: {
        instructor: true,
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
          include: { cars: true }
        }
      }
    }) as (InstructorsGroup & { 
      reservations: Reservation[]; 
      instructors: (Instructor & {cars: Car[]})[]
    })[];

    const freeGroups = groups.filter(group => {
      const freeDays = this.countFreeDays(group.reservations, today, threeMonthsLater);
      return freeDays >= minFreeDays;
    });

    if (freeGroups.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * freeGroups.length);
    const randomGroup = freeGroups[randomIndex];

    const reservations = randomGroup.reservations.map(r => ({
      id: r.id,
      startTime: r.startTime
    }));

    return {
      groupId: randomGroup.id,
      reservations
    };
  }

  // Поиск по индивидуальным инструкторам (как у тебя было)
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

  const freeInstructors = instructors.filter(instructor => {
    const freeDays = this.countFreeDays(instructor.reservations, today, threeMonthsLater);
    return freeDays >= minFreeDays;
  });

  if (freeInstructors.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * freeInstructors.length);
  const randomInstructor = freeInstructors[randomIndex];

  const reservations = randomInstructor.reservations.map(r => ({
    id: r.id,
    startTime: r.startTime
  }));

  return {
    instructorId: randomInstructor.id,
    reservations
  };
}

  private countFreeDays(reservations: Reservation[], start: Date, end: Date): number {
    const reservedByDate: Record<string, Set<string>> = {};

    for (const r of reservations) {
      const date = r.startTime.toISOString().split('T')[0];
      const time = r.startTime.toISOString().substring(11, 16);

      if (!reservedByDate[date]) reservedByDate[date] = new Set();
      reservedByDate[date].add(time);
    }

    let freeDaysCount = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayStr = current.toISOString().split('T')[0];
      const reservedSlots = reservedByDate[dayStr] ?? new Set();

      if (reservedSlots.size < this.dailySlots.length) {
        freeDaysCount++;
      }

      current.setDate(current.getDate() + 1);
    }

    return freeDaysCount;
  }
}
