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

  async create(dto: CreateInstructorDto) {
    // optional: check duplicate phone?
    const exists = await this.prisma.instructor.findFirst({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Phone already in use');

    return this.prisma.instructor.create({ data: dto });
  }

  findAll() {
    return this.prisma.instructor.findMany();
  }

  async findOne(id: number) {
    const inst = await this.prisma.instructor.findUnique({ where: { id } });
    if (!inst) throw new NotFoundException(`Instructor ${id} not found`);
    return inst;
  }

  async update(id: number, dto: UpdateInstructorDto) {
    await this.findOne(id);
    return this.prisma.instructor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.instructor.delete({ where: { id } });
  }
}
