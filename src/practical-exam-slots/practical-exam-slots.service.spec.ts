import { BadRequestException } from '@nestjs/common';
import { PracticalExamSlotsService } from './practical-exam-slots.service';

describe('PracticalExamSlotsService documents', () => {
  function createService() {
    const prisma = {
      practicalExamSlotReservation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    const notificationsService = { create: jest.fn() };
    return {
      service: new PracticalExamSlotsService(prisma as any, notificationsService as any),
      prisma,
    };
  }

  it('builds the daily report from finalized practical reservations in slot order', async () => {
    const { service, prisma } = createService();
    const reservation = {
      id: 17,
      userId: 4,
      positionInCar: 2,
      status: 'PASSED',
      user: {
        id: 4,
        firstName: 'Ion',
        lastName: 'Popescu',
        idnp: '1234567890123',
      },
      slot: {
        id: 9,
        date: new Date('2026-09-23T00:00:00.000Z'),
        time: '09:00',
        sector: 'Botanica',
        gearbox: 'manual',
        instructor: { id: 2, firstName: 'Ana', lastName: 'Ionescu' },
      },
    };
    prisma.practicalExamSlotReservation.findMany
      .mockResolvedValueOnce([reservation])
      .mockResolvedValueOnce([{ id: 17, userId: 4 }]);

    const report = await service.getDailyProcessVerbal({ date: '2026-09-23' });

    expect(report.date).toBe('2026-09-23');
    expect(report.exams).toEqual([
      expect.objectContaining({
        orderNumber: 1,
        examNumber: 17,
        attemptNumber: 1,
        status: 'PASSED',
        positionInCar: 2,
        sector: 'Botanica',
        gearbox: 'manual',
        user: reservation.user,
        instructor: reservation.slot.instructor,
      }),
    ]);
    expect(prisma.practicalExamSlotReservation.findMany).toHaveBeenCalledTimes(2);
  });

  it('returns the individual practical document data with the attempt number', async () => {
    const { service, prisma } = createService();
    const reservation = {
      id: 18,
      userId: 4,
      positionInCar: 1,
      status: 'FAILED',
      user: {
        id: 4,
        firstName: 'Ion',
        lastName: 'Popescu',
        email: 'ion@example.com',
        phone: '+37360000000',
        idnp: '1234567890123',
      },
      slot: {
        date: new Date('2026-09-23T00:00:00.000Z'),
        time: '11:00',
        sector: 'Centru',
        gearbox: 'automatic',
        instructor: { id: 2, firstName: 'Ana', lastName: 'Ionescu' },
      },
    };
    prisma.practicalExamSlotReservation.findUnique.mockResolvedValue(reservation);
    prisma.practicalExamSlotReservation.findMany.mockResolvedValue([
      { id: 12, userId: 4 },
      { id: 18, userId: 4 },
    ]);

    const document = await service.getIndividualExamDocument(18);

    expect(document).toEqual({
      attemptNumber: 2,
      date: reservation.slot.date,
      time: '11:00',
      status: 'FAILED',
      positionInCar: 1,
      sector: 'Centru',
      gearbox: 'automatic',
      instructor: reservation.slot.instructor,
      user: reservation.user,
    });
  });

  it('does not generate an individual document for an unfinished exam', async () => {
    const { service, prisma } = createService();
    prisma.practicalExamSlotReservation.findUnique.mockResolvedValue({
      id: 19,
      status: 'SCHEDULED',
    });

    await expect(service.getIndividualExamDocument(19)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
