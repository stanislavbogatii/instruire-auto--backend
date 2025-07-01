import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'alice@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'strongPassword123', description: 'Plain-text password (min 6 chars)' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
