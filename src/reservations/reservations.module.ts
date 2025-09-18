import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { HistoryService } from './history.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, HistoryService],
})
export class ReservationsModule {}
