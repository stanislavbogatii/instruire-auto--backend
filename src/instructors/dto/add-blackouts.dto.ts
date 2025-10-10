import { ApiProperty } from '@nestjs/swagger';
import { InstructorBlackoutType } from "@prisma/client";
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, ValidateNested, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class InstructorBlackoutDto {
  @ApiProperty({ example: '2025-07-20T10:00:00Z' })
  @IsDateString()
  dateTime: string;

  @ApiProperty({ example: 1, description: 'Instructor ID' })
  @IsNumber()
  @IsNotEmpty()
  instructorId: number;

  @ApiPropertyOptional({ example: 'SINGLE', description: 'Type of blackout: SINGLE or REPEAT' })
  @IsString()
  @IsOptional()
  type?: InstructorBlackoutType = InstructorBlackoutType.SINGLE;

  @ApiPropertyOptional({ example: '2025-07-20T10:00:00Z', description: 'Start date-time for REPEAT type' })
  @IsDateString()
  @IsOptional()
  startDateTime?: string;

  @ApiPropertyOptional({ example: '2025-08-20T10:00:00Z', description: 'End date-time for REPEAT type' })
  @IsDateString()
  @IsOptional()
  endDateTime?: string;

  @ApiPropertyOptional({ example: 7, description: 'Repeat every X days for REPEAT type' })
  @IsNumber()
  @IsOptional()
  repeatEveryDays?: number = 0;
}

export class AddBlackoutsDto {
  @ApiProperty({ type: [InstructorBlackoutDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructorBlackoutDto)
  blackouts: InstructorBlackoutDto[];
}
