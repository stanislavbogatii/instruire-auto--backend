import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { nanoid } from 'nanoid';
import { InstructorsService } from '../instructors/instructors.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService, private instructorsService: InstructorsService) {}

  /** Create a group with a short unique token */
  async create(dto: CreateGroupDto) {
    await this.instructorsService.findOne(dto.instructorId);
    const token = nanoid(8); // 8-char random ID

    try {
      const group = await this.prisma.group.create({
        data: { name: dto.name, token, instructorId: dto.instructorId },
      });
      return group;
    } catch (e: any) {
      if (e.code === 'P2002' && e.meta?.target?.includes('token')) {
        return this.create(dto);
      }
      throw e;
    }
  }

  async findByToken(token: string) {
    const group = await this.prisma.group.findUnique({
      where: { token },
    });
    if (!group) throw new NotFoundException(`Group with token=${token} not found`);
    return group;
  }

  /** List all groups */
  findAll() {
    return this.prisma.group.findMany();
  }

  /** Get one or 404 */
  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  /** Update name only */
  async update(id: number, dto: UpdateGroupDto) {
    await this.findOne(id);
    if (dto.instructorId === undefined) {
      throw new BadRequestException('instructorId is required');
    }
    await this.instructorsService.findOne(dto.instructorId);
    return this.prisma.group.update({
      where: { id },
      data: { name: dto.name, instructorId: dto.instructorId },
    });
  }

  /** Delete group */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.group.delete({ where: { id } });
  }
}
