import { PartialType } from '@nestjs/mapped-types';
import { CreatePracticalExamSlotDto } from './create-practical-exam-slot.dto';

export class UpdatePracticalExamSlotDto extends PartialType(CreatePracticalExamSlotDto) {}
