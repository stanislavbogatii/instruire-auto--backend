import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionCategoryDto {
  @ApiProperty({ description: 'Category name in Romanian' })
  @IsString()
  @IsNotEmpty()
  nameRo: string;

  @ApiProperty({ description: 'Category name in Russian' })
  @IsString()
  @IsNotEmpty()
  nameRu: string;
}

export class UpdateQuestionCategoryDto {
  @ApiProperty({ description: 'Category name in Romanian', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nameRo?: string;

  @ApiProperty({ description: 'Category name in Russian', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nameRu?: string;
}
