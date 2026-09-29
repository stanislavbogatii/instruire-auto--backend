import { InstructorRatingsService } from './instructor-ratings.service';

describe('InstructorRatingsService substitutions', () => {
  const baseInstructor = { id: 10, firstName: 'Base', lastName: 'Instructor' };
  const substituteInstructor = { id: 20, firstName: 'Sub', lastName: 'Instructor' };
  const substitution = {
    id: 7,
    baseInstructorId: 10,
    substituteInstructorId: 20,
    date: new Date('2026-09-10T00:00:00.000Z'),
    isActive: true,
  };

  function createService() {
    const prisma = {
      reservation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      instructorRating: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const substitutionsService = {
      resolveEffectiveInstructor: jest.fn(),
    };

    return {
      service: new InstructorRatingsService(prisma as any, substitutionsService as any),
      prisma,
      substitutionsService,
    };
  }

  it('stores the substitute as instructor and the reservation instructor as baseInstructorId', async () => {
    const { service, prisma, substitutionsService } = createService();
    const reservation = {
      id: 42,
      userId: 5,
      instructorId: baseInstructor.id,
      startTime: new Date('2026-09-09T10:00:00.000Z'),
      instructor: baseInstructor,
    };
    prisma.reservation.findFirst.mockResolvedValue(reservation);
    prisma.instructorRating.findUnique.mockResolvedValue(null);
    substitutionsService.resolveEffectiveInstructor.mockResolvedValue({
      instructorId: substituteInstructor.id,
      effectiveInstructor: substituteInstructor,
      substitution,
    });
    prisma.instructorRating.create.mockResolvedValue({ id: 1 });

    await service.submitRating(5, {
      reservationId: reservation.id,
      rating: 5,
      comment: 'Foarte bine',
    });

    expect(substitutionsService.resolveEffectiveInstructor).toHaveBeenCalledWith(reservation);
    expect(prisma.instructorRating.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instructorId: substituteInstructor.id,
          baseInstructorId: baseInstructor.id,
        }),
      }),
    );
  });

  it('adds effectiveInstructor and substitution to pending reservations', async () => {
    const { service, prisma, substitutionsService } = createService();
    const reservation = {
      id: 42,
      startTime: new Date('2026-09-09T10:00:00.000Z'),
      instructorId: baseInstructor.id,
      instructor: baseInstructor,
    };
    prisma.reservation.findMany.mockResolvedValue([reservation]);
    substitutionsService.resolveEffectiveInstructor.mockResolvedValue({
      instructorId: substituteInstructor.id,
      effectiveInstructor: substituteInstructor,
      substitution,
    });

    const result = await service.getPendingRatings(5);

    expect(result).toEqual([
      {
        ...reservation,
        effectiveInstructor: substituteInstructor,
        substitution,
      },
    ]);
  });

  it('keeps the base instructor when there is no active substitution', async () => {
    const { service, prisma, substitutionsService } = createService();
    const reservation = {
      id: 43,
      startTime: new Date('2026-09-09T10:00:00.000Z'),
      instructorId: baseInstructor.id,
      instructor: baseInstructor,
    };
    prisma.reservation.findMany.mockResolvedValue([reservation]);
    substitutionsService.resolveEffectiveInstructor.mockResolvedValue({
      instructorId: baseInstructor.id,
      effectiveInstructor: baseInstructor,
      substitution: null,
    });

    const result = await service.getPendingRatings(5);

    expect(result[0].effectiveInstructor).toEqual(baseInstructor);
    expect(result[0].substitution).toBeNull();
  });
});
