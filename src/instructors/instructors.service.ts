import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { Role } from '@prisma/client';

@Injectable()
export class InstructorsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async create(createInstructorDto: CreateInstructorDto) {
    const { firstName, lastName, phone, email, password, sector } = createInstructorDto;

    // Check if phone is already in use
    const existsPhone = await this.prisma.instructor.findFirst({
      where: { phone },
    });
    if (existsPhone) throw new ConflictException('Phone already in use');

    // Check if email is already in use
    const existsEmail = await this.prisma.user.findFirst({
      where: { email },
    });
    if (existsEmail) throw new ConflictException('Email already in use');

    // Create user account for the instructor
    const user = await this.usersService.create({
      email,
      password,
      firstName,
      lastName,
    }, undefined, Role.INSTRUCTOR);

    return this.prisma.instructor.create({
      data: {
        firstName,
        lastName,
        phone,
        sector,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      }
    });
  }

  async findAll(includeInactive = false) {
    return await this.prisma.instructor.findMany({
      where: includeInactive ? {} : { isActive: true }
    });
  }

  async findOne(id: number) {
    const inst = await this.prisma.instructor.findUnique({ 
      where: { id } 
    });
    if (!inst) throw new NotFoundException(`Instructor ${id} not found`);
    if (!inst.isActive) throw new ConflictException(`Instructor ${id} is inactive`);
    return inst;
  }

  async findOneByUserId(id: number) {
    const inst = await this.prisma.instructor.findUnique({ 
      where: { userId: id } 
    });
    if (!inst) throw new NotFoundException(`Instructor with userId: ${id} not found`);
    if (!inst.isActive) throw new ConflictException(`Instructor ${id} is inactive`);
    return inst;
  }
  
  async findOneWithInactive(id: number) {
    const inst = await this.prisma.instructor.findUnique({ where: { id } });
    if (!inst) throw new NotFoundException(`Instructor ${id} not found`);
    return inst;
  }

  async update(id: number, updateInstructorDto: UpdateInstructorDto) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id },
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor #${id} not found`);
    }

    return this.prisma.instructor.update({
      where: { id },
      data: {
        firstName: updateInstructorDto.firstName,
        lastName: updateInstructorDto.lastName,
        phone: updateInstructorDto.phone,
        sector: updateInstructorDto.sector, // Add sector field
      },
    });
  }

  async remove(id: number) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id },
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor #${id} not found`);
    }
    return this.prisma.instructor.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async reactivate(id: number) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id },
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor #${id} not found`);
    }
    return this.prisma.instructor.update({
      where: { id },
      data: { isActive: true }
    });
  }

  async getInstructorReservations(instructorId: number, completed: boolean = false) {
    const instructor = await this.findOne(instructorId);
    
    const now = new Date();
    
    return this.prisma.reservation.findMany({
      where: {
        instructorId: instructor.id,
        startTime: completed ? { lt: now } : { gte: now }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        }
      },
      orderBy: {
        startTime: completed ? 'desc' : 'asc'
      }
    });
  }
}
