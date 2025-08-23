import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateCarDto {
  @ApiProperty({
    description: 'The license plate number of the car',
    example: 'ABC123'
  })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({
    description: "Car gearbox (manual / automat)",
    example: "manual"
  })
  @IsString()
  @IsNotEmpty()
  gearbox: string;

  @ApiPropertyOptional({
    description: 'The ID of the instructor assigned to this car',
    example: 1
  })
  @IsNumber()
  @IsOptional()
  instructorId?: number;
}
