import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsBoolean, IsDateString, IsString } from 'class-validator';

export class FilterReservationsDto {
  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Filter by user ID'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Filter by instructor ID'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  instructorId?: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Filter by instructors group ID'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  instructorsGroupId?: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Filter by car ID'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carId?: number;

  @ApiPropertyOptional({ 
    example: '2025-01-01T00:00:00Z', 
    description: 'Filter by start date (from)'
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({ 
    example: '2025-12-31T23:59:59Z', 
    description: 'Filter by start date (to)'
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({ 
    example: 'Botanica', 
    description: 'Filter by sector'
  })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ 
    example: 'Manual', 
    description: 'Filter by gearbox type'
  })
  @IsOptional()
  @IsString()
  gearbox?: string;

  @ApiPropertyOptional({ 
    example: '#FF5733', 
    description: 'Filter by color'
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by confirmed status'
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isConfirmed?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Filter by cancelled status'
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isCancelled?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by favorite status'
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by important status'
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isImportant?: boolean;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of results to return (default: 100)'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Number of results to skip (default: 0)'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number;

  @ApiPropertyOptional({ 
    example: 'startTime', 
    description: 'Field to sort by (default: startTime)',
    enum: ['startTime', 'createdAt', 'updatedAt']
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ 
    example: 'desc', 
    description: 'Sort order (default: desc)',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
