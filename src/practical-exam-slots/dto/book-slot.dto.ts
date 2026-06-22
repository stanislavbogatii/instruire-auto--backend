import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BookSlotDto {
  @ApiPropertyOptional({ example: '#3B82F6', description: 'Display color for this reservation (hex or CSS color)' })
  @IsOptional()
  @IsString()
  color?: string;
}
