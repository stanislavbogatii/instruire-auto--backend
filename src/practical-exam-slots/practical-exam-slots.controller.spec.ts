import 'reflect-metadata';
import { Role } from '@prisma/client';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/guards/roles.guard';
import { PracticalExamSlotsController } from './practical-exam-slots.controller';

describe('PracticalExamSlotsController document endpoints', () => {
  it('exposes practical documents to admin and manager only', () => {
    const dailyMethod = PracticalExamSlotsController.prototype.downloadDailyProcessVerbal;
    const individualMethod = PracticalExamSlotsController.prototype.downloadIndividualExamDocument;

    expect(Reflect.getMetadata(PATH_METADATA, dailyMethod)).toBe('documents/daily-process-verbal');
    expect(Reflect.getMetadata(PATH_METADATA, individualMethod)).toBe(
      'documents/individual/:reservationId',
    );
    expect(Reflect.getMetadata(ROLES_KEY, dailyMethod)).toEqual([Role.ADMIN, Role.MANAGER]);
    expect(Reflect.getMetadata(ROLES_KEY, individualMethod)).toEqual([Role.ADMIN, Role.MANAGER]);
  });
});
