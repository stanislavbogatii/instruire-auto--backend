import { InstructorSubstitutionsService } from './instructor-substitutions.service';

describe('InstructorSubstitutionsService effective instructor', () => {
  it('resolves only an active substitution for the reservation base instructor and day', async () => {
    const substitution = {
      id: 7,
      baseInstructorId: 10,
      substituteInstructorId: 20,
      date: new Date('2026-09-10T00:00:00.000Z'),
      isActive: true,
      substituteInstructor: { id: 20, firstName: 'Sub', lastName: 'Instructor' },
      baseInstructor: { id: 10, firstName: 'Base', lastName: 'Instructor' },
    };
    const prisma = {
      instructorSubstitution: {
        findFirst: jest.fn().mockResolvedValue(substitution),
      },
    };
    const service = new InstructorSubstitutionsService(prisma as any);

    const result = await service.resolveEffectiveInstructor({
      instructorId: 10,
      startTime: new Date('2026-09-10T15:30:00.000Z'),
      instructor: { id: 10, firstName: 'Base', lastName: 'Instructor' },
    });

    expect(prisma.instructorSubstitution.findFirst).toHaveBeenCalledWith({
      where: {
        baseInstructorId: 10,
        date: {
          gte: new Date('2026-09-10T00:00:00.000Z'),
          lt: new Date('2026-09-11T00:00:00.000Z'),
        },
        isActive: true,
      },
      include: {
        baseInstructor: expect.anything(),
        substituteInstructor: expect.anything(),
      },
    });
    expect(result).toEqual({
      instructorId: 20,
      effectiveInstructor: { id: 20, firstName: 'Sub', lastName: 'Instructor' },
      substitution: {
        id: 7,
        baseInstructorId: 10,
        substituteInstructorId: 20,
        date: new Date('2026-09-10T00:00:00.000Z'),
        isActive: true,
      },
    });
  });
});
