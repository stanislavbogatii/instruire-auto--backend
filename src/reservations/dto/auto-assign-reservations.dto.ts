import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * How lessons are distributed among the eligible instructors found for
 * the student's selected sector/gearbox.
 */
export enum InstructorAssignmentMode {
  /** All lessons go to a single eligible instructor. */
  SINGLE = 'SINGLE',
  /** Lessons are distributed (round-robin) among all eligible instructors. */
  MULTIPLE = 'MULTIPLE',
}

export class AutoAssignReservationsDto {
  @ApiProperty({
    example: 'Ciocana',
    description: 'Sector selected by the student (Botanica, Ciocana, Buiucani)',
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

  @ApiProperty({
    enum: InstructorAssignmentMode,
    example: InstructorAssignmentMode.SINGLE,
  })
  @IsEnum(InstructorAssignmentMode)
  instructorMode: InstructorAssignmentMode;

  @ApiProperty({
    type: [String],
    example: ['2025-07-20T10:00:00Z', '2025-07-22T10:00:00Z'],
    description:
      'Ordered (chronological) lesson start times. Order matters: the mandatory poligon lessons rule ' +
      'is applied to the first entries of this array.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsDateString({}, { each: true })
  startTimes: string[];

  @ApiPropertyOptional({ example: 'Please pick me up from home' })
  @IsString()
  @IsOptional()
  privateMessage?: string;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Mark reservation as important. Defaults to true for student self-booking.',
  })
  @IsBoolean()
  @IsOptional()
  isImportant?: boolean;
}
