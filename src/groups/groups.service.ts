import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  /** Create a group with a short unique token */
  async create(dto: CreateGroupDto) {
    const token = nanoid(8); // 8-char random ID

    try {
      const group = await this.prisma.group.create({
        data: { name: dto.name, token },
      });
      return group;
    } catch (e: any) {
      if (e.code === 'P2002' && e.meta?.target?.includes('token')) {
        // token collision—unlikely, but retry once
        return this.create(dto);
      }
      throw e;
    }
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
    return this.prisma.group.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  /** Delete group */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.group.delete({ where: { id } });
  }
}
