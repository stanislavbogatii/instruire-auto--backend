import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstructorsGroupDto } from './dto/create-instructors-group.dto';
import { UpdateInstructorsGroupDto } from './dto/update-instructors-group.dto';

@Injectable()
export class InstructorsGroupService {
  constructor(private prisma: PrismaService) {}

  async create(createInstructorsGroupDto: CreateInstructorsGroupDto) {
    return this.prisma.instructorsGroup.create({
      data: createInstructorsGroupDto,
    });
  }

  async findAll() {
    return this.prisma.instructorsGroup.findMany({
      include: {
        instructors: true
      }
    });
  }

  async findOne(id: number) {
    const group = await this.prisma.instructorsGroup.findUnique({
      where: { id },
      include: {
        instructors: true
      }
    });

    if (!group) {
      throw new NotFoundException(`InstructorsGroup with ID ${id} not found`);
    }

    return group;
  }

  async update(id: number, updateInstructorsGroupDto: UpdateInstructorsGroupDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.instructorsGroup.update({
      where: { id },
      data: updateInstructorsGroupDto,
      include: {
        instructors: true
      }
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Check if exists

    return this.prisma.instructorsGroup.delete({
      where: { id }
    });
  }

  async addInstructor(groupId: number, instructorId: number) {
    // Check if instructor exists and is active
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId }
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID ${instructorId} not found`);
    }

    if (!instructor.isActive) {
      throw new BadRequestException(`Instructor with ID ${instructorId} is not active`);
    }

    // Update instructor's group
    return this.prisma.instructor.update({
      where: { id: instructorId },
      data: { instructorsGroupId: groupId }
    });
  }

  async removeInstructor(groupId: number, instructorId: number) {
    const instructor = await this.prisma.instructor.findFirst({
      where: {
        id: instructorId,
        instructorsGroupId: groupId
      }
    });

    if (!instructor) {
      throw new NotFoundException(`Instructor with ID ${instructorId} not found in group ${groupId}`);
    }

    return this.prisma.instructor.update({
      where: { id: instructorId },
      data: { instructorsGroupId: null }
    });
  }

  async swapInstructor(groupId: number, oldInstructorId: number, newInstructorId: number) {
    // Start a transaction to ensure data consistency
    return this.prisma.$transaction(async (prisma) => {
      // Check if both instructors exist and new instructor is active
      const [oldInstructor, newInstructor] = await Promise.all([
        prisma.instructor.findFirst({
          where: {
            id: oldInstructorId,
            instructorsGroupId: groupId
          }
        }),
        prisma.instructor.findUnique({
          where: { id: newInstructorId }
        })
      ]);

      if (!oldInstructor) {
        throw new NotFoundException(`Instructor ${oldInstructorId} not found in group ${groupId}`);
      }

      if (!newInstructor) {
        throw new NotFoundException(`New instructor ${newInstructorId} not found`);
      }

      if (!newInstructor.isActive) {
        throw new BadRequestException(`New instructor ${newInstructorId} is not active`);
      }

      // Update all reservations for this instructor within the group
      await prisma.reservation.updateMany({
        where: {
          instructorId: oldInstructorId,
          instructorsGroupId: groupId
        },
        data: {
          instructorId: newInstructorId
        }
      });

      // Update the instructor assignments
      await Promise.all([
        prisma.instructor.update({
          where: { id: oldInstructorId },
          data: { instructorsGroupId: null }
        }),
        prisma.instructor.update({
          where: { id: newInstructorId },
          data: { instructorsGroupId: groupId }
        })
      ]);

      return { message: 'Instructor swapped successfully' };
    });
  }
}
