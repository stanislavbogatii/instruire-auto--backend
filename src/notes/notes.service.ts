import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        title: dto.title,
        content: dto.content,
        date: dto.date ? new Date(dto.date) : new Date(),
        userId: userId,
      },
    });

    return note;
  }

  async findAll() {
    const notes = await this.prisma.note.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notes;
  }

  async findByUserId(userId: number) {
    const notes = await this.prisma.note.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notes;
  }

  async findOne(id: number) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException(`Note with id=${id} not found`);
    }

    return note;
  }

  async update(id: number, userId: number, userRole: Role, dto: UpdateNoteDto) {
    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Note with id=${id} not found`);
    }

    // Only the owner or admins/managers can update the note
    if (note.userId !== userId && userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
      throw new ForbiddenException('You do not have permission to update this note');
    }

    const updatedNote = await this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
        ...(dto.date && { date: new Date(dto.date) }),
      },
    });

    return updatedNote;
  }

  async remove(id: number, userId: number, userRole: Role) {
    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException(`Note with id=${id} not found`);
    }

    // Only the owner or admins/managers can delete the note
    if (note.userId !== userId && userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
      throw new ForbiddenException('You do not have permission to delete this note');
    }

    await this.prisma.note.delete({
      where: { id },
    });

    return { message: 'Note deleted successfully' };
  }
}
