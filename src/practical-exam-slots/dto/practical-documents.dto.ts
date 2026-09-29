import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PracticalDocumentsQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-23',
    description: 'Ziua examenului în format YYYY-MM-DD. Implicit: ziua curentă.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
