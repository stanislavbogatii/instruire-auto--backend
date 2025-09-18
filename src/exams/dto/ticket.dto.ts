import { IsArray, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket name/identifier' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    description: 'Array of question IDs for this ticket',
    type: [Number]
  })
  @IsArray()
  @IsInt({ each: true })
  questionIds: number[];
}

export class UpdateTicketDto {
  @ApiProperty({ description: 'Ticket name/identifier', required: false })
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ 
    description: 'Array of question IDs for this ticket',
    type: [Number],
    required: false
  })
  @IsArray()
  @IsInt({ each: true })
  questionIds?: number[];
}
