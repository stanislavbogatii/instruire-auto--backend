import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User, Role } from '@prisma/client';

type UpdatePolicy = 'SELF' | 'ADMIN' | 'MANAGER' | 'PROFESSOR';

const UPDATE_POLICY_FIELDS: Record<UpdatePolicy, (keyof UpdateUserDto)[]> = {
  SELF: [
    'firstName',
    'lastName',
    'phone',
    'idnp',
    'desiredInstructorId',
    'color',
    'medical_documents',
    'individual_work',
    'number_of_absences'
  ],
  ADMIN: [
    'email',
    'password',
    'firstName',
    'lastName',
    'phone',
    'privateMessage',
    'idnp',
    'desiredInstructorId',
    'color',
    'role',
    'medical_documents',
    'individual_work',
    'number_of_absences'
  ],
  MANAGER: [
    'email',
    'firstName',
    'lastName',
    'phone',
    'privateMessage',
    'idnp',
    'desiredInstructorId',
    'color',
    'medical_documents',
    'individual_work',
    'number_of_absences'
  ],
  PROFESSOR: [
    'firstName',
    'lastName',
    'phone',
    'privateMessage',
    'desiredInstructorId',
    'color',
    'medical_documents',
    'individual_work',
    'number_of_absences'
  ],
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private pickAllowedFields<K extends keyof UpdateUserDto>(
    dto: UpdateUserDto,
    allowed: K[],
  ): Pick<UpdateUserDto, K> {
    const filtered = {} as Pick<UpdateUserDto, K>;
    for (const key of allowed) {
      const value = dto[key];
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  private resolveUpdatePolicy(
    actor: User,
    target: { id: number; group?: { professorId: number | null } | null },
  ): UpdatePolicy {
    if (actor.role === Role.ADMIN) return 'ADMIN';
    if (actor.role === Role.MANAGER) return 'MANAGER';
    if (
      actor.role === Role.PROFESSOR &&
      target.group?.professorId === actor.id
    ) {
      return 'PROFESSOR';
    }
    if (actor.id === target.id) return 'SELF';

    throw new ForbiddenException('Not allowed to update this user');
  }

  async create(dto: CreateUserDto, groupId?: number) {
    const { email, password, firstName, lastName, phone, privateMessage, idnp, desiredInstructorId } = dto;  

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ConflictException('Email already in use');
    }
    const role: Role = dto.role || Role.USER; 

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { 
        email,
        hash, 
        firstName,
        lastName,
        phone,     
        privateMessage,
        idnp,
        role,
        groupId,
        desiredInstructorId
      },
    });

    const { hash: _, ...rest } = user;
    return rest;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        privateMessage: true,
        idnp: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        groupId: true,
        desiredInstructorId: true
      }
    });
    return users;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        instructorProfile: true
      }
    });
    if (!user) {
      throw new NotFoundException(`User with id=${id} not found`);
    }
    return user;
  }

  async update(id: number, dto: Partial<UpdateUserDto>) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id=${id} not found`);
    }

    const data: {
      email?: string;
      color?: string;
      hash?: string;
      individual_work?: boolean;
      medical_documents?: boolean;
      number_of_absences?: number;
      phone?: string;
      privateMessage?: string;
      idnp?: string;
      desiredInstructorId?: number;
      firstName?: string;
      lastName?: string;
      role?: Role;
    } = {};
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

    if (dto.color) {
      data.color = dto.color;
    }

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }

    if (dto.privateMessage !== undefined) {
      data.privateMessage = dto.privateMessage;
    }

    if (dto.idnp !== undefined) {
      data.idnp = dto.idnp;
    }

    if (dto.desiredInstructorId !== undefined) {
      data.desiredInstructorId = dto.desiredInstructorId;
    }

    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.medical_documents !== undefined) {
      data.medical_documents = dto.medical_documents;
    }
    if (dto.individual_work !== undefined) {
      data.individual_work = dto.individual_work;
    }
    if (dto.number_of_absences !== undefined) {
      data.number_of_absences = dto.number_of_absences;
    }
    console.log(data)
    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    const { hash: _, ...rest } = updated;
    return rest;
  }

  async updateByActor(actor: User, targetId: number, dto: UpdateUserDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: {
        group: {
          select: { professorId: true },
        },
      },
    });

    if (!target) {
      throw new NotFoundException(`User with id=${targetId} not found`);
    }

    const policy = this.resolveUpdatePolicy(actor, target);
    const allowed = UPDATE_POLICY_FIELDS[policy];
    const filteredDto = this.pickAllowedFields(dto, allowed);

    if (Object.keys(filteredDto).length === 0) {
      throw new ForbiddenException('No editable fields in request');
    }

    return this.update(targetId, filteredDto);
  }

  async remove(id: number) {
    const deleted = await this.prisma.user.delete({
      where: { id },
    });
    const { hash: _, ...rest } = deleted;
    return rest;
  }

  async getUsersByGroup(groupId: number) {
    return this.prisma.user.findMany({
      where: {
        groupId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        color: true,
        role: true,
        groupId: true,
        group: true,
        phone: true,
        privateMessage: true,
        idnp: true,
        createdAt: true,
        updatedAt: true,
        desiredInstructorId: true
      }
    });
  }
}
