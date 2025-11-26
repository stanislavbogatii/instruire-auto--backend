import { PartialType } from '@nestjs/mapped-types';
import { CreateNoteDto } from './create-note.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @ApiPropertyOptional({ description: 'New note title (optional)' })
  title?: string;

  @ApiPropertyOptional({ description: 'New note content (optional)' })
  content?: string;
}
