import { IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Math 101', description: 'Name of the teaching group' })
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
