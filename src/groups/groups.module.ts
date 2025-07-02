import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InstructorsModule } from 'src/instructors/instructors.module';

@Module({
  imports: [PrismaModule, InstructorsModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports:   [GroupsService],
})
export class GroupsModule {}
