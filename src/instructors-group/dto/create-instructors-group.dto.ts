import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInstructorsGroupDto {
  @ApiProperty({ example: 'Morning Shift Team' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Botanica' })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiProperty({example: 0})
  @IsOptional()
  order?: number
}
