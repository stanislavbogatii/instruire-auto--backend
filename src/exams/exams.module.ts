import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { QuestionsService } from './questions.service';
import { TicketsService } from './tickets.service';
import { PdfService } from './pdf.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, MailModule, CommonModule, NotificationsModule],
  controllers: [ExamsController],
  providers: [ExamsService, QuestionsService, TicketsService, PdfService],
  exports: [ExamsService, QuestionsService, TicketsService, PdfService],
})
export class ExamsModule {}
