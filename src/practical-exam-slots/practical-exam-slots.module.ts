import { Module } from '@nestjs/common';
import { PracticalExamSlotsService } from './practical-exam-slots.service';
import { PracticalExamSlotsController } from './practical-exam-slots.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [PrismaModule, NotificationsModule, ExamsModule],
  controllers: [PracticalExamSlotsController],
  providers: [PracticalExamSlotsService],
  exports: [PracticalExamSlotsService],
})
export class PracticalExamSlotsModule {}
