import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateReservationDto {
    @ApiPropertyOptional({ example: '2025-07-20T10:00:00Z' })
    @IsOptional()
    @IsDateString()
    startTime?: string;

    @ApiPropertyOptional({ example: 1, description: 'Instructor ID' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    instructorId?: number;

    @ApiProperty({ 
      example: 'Botanica', 
      description: 'Preferred sector for the lesson',
      required: false 
    })
    @IsString()
    @IsOptional()
    sector?: string;

    @ApiProperty({ 
      example: 'Manual', 
      description: 'Preferred gearbox type',
      required: false 
    })
    @IsString()
    @IsOptional()
    gearbox?: string;

    @ApiProperty({ 
      example: 'Please pick me up from home', 
      description: 'Private message for the instructor',
      required: false 
    })
    @IsString()
    @IsOptional()
    privateMessage?: string;

    @ApiPropertyOptional({ 
      example: '#FF5733', 
      description: 'Color for the reservation'
    })
    @IsString()
    @IsOptional()
    color?: string;
}
