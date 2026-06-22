import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, IsInt, Min, IsEnum, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'New email (optional)' })
  email?: string;

  @ApiPropertyOptional({ description: 'Color (optional)' })
  color?: string;

  @ApiPropertyOptional({ description: 'New password (optional, min 6 chars)' })
  password?: string;

  @ApiPropertyOptional({ enum: Role, description: 'User role (optional)' })
  @IsOptional()
  @IsEnum(Role, { message: 'role must be a valid Role value' })
  role?: Role;

  @ApiPropertyOptional({ example: 'Alice', description: 'New first name (optional)' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith', description: 'New last name (optional)' })
  lastName?: string;

  @ApiPropertyOptional({ 
    example: '069123456', 
    description: 'User phone number',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[0-9]{6,15}$/, {
    message: 'Phone number must be 6-15 digits, optionally starting with +'
  })
  phone?: string;

  @ApiPropertyOptional({ 
    example: '2001234567890', 
    description: 'User IDNP (Personal Identification Number)',
    required: false 
  })
  @IsOptional()
  @IsString()
  idnp?: string;

  @ApiPropertyOptional({ 
    example: 'I prefer morning lessons', 
    description: 'Private message or preferences',
    required: false 
  })
  @IsString()
  @IsOptional()
  privateMessage?: string;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Desired instructor ID for the user',
    required: false 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  desiredInstructorId?: number;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Indicates if medical documents are provided',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  medical_documents?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Indicates if individual work is required',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  individual_work?: boolean;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Number of absences',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  number_of_absences?: number;

  @ApiPropertyOptional({ 
    example: 3, 
    description: 'Group ID to assign the user to (Admin/Manager only). Pass null to remove from group.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  groupId?: number | null;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Whether the student is allowed to book a practical exam (Admin/Manager only)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  canBookPracticalExam?: boolean;
}
