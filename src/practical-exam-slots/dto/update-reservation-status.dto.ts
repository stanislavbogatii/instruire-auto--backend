import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum PracticalExamReservationStatus {
  SCHEDULED = 'SCHEDULED',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  ABSENT = 'ABSENT',
  CANCELLED = 'CANCELLED',
}

export class UpdateReservationStatusDto {
  @ApiProperty({
    enum: PracticalExamReservationStatus,
    example: PracticalExamReservationStatus.PASSED,
    description: 'New status for the reservation (Admin/Manager only for PASSED/FAILED/ABSENT)',
  })
  @IsEnum(PracticalExamReservationStatus)
  status: PracticalExamReservationStatus;
}
