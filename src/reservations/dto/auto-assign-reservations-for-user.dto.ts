import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { AutoAssignReservationsDto } from './auto-assign-reservations.dto';

export class AutoAssignReservationsForUserDto extends AutoAssignReservationsDto {
  @ApiProperty({
    example: 123,
    description: 'User ID to create reservations for',
  })
  @IsNumber()
  @Type(() => Number)
  userId: number;
}
