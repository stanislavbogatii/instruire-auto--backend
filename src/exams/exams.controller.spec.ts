import 'reflect-metadata';
import { Role } from '@prisma/client';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/guards/roles.guard';
import { ExamsController } from './exams.controller';

describe('ExamsController document endpoints', () => {
  it('exposes daily and individual documents to admin and manager only', () => {
    const dailyMethod = ExamsController.prototype.downloadDailyProcessVerbal;
    const individualMethod = ExamsController.prototype.downloadIndividualExamDocument;

    expect(Reflect.getMetadata(PATH_METADATA, dailyMethod)).toBe('documents/daily-process-verbal');
    expect(Reflect.getMetadata(PATH_METADATA, individualMethod)).toBe('documents/individual/:examId');
    expect(Reflect.getMetadata(ROLES_KEY, dailyMethod)).toEqual([Role.MANAGER, Role.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, individualMethod)).toEqual([Role.MANAGER, Role.ADMIN]);
  });
});
