import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class SectorScheduleEntryDto {
  @ApiProperty({ example: 1, description: '1=Luni, 2=Marti, 3=Miercuri, 4=Joi, 5=Vineri, 6=Sambata, 7=Duminica' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({ example: 'Botanica' })
  @IsString()
  sector: string;
}

export class SetSectorScheduleDto {
  @ApiProperty({ type: [SectorScheduleEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectorScheduleEntryDto)
  schedule: SectorScheduleEntryDto[];
}
