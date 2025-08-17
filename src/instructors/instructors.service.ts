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

  async findAll() {
    return await this.prisma.instructor.findMany();
  }

  async findOne(id: number) {
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
    await this.findOne(id);
    return this.prisma.instructor.delete({ where: { id } });
  }
}
