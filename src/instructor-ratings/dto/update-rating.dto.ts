import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateRatingDto {
  @ApiProperty({ example: 4, description: 'Rating 1–5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Comentariu actualizat' })
  @IsOptional()
  @IsString()
  comment?: string;
}
