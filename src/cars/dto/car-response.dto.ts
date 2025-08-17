import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CarResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the car',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'The license plate number of the car',
    example: 'ABC123'
  })
  plateNumber: string;

  @ApiPropertyOptional({
    description: 'The ID of the instructor assigned to this car',
    example: 1
  })
  instructorId: number | null;

  @ApiProperty({
    description: 'The date and time when the car was created',
    example: '2025-08-17T12:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the car was last updated',
    example: '2025-08-17T12:00:00.000Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'The instructor details if included in the response',
    type: 'object',
    properties: {
      id: { type: 'number', example: 1 },
      firstName: { type: 'string', example: 'John' },
      lastName: { type: 'string', example: 'Doe' },
      phone: { type: 'string', example: '+1234567890' },
      sector: { type: 'string', example: 'North' }
    }
  })
  instructor?: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    sector: string;
  };
}
