import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Min } from 'class-validator';

export class CreateInstructorSubstitutionDto {
  @ApiProperty({ example: 3, description: 'ID-ul instructorului de bază (cel care este înlocuit)' })
  @IsInt()
  @Min(1)
  baseInstructorId: number;

  @ApiProperty({ example: 7, description: 'ID-ul instructorului de schimb (înlocuitorul, trebuie să aibă tip SCHIMB)' })
  @IsInt()
  @Min(1)
  substituteInstructorId: number;

  @ApiProperty({ example: '2026-06-20', description: 'Data înlocuirii (ISO 8601)' })
  @IsDateString()
  date: string;
}
