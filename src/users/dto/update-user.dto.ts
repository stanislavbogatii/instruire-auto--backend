import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'New email (optional)' })
  email?: string;

  @ApiPropertyOptional({ description: 'New password (optional, min 6 chars)' })
  password?: string;

  @ApiPropertyOptional({ example: 'Alice', description: 'New first name (optional)' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith', description: 'New last name (optional)' })
  lastName?: string;

  @ApiPropertyOptional({ 
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

  @ApiPropertyOptional({ 
    example: 'I prefer morning lessons', 
    description: 'Private message or preferences',
    required: false 
  })
  @IsString()
  @IsOptional()
  privateMessage?: string;
}
