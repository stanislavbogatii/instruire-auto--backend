import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @ApiPropertyOptional({ description: 'New name for the group' })
  name?: string;

  @ApiPropertyOptional({ description: 'New instructor ID' })
  instructorId?: number;
}
