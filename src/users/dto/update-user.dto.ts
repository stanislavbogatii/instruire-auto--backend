import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ description: 'New email (optional)' })
  email?: string;

  @ApiPropertyOptional({ description: 'New password (optional, min 6 chars)' })
  password?: string;

  @ApiPropertyOptional({ example: 'Alice', description: 'New first name (optional)' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith', description: 'New last name (optional)' })
  lastName?: string;
}
