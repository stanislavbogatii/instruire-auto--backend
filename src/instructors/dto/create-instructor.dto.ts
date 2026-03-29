import { IsNotEmpty, MaxLength, IsString, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InstructorType } from '@prisma/client';

export class CreateInstructorDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({example: "20X30"})
  @IsOptional()
  order?: string

  @ApiProperty({ example: 'instructor@example.com', description: 'Email address for login' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password for login' })
  @IsNotEmpty()
  @MaxLength(100)
  password: string;

  @ApiProperty({ 
    example: 'Botanica', 
    description: 'Preferred teaching sector',
    required: false 
  })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiProperty({ 
    example: '#FF5733', 
    description: 'Color code for instructor',
    required: false 
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
    description: 'Whether the instructor also handles exams (used alongside SUPERIOR type)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isExamen?: boolean;
}
