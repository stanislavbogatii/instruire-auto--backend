import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ReservationItemDto {
  @ApiProperty({ example: '2025-07-20T10:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: 1, description: 'Instructor ID (optional - will be assigned randomly if not provided)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  instructorId?: number;
}

export class CreateReservationsDto {
  @ApiProperty({ type: [ReservationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  reservations: ReservationItemDto[];
}
