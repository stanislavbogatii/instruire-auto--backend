import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class UpdateInstructorBlackoutDto {
    @ApiProperty({ example: '2025-07-20T10:00:00Z' })
    @IsDateString()
    dateTime: string;
}