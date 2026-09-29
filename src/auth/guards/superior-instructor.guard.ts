import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InstructorType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperiorInstructorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user;

    if (user?.role === Role.ADMIN || user?.role === Role.MANAGER) {
      return true;
    }

    if (user?.role !== Role.INSTRUCTOR || !user.id) {
      return false;
    }

    const instructor = await this.prisma.instructor.findUnique({
      where: { userId: user.id },
      select: { instructorType: true },
    });

    return instructor?.instructorType === InstructorType.SUPERIOR;
  }
}
