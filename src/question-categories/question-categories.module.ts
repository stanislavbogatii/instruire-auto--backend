import { Module } from '@nestjs/common';
import { QuestionCategoriesController } from './question-categories.controller';
import { QuestionCategoriesService } from './question-categories.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuestionCategoriesController],
  providers: [QuestionCategoriesService],
  exports: [QuestionCategoriesService],
})
export class QuestionCategoriesModule {}
