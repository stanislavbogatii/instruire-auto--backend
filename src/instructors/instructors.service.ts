import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';

@Injectable()
export class InstructorsService {
  constructor(private prisma: PrismaService) {}

  async create(createInstructorDto: CreateInstructorDto) {
    const { firstName, lastName, phone, sector } = createInstructorDto;

    // optional: check duplicate phone?
    const exists = await this.prisma.instructor.findFirst({
      where: { phone },
    });
    if (exists) throw new ConflictException('Phone already in use');

    return this.prisma.instructor.create({
      data: {
        firstName,
        lastName,
        phone,
        sector, // Add sector field
      },
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
}
