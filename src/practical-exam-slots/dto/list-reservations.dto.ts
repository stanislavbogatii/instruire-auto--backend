import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PracticalExamReservationStatus } from './update-reservation-status.dto';

export class ListReservationsDto {
  @ApiPropertyOptional({ example: '2026-06-15', description: 'Filter by exact date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Start of date range (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'End of date range (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by instructor ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  instructorId?: number;

  @ApiPropertyOptional({ example: 'Botanica', description: 'Filter by sector' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ example: 'manual', description: 'Filter by gearbox type' })
  @IsOptional()
  @IsString()
  gearbox?: string;

  @ApiPropertyOptional({
    enum: PracticalExamReservationStatus,
    example: PracticalExamReservationStatus.SCHEDULED,
    description: 'Filter by reservation status',
  })
  @IsOptional()
  @IsEnum(PracticalExamReservationStatus)
  status?: PracticalExamReservationStatus;
}
