import { CreateUserDto } from '../../users/dto/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAuthDto extends CreateUserDto {
  @ApiProperty({ example: 'password123', description: 'User password' })
  declare password: string;
}
