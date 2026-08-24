import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Math 101', description: 'Name of the teaching group' })
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 1, description: 'Professor ID' })
  @IsOptional()
  professorId: number;

  @ApiPropertyOptional({ example: 'Botanica', description: 'Sector of the group' })
  @IsOptional()
  @MaxLength(100)
  sector?: string;
}
