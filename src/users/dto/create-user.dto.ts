import { IsEmail, IsNotEmpty, MinLength, IsString, IsOptional, Matches, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'alice@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', description: 'Plain-text password (min 6 chars)' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Alice', description: 'User first name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Smith', description: 'User last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ 
    example: '+37369000000', 
    description: 'User phone number',
    required: false 
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g. +37369000000)'
  })
  phone?: string;

  @ApiProperty({ 
    example: 'I prefer morning lessons', 
    description: 'Private message or preferences',
    required: false 
  })
  @IsString()
  @IsOptional()
  privateMessage?: string;

  @ApiProperty({ 
    enum: Role, 
    description: 'User role',
    required: false 
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
