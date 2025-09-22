import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupDto } from './create-group.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, MaxLength } from 'class-validator';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @ApiPropertyOptional({ description: 'New name for the group' })
  name?: string;

  @ApiPropertyOptional({ description: 'New instructor ID' })
  instructorId?: number;

  @ApiPropertyOptional({ description: 'New token for the group', example: 'abc12345' })
  @IsOptional()
  @MaxLength(20)
  token?: string;
}
