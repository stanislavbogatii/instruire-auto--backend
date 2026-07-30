import { Module } from '@nestjs/common';
import { RecommendedVideosController } from './recommended-videos.controller';
import { RecommendedVideosService } from './recommended-videos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [RecommendedVideosController],
  providers: [RecommendedVideosService],
  exports: [RecommendedVideosService],
})
export class RecommendedVideosModule {}
