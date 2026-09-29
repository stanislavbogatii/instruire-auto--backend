import 'reflect-metadata';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/guards/roles.guard';
import { InstructorRatingsController } from './instructor-ratings.controller';

describe('InstructorRatingsController access', () => {
  const readMethods = ['getOverview', 'getMonthlyStats', 'getAnnualStats', 'getAllRatings'];

  it('allows superior instructors on read-only rating endpoints', () => {
    for (const method of readMethods) {
      const roles = Reflect.getMetadata(ROLES_KEY, InstructorRatingsController.prototype[method]);

      expect(roles).toEqual(expect.arrayContaining([Role.ADMIN, Role.MANAGER, Role.INSTRUCTOR]));
    }
  });

  it('does not allow superior instructors to update or delete ratings', () => {
    const deleteRoles = Reflect.getMetadata(
      ROLES_KEY,
      InstructorRatingsController.prototype.deleteRating,
    );
    const updateRoles = Reflect.getMetadata(
      ROLES_KEY,
      InstructorRatingsController.prototype.updateRating,
    );

    expect(deleteRoles).toEqual([Role.ADMIN]);
    expect(updateRoles).toEqual([Role.ADMIN, Role.MANAGER]);
    expect(deleteRoles).not.toContain(Role.INSTRUCTOR);
    expect(updateRoles).not.toContain(Role.INSTRUCTOR);
  });
});
