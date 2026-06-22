import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class RatingStatsQueryDto {
  @ApiPropertyOptional({ example: 3, description: 'ID instructor (omit pentru toți instructorii)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  instructorId?: number;

  @ApiPropertyOptional({ example: 2026, description: 'An (YYYY). Dacă e omis, se returnează toți anii.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: 6, description: 'Luna (1–12). Dacă e omisă, se returnează statistici lunare pentru tot anul.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  month?: number;
}
