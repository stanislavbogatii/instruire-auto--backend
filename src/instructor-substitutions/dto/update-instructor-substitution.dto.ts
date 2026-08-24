import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiPropertyOptional({ 
    example: 'CONFIRMED', 
    description: 'Statutul înlocuirii: SCHEDULED, CONFIRMED, COMPLETED, CANCELLED' 
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ 
    example: '#FF5733', 
    description: 'Culoare pentru UI personalizare' 
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ 
    example: 'Medic până la 14:00', 
    description: 'Notă despre înlocuire (vizibilă pentru student și instructor)' 
  })
  @IsOptional()
  @IsString()
  privateMessage?: string;
}
