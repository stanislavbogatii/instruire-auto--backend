import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsDateString } from 'class-validator';
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
}
