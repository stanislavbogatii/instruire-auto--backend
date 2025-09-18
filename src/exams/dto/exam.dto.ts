import { IsArray, IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'Time limit in minutes', required: false, default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit?: number;

  @ApiProperty({ description: 'Pass score required', required: false, default: 22 })
  @IsOptional()
  @IsInt()
  @Min(1)
  passScore?: number;
}

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsInt()
  questionId: number;

  @ApiProperty({ description: 'Selected answer index (0-based)' })
  @IsInt()
  @Min(0)
  selectedAnswer: number;
}

export class CreateStudentPermissionDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'Permission valid until this date' })
  @IsDateString()
  validUntil: string;

  @ApiProperty({ description: 'Maximum attempts allowed', required: false, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;
}

export class BulkCreateStudentPermissionDto {
  @ApiProperty({ 
    description: 'Array of student user IDs',
    type: [Number]
  })
  @IsArray()
  @IsInt({ each: true })
  userIds: number[];

  @ApiProperty({ description: 'Permission valid until this date' })
  @IsDateString()
  validUntil: string;

  @ApiProperty({ description: 'Maximum attempts allowed', required: false, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;
}

export class ReactivateStudentDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsInt()
  userId: number;

  @ApiProperty({ description: 'New valid until date' })
  @IsDateString()
  validUntil: string;

  @ApiProperty({ description: 'Reset attempts to 0', required: false, default: true })
  @IsOptional()
  resetAttempts?: boolean;
}
