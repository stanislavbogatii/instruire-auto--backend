import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationsDto } from './dto/create-reservations.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiTags } from '@nestjs/swagger';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async createReservations(userId: number, dto: CreateReservationsDto) {
    const created: any = [];
    for (const item of dto.reservations) {
      let instructorId = item.instructorId;
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
      } else {
        // If instructorId is provided, verify the instructor is available
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

      // Find a car for this instructor that isn't reserved at this time
      const availableCar = await this.prisma.$transaction(async (prisma) => {
        const cars = await prisma.car.findMany({
          where: { instructorId }
        });

        for (const car of cars) {
          const existingReservation = await prisma.reservation.findFirst({
            where: {
              startTime,
              carId: car.id
            }
          });

          if (!existingReservation) {
            return car;  // Return the first available car
          }
        }
        
        return null;  // No available cars found
      });

      console.log('Found available car:', availableCar);

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
          ...(availableCar ? { carId: availableCar.id } : {})
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
}
