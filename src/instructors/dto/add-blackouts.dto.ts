import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class InstructorBlackoutDto {
  @ApiProperty({ example: '2025-07-20T10:00:00Z' })
  @IsDateString()
  dateTime: string;

  @ApiProperty({ example: 1, description: 'Instructor ID' })
  @IsNumber()
  @IsNotEmpty()
  instructorId: number;
}

export class AddBlackoutsDto {
  @ApiProperty({ type: [InstructorBlackoutDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructorBlackoutDto)
  blackouts: InstructorBlackoutDto[];
}
