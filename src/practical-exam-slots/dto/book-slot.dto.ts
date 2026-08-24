import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BookSlotDto {
  @ApiPropertyOptional({ example: '#3B82F6', description: 'Display color for this reservation (hex or CSS color)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Notă proprie rezervării' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  privateMessage?: string;
}
