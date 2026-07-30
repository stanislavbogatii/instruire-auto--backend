import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DocumentReadyDto {
  @ApiProperty({ description: 'ID-ul studentului care trebuie notificat', example: 883 })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiPropertyOptional({ description: 'Mesaj personalizat (opțional)' })
  @IsOptional()
  @IsString()
  message?: string;
}
