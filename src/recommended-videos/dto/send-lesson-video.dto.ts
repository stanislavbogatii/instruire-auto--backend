import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class SendLessonVideoDto {
  @ApiProperty({ description: 'ID-ul rezervării (lecției)', example: 123 })
  @IsInt()
  @IsNotEmpty()
  reservationId: number;

  @ApiProperty({ description: 'ID-ul videoclipului recomandat', example: 4 })
  @IsInt()
  @IsNotEmpty()
  videoId: number;
}
