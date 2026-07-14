import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { InstructorAssignmentMode } from './auto-assign-reservations.dto';

export class ReservationsAvailabilityQueryDto {
  @ApiProperty({
    example: 'Ciocana',
    description: 'Sector selected by the student',
  })
  @IsString()
  @IsNotEmpty()
  sector: string;

  @ApiProperty({
    example: 'Manual',
    description: 'Gearbox type selected by the student',
  })
  @IsString()
  @IsNotEmpty()
  gearbox: string;

  @ApiPropertyOptional({ example: '2025-07-20T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-10-20T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    enum: InstructorAssignmentMode,
    example: InstructorAssignmentMode.MULTIPLE,
    description:
      'SINGLE = availability for the one sticky/preferred instructor only; ' +
      'MULTIPLE = free counts across the whole eligible pool.',
  })
  @IsEnum(InstructorAssignmentMode)
  @IsOptional()
  instructorMode?: InstructorAssignmentMode;
}
