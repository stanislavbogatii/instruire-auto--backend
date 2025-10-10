import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InstructorBlackoutType } from "@prisma/client";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateInstructorBlackoutDto {
    @ApiProperty({ example: '2025-07-20T10:00:00Z' })
    @IsDateString()
    dateTime: string;

    @ApiPropertyOptional({ example: 'SINGLE', description: 'Type of blackout: SINGLE or REPEAT' })
    @IsString()
    @IsOptional()
    type?: InstructorBlackoutType = InstructorBlackoutType.SINGLE;

    @ApiPropertyOptional({ example: '2025-07-20T10:00:00Z', description: 'Start date-time for REPEAT type' })
    @IsDateString()
    @IsOptional()
    startDateTime?: string;

    @ApiPropertyOptional({ example: '2025-08-20T10:00:00Z', description: 'End date-time for REPEAT type' })
    @IsDateString()
    @IsOptional()
    endDateTime?: string;

    @ApiPropertyOptional({ example: 7, description: 'Repeat every X days for REPEAT type' })
    @IsOptional()
    repeatEveryDays?: number = 0;   
}