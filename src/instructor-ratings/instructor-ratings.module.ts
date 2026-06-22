import { Module } from '@nestjs/common';
import { InstructorRatingsService } from './instructor-ratings.service';
import { InstructorRatingsController } from './instructor-ratings.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InstructorRatingsController],
  providers: [InstructorRatingsService],
  exports: [InstructorRatingsService],
})
export class InstructorRatingsModule {}
