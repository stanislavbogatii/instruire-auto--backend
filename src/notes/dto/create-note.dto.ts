import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ 
    example: 'My First Note', 
    description: 'Note title',
    maxLength: 255
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ 
    example: 'This is the content of my note...', 
    description: 'Note content'
  })
  @IsNotEmpty()
  @IsString()
  content: string;
}
