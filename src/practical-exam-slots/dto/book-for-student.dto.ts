import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class BookForStudentDto {
  @ApiProperty({ example: 5, description: 'ID-ul studentului pentru care se face rezervarea' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiPropertyOptional({ example: '#3B82F6', description: 'Display color for this reservation (hex or CSS color)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Notă proprie rezervării' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  privateMessage?: string;
}
