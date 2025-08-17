import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateReservationDto {
    @ApiProperty({ example: '2025-07-20T10:00:00Z' })
    @IsDateString()
    startTime: string;

    @ApiProperty({ example: 1, description: 'Instructor ID' })
    @IsNotEmpty()
    instructorId: number;

    @ApiProperty({ 
      example: 'Botanica', 
      description: 'Preferred sector for the lesson',
      required: false 
    })
    @IsString()
    @IsOptional()
    sector?: string;

    @ApiProperty({ 
      example: 'Manual', 
      description: 'Preferred gearbox type',
      required: false 
    })
    @IsString()
    @IsOptional()
    gearbox?: string;

    @ApiProperty({ 
      example: 'Please pick me up from home', 
      description: 'Private message for the instructor',
      required: false 
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
}