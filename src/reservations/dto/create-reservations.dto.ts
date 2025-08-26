import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, ValidateNested, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class ReservationItemDto {
  @ApiProperty({ example: '2025-07-20T10:00:00Z' })
  @IsDateString()
  startTime: string;

  // @ApiProperty({ example: 1, description: 'Instructor ID (optional - will be assigned randomly if not provided)', required: false })
  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // instructorId?: number;

  @ApiPropertyOptional({ 
    example: 'Botanica', 
    description: 'Preferred sector for the lesson'
  })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiPropertyOptional({ 
    example: 'Manual', 
    description: 'Preferred gearbox type'
  })
  @IsString()
  @IsOptional()
  gearbox?: string;

  @ApiPropertyOptional({ 
    example: 'Please pick me up from home', 
    description: 'Private message for the instructor'
  })
  @IsString()
  @IsOptional()
  privateMessage?: string;

  @ApiProperty({ 
    example: '#FF5733', 
    description: 'Color for the reservation',
    required: false 
  })
  @IsString()
  @IsOptional()
  color?: string;

  // @ApiPropertyOptional({
  //   example: 1,
  //   description: 'Instructors Group ID'
  // })
  // @IsNumber()
  // @IsOptional()
  // @Type(() => Number)
  // instructorsGroupId?: number;
}

export class CreateReservationsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Instructors Group ID'
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  instructorsGroupId?: number;


  @ApiProperty({ example: 1, description: 'Instructor ID (optional - will be assigned randomly if not provided)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  instructorId?: number;

  @ApiProperty({ type: [ReservationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  reservations: ReservationItemDto[];
}
