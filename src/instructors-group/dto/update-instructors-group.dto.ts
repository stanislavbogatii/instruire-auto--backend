import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInstructorsGroupDto {
  @ApiPropertyOptional({ example: 'Evening Shift Team' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({example: 0})
  @IsOptional()
  order?: number
}
