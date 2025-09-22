import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { ImageService } from './image.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CommonService, ImageService],
  exports: [CommonService, ImageService],
})
export class CommonModule {}
