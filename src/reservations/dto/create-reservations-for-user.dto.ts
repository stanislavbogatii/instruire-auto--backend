import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateReservationsDto } from './create-reservations.dto';

export class CreateReservationsForUserDto extends CreateReservationsDto {
  @ApiProperty({ 
    example: 123, 
    description: 'User ID to create reservations for' 
  })
  @IsNumber()
  @Type(() => Number)
  userId: number;
}
