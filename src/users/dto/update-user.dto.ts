import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, IsInt, Min } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'New email (optional)' })
  email?: string;

  @ApiPropertyOptional({ description: 'Color (optional)' })
  color?: string;

  @ApiPropertyOptional({ description: 'New password (optional, min 6 chars)' })
  password?: string;

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
}
