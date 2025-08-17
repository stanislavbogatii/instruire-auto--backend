import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInstructorsGroupDto {
  @ApiProperty({ example: 'Morning Shift Team' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
