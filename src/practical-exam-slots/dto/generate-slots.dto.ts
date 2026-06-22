import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ArrayNotEmpty,
} from 'class-validator';

export class GenerateSlotsDto {
  @ApiProperty({
    example: [1, 3, 5],
    description: 'Days of week to generate slots for (0=Sunday, 1=Monday, ..., 6=Saturday)',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[];

  @ApiProperty({
    example: ['09:00', '11:00', '14:00'],
    description: 'Times to create a slot at on each matching day (HH:mm)',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  times: string[];

  @ApiProperty({ example: 'Botanica', description: 'Sector name' })
  @IsString()
  sector: string;

  @ApiProperty({ example: 'manual', description: 'Gearbox type (manual / automatic)' })
  @IsString()
  gearbox: string;

  @ApiProperty({ example: 10, description: 'Capacity per slot' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: '2026-06-01', description: 'Start date (ISO 8601, inclusive)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-30', description: 'End date (ISO 8601, inclusive)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 1, description: 'Instructor ID (optional)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  instructorId?: number;
}
