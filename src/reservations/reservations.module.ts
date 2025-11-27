import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { HistoryService } from './history.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WsModule } from 'src/ws/ws.module';

@Module({
  imports: [PrismaModule, WsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, HistoryService],
})
export class ReservationsModule {}
