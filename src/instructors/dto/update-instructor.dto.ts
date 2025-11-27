import { PartialType } from '@nestjs/mapped-types';
import { CreateInstructorDto } from './create-instructor.dto';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

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
}
