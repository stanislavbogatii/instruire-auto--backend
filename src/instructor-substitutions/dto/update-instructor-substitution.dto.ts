import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateInstructorSubstitutionDto {
  @ApiPropertyOptional({ example: 7, description: 'Schimbă instructorul de schimb' })
  @IsOptional()
  @IsInt()
  @Min(1)
  substituteInstructorId?: number;

  @ApiPropertyOptional({ example: '2026-06-21', description: 'Schimbă data înlocuirii' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: false, description: 'Dezactivează/anulează înlocuirea' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
