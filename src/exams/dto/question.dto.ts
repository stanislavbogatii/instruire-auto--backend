import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Image URL if exists', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ 
    description: 'Array of possible answers',
    type: [String],
    example: ['Answer 1', 'Answer 2', 'Answer 3']
  })
  @IsArray()
  @IsString({ each: true })
  answers: string[];

  @ApiProperty({ description: 'Index of the correct answer (0-based)' })
  @IsInt()
  @Min(0)
  correctAnswer: number;
}

export class UpdateQuestionDto {
  @ApiProperty({ description: 'Question text', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  text?: string;

  @ApiProperty({ description: 'Image URL if exists', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ 
    description: 'Array of possible answers',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answers?: string[];

  @ApiProperty({ description: 'Index of the correct answer (0-based)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  correctAnswer?: number;
}
