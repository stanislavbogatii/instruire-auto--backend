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

      const reservation = await this.prisma.reservation.create({
        data: {
          userId,
          startTime,
          instructorId,
        },
        include: {
          instructor: true // Include instructor details in response
        }
      });

      if (reservation)
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
    return await this.prisma.reservation.update({
      where: { id },
      data: {
        ...(dto.startTime && { startTime: new Date(dto.startTime) }),
        ...(dto.instructorId && { instructorId: dto.instructorId }),
      },
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
}
