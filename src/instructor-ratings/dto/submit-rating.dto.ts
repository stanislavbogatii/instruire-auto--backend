import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitRatingDto {
  @ApiProperty({ example: 42, description: 'ID-ul rezervării pentru care se acordă ratingul' })
  @IsInt()
  reservationId: number;

  @ApiProperty({ example: 5, description: 'Rating 1–5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Instructor foarte bun!', description: 'Comentariu opțional' })
  @IsOptional()
  @IsString()
  comment?: string;
}
