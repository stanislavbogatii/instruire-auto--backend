import { Module } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { InstructorsController } from './instructors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [InstructorsController],
  providers: [InstructorsService],
  exports: [InstructorsService],
})
export class InstructorsModule {}
