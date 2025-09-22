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

  /** List all groups */
  findAll() {
    return this.prisma.group.findMany({
      include: {
        instructor: {
          select: {
            sector: true
          }
        }
      }
    });
  }

  /** Get one or 404 */
  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({ 
      where: { id },
      include: {
        instructor: {
          select: {
            sector: true
          }
        }
      }
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async findByToken(token: string) {
    const group = await this.prisma.group.findUnique({
      where: { token },
      include: {
        instructor: {
          select: {
            sector: true
          }
        }
      }
    });
    if (!group) throw new NotFoundException(`Group with token=${token} not found`);
    return group;
  }

  /** Update group (name, instructor, and/or token) */
  async update(id: number, dto: UpdateGroupDto) {
    await this.findOne(id);
    
    if (dto.instructorId === undefined) {
      throw new BadRequestException('instructorId is required');
    }
    
    await this.instructorsService.findOne(dto.instructorId);

    // Prepare update data
    const updateData: any = {
      name: dto.name,
      instructorId: dto.instructorId,
    };

    // If token is provided, validate it's unique
    if (dto.token !== undefined) {
      // Check if token is already taken by another group
      const existingGroup = await this.prisma.group.findUnique({
        where: { token: dto.token },
      });
      
      if (existingGroup && existingGroup.id !== id) {
        throw new ConflictException(`Token '${dto.token}' is already in use by another group`);
      }
      
      updateData.token = dto.token;
    }

    return this.prisma.group.update({
      where: { id },
      data: updateData,
    });
  }

  /** Delete group */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.group.delete({ where: { id } });
  }
}
