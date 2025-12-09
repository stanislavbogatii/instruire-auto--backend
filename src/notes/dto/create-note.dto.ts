import { IsNotEmpty, IsString, MaxLength, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Note date (defaults to current date if not provided)'
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
