import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PracticalExamReservationStatus } from './update-reservation-status.dto';

export class UpdatePracticalExamReservationDto {
  @ApiPropertyOptional({
    enum: PracticalExamReservationStatus,
    description: 'Statusul rezervării; poate corecta inclusiv un rezultat final',
  })
  @IsOptional()
  @IsEnum(PracticalExamReservationStatus)
  status?: PracticalExamReservationStatus;

  @ApiPropertyOptional({
    example: '--event-blue',
    description: 'Culoarea rezervării în calendar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @ApiPropertyOptional({
    example: 'Elevul aduce actele în original.',
    description: 'Notă proprie rezervării (nu slotului)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  privateMessage?: string;
}
