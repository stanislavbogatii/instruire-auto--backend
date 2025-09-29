import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class UserContextService {
  /**
   * Get the appropriate ID for the user based on their role
   * This allows flexibility in which ID field to use for different roles
   */
  getUserContextId(user: any): number | null {
    switch (user.role) {
      case Role.INSTRUCTOR:
        return user.instructorProfile?.id || null;
      case Role.MANAGER:
        return user.managerProfile?.id || user.id; // Fallback to user.id for managers
      case Role.ADMIN:
        return user.adminProfile?.id || user.id; // Fallback to user.id for admins
      default:
        return user.id; // Default to user.id for other roles
    }
  }

  /**
   * Get the field name that should be used in the database for this role
   * This helps with dynamic query building
   */
  getContextFieldName(role: Role): string {
    switch (role) {
      case Role.INSTRUCTOR:
        return 'instructorId';
      case Role.MANAGER:
        return 'managerId';
      case Role.ADMIN:
        return 'adminId';
      default:
        return 'userId';
    }
  }

  /**
   * Check if user has permission to perform action on behalf of another user
   */
  canActOnBehalfOf(userRole: Role, targetRole: Role): boolean {
    const roleHierarchy = {
      [Role.ADMIN]: 4,
      [Role.MANAGER]: 3,
      [Role.INSTRUCTOR]: 2,
      [Role.USER]: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[targetRole];
  }
}