import { PartialType } from '@nestjs/mapped-types';
import { CreateNoteDto } from './create-note.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @ApiPropertyOptional({ description: 'New note title (optional)' })
  title?: string;

  @ApiPropertyOptional({ description: 'New note content (optional)' })
  content?: string;

  @ApiPropertyOptional({ 
    example: '2024-01-01T00:00:00.000Z',
    description: 'New note date (optional)' 
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
