import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class ListInstructorSubstitutionsDto {
  @ApiPropertyOptional({ example: '2026-06-20', description: 'Filtrare după dată exactă (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Data de start a intervalului (inclusiv)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Data de sfârșit a intervalului (inclusiv)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 3, description: 'Filtrare după ID instructor de bază' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  baseInstructorId?: number;

  @ApiPropertyOptional({ example: 7, description: 'Filtrare după ID instructor de schimb' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  substituteInstructorId?: number;

  @ApiPropertyOptional({ example: true, description: 'Filtrare după status activ/inactiv' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
