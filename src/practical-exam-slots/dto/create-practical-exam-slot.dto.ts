import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePracticalExamSlotDto {
  @ApiProperty({ example: '2026-06-15', description: 'Exam date (ISO 8601)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00', description: 'Exam time (HH:mm)' })
  @IsString()
  time: string;

  @ApiProperty({ example: 'Botanica', description: 'Sector name' })
  @IsString()
  sector: string;

  @ApiProperty({ example: 'manual', description: 'Gearbox type (manual / automatic)' })
  @IsString()
  gearbox: string;

  @ApiProperty({ example: 10, description: 'Maximum number of students for this slot' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: 1, description: 'Instructor ID (optional)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  instructorId?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether the slot is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
