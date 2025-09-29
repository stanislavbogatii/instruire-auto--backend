import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { ImageService } from './image.service';
import { UserContextService } from './user-context.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CommonService, ImageService, UserContextService],
  exports: [CommonService, ImageService, UserContextService],
})
export class CommonModule {}
