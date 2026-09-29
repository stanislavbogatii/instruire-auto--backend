import { Module } from '@nestjs/common';
import { InstructorRatingsService } from './instructor-ratings.service';
import { InstructorRatingsController } from './instructor-ratings.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SuperiorInstructorGuard } from 'src/auth/guards/superior-instructor.guard';
import { InstructorSubstitutionsModule } from 'src/instructor-substitutions/instructor-substitutions.module';

@Module({
  imports: [PrismaModule, InstructorSubstitutionsModule],
  controllers: [InstructorRatingsController],
  providers: [InstructorRatingsService, SuperiorInstructorGuard],
  exports: [InstructorRatingsService],
})
export class InstructorRatingsModule {}
