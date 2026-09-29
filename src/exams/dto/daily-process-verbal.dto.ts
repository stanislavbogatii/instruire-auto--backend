import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DailyProcessVerbalQueryDto {
  @ApiPropertyOptional({
    description: 'Day covered by the report in YYYY-MM-DD format. Defaults to today.',
    example: '2026-09-10',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
