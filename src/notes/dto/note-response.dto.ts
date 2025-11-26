import { ApiProperty } from '@nestjs/swagger';

export class NoteResponseDto {
  @ApiProperty({ example: 1, description: 'Note ID' })
  id: number;

  @ApiProperty({ example: 'My First Note', description: 'Note title' })
  title: string;

  @ApiProperty({ example: 'This is the content of my note...', description: 'Note content' })
  content: string;

  @ApiProperty({ example: 1, description: 'User ID who created the note' })
  userId: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;
}
