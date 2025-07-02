import { CreateUserDto } from '../../users/dto/create-user.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAuthDto extends CreateUserDto {
  @ApiProperty({ example: 'password123', description: 'User password' })
  declare password: string;
  @ApiPropertyOptional({example: 'V1a2B3cD',description: 'Optional group token to auto-assign',})
  groupToken?: string;
}
