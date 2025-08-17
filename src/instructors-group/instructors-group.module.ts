import { Module } from '@nestjs/common';
import { InstructorsGroupService } from './instructors-group.service';
import { InstructorsGroupController } from './instructors-group.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InstructorsGroupController],
  providers: [InstructorsGroupService],
  exports: [InstructorsGroupService]
})
export class InstructorsGroupModule {}
