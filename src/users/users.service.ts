import {Injectable, ConflictException, NotFoundException,} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Create a new user, hashing password and stripping hash from return */
  async create(dto: CreateUserDto, groupId?: number) {
    const { email, password } = dto;

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ConflictException('Email already in use');
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { email, hash, groupId },
    });

    const { hash: _, ...rest } = user;
    return rest;
  }

  /** Return all users (sans hash) */
  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Return one user or throw 404 */
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with id=${id} not found`);
    }
    const { hash: _, ...rest } = user;
    return rest;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id=${id} not found`);
    }

    const data: { email?: string; hash?: string } = {};
    // 2) If updating email, check conflict
    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (conflict) {
        throw new ConflictException(
          `Email ${dto.email} is already in use`,
        );
      }
      data.email = dto.email;
    }

    if (dto.password) {
      data.hash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    const { hash: _, ...rest } = updated;
    return rest;
  }

  /** Delete a user or throw 404 */
  async remove(id: number) {
    // Will throw if not found
    const deleted = await this.prisma.user.delete({
      where: { id },
    });
    const { hash: _, ...rest } = deleted;
    return rest;
  }
}
