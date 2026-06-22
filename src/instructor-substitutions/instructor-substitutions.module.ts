import { Module } from '@nestjs/common';
import { InstructorSubstitutionsService } from './instructor-substitutions.service';
import { InstructorSubstitutionsController } from './instructor-substitutions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InstructorSubstitutionsController],
  providers: [InstructorSubstitutionsService],
  exports: [InstructorSubstitutionsService],
})
export class InstructorSubstitutionsModule {}
