import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetDesiredInstructorDto {
  @ApiProperty({ 
    example: 1, 
    description: 'Desired instructor ID for the user'
  })
  @IsInt()
  @Min(1)
  desiredInstructorId: number;
}
