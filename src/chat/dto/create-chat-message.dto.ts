import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({ description: 'Conținutul mesajului' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
