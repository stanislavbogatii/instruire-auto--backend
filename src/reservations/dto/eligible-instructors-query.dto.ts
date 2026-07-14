import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EligibleInstructorsQueryDto {
  @ApiProperty({
    example: 'Ciocana',
    description: 'Sector selected by the student',
  })
  @IsString()
  @IsNotEmpty()
  sector: string;

  @ApiProperty({
    example: 'Manual',
    description: 'Gearbox type selected by the student',
  })
  @IsString()
  @IsNotEmpty()
  gearbox: string;
}
