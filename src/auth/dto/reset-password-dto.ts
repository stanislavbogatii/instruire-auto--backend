import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({example: 'resetToken123'})
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: 'strongPassword123', description: 'Plain-text password (min 6 chars)' })
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}