import 'reflect-metadata';
import { Role, InstructorType } from '@prisma/client';
import { SuperiorInstructorGuard } from './superior-instructor.guard';

describe('SuperiorInstructorGuard', () => {
  const createContext = (user: { id?: number; role?: Role }) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as any;

  it('allows administrators and managers without an instructor lookup', async () => {
    const prisma = {
      instructor: { findUnique: jest.fn() },
    };
    const guard = new SuperiorInstructorGuard(prisma as any);

    await expect(guard.canActivate(createContext({ role: Role.ADMIN }))).resolves.toBe(true);
    await expect(guard.canActivate(createContext({ role: Role.MANAGER }))).resolves.toBe(true);
    expect(prisma.instructor.findUnique).not.toHaveBeenCalled();
  });

  it('allows only instructors with the SUPERIOR instructor type', async () => {
    const prisma = {
      instructor: { findUnique: jest.fn() },
    };
    const guard = new SuperiorInstructorGuard(prisma as any);
    const context = createContext({ id: 42, role: Role.INSTRUCTOR });

    prisma.instructor.findUnique.mockResolvedValueOnce({
      instructorType: InstructorType.SUPERIOR,
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);

    prisma.instructor.findUnique.mockResolvedValueOnce({
      instructorType: InstructorType.BAZA,
    });
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('rejects users without a manager, admin, or superior instructor role', async () => {
    const prisma = {
      instructor: { findUnique: jest.fn() },
    };
    const guard = new SuperiorInstructorGuard(prisma as any);

    await expect(guard.canActivate(createContext({ id: 7, role: Role.USER }))).resolves.toBe(false);
    await expect(guard.canActivate(createContext({ role: Role.INSTRUCTOR }))).resolves.toBe(false);
  });
});
