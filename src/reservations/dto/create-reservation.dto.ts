import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsString } from "class-validator";

export class CreateReservationDto {
    @ApiProperty({ example: '2025-07-20T10:00:00Z' })
    @IsDateString()
    startTime: string;
}