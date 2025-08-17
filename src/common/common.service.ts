import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommonService {
  constructor(private prisma: PrismaService) {}

  async validateActiveInstructor(instructorId: number) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId },
    });
    
    if (!instructor) {
      throw new ConflictException(`Instructor ${instructorId} not found`);
    }
    
    if (!instructor.isActive) {
      throw new ConflictException(`Instructor ${instructorId} is inactive and cannot be assigned. Please choose an active instructor.`);
    }
    
    return instructor;
  }
}
