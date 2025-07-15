import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationsDto } from './dto/create-reservations.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async createReservations(userId: number, dto: CreateReservationsDto) {
    const created: any = [];

    for (const item of dto.reservations) {
      const reservation = await this.prisma.reservation.create({
        data: {
          userId,
          startTime: new Date(item.startTime),
        },
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
    await this.prisma.reservation.update({
      where: {id},
      data: dto
    })
  }
}
