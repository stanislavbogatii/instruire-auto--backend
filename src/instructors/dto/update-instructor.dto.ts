import { PartialType } from '@nestjs/mapped-types';
import { CreateInstructorDto } from './create-instructor.dto';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { InstructorType } from '@prisma/client';

export class UpdateInstructorDto extends PartialType(CreateInstructorDto) {
  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiProperty({
    example: 'Botanica',
    description: 'Preferred teaching sector',
    required: false,
  })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiProperty({example: "20X30"})
  @IsOptional()
  order?: string

  @ApiPropertyOptional({ 
    example: '#FF5733', 
    description: 'Color code for instructor'
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    enum: InstructorType,
    example: InstructorType.BAZA,
    description: 'Instructor type: SCHIMB, BAZA, EXAMEN, SUPERIOR',
    required: false,
  })
  @IsEnum(InstructorType)
  @IsOptional()
  instructorType?: InstructorType;

  @ApiProperty({
    example: false,
    description: 'Whether the instructor also handles exams',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isExamen?: boolean;
}
