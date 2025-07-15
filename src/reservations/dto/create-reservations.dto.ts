import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReservationItemDto {
  @ApiProperty({ example: '2025-07-20T10:00:00Z' })
  @IsDateString()
  startTime: string;
}

export class CreateReservationsDto {
  @ApiProperty({ type: [ReservationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  reservations: ReservationItemDto[];
}
