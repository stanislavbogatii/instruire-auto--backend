import { Module } from '@nestjs/common';
import { PracticalExamSlotsService } from './practical-exam-slots.service';
import { PracticalExamSlotsController } from './practical-exam-slots.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PracticalExamSlotsController],
  providers: [PracticalExamSlotsService],
  exports: [PracticalExamSlotsService],
})
export class PracticalExamSlotsModule {}
