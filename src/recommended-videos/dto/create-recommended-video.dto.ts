import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateRecommendedVideoDto {
  @ApiProperty({ description: 'Titlul videoclipului', example: 'Parcare paralelă - pas cu pas' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Link YouTube', example: 'https://www.youtube.com/watch?v=xxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//, {
    message: 'youtubeUrl trebuie să fie un link YouTube valid',
  })
  youtubeUrl: string;
}
