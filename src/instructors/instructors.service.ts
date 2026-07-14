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
import { InstructorBlackoutDto } from './dto/add-blackouts.dto';
import { UpdateInstructorBlackoutDto } from './dto/update-instructor-blackout.dto';

@Injectable()
export class InstructorsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async create(createInstructorDto: CreateInstructorDto) {
    const { firstName, lastName, phone, email, password, sector, order, color, instructorType, isExamen } =
      createInstructorDto;

    const existsPhone = await this.prisma.instructor.findFirst({
      where: { phone },
    });
    if (existsPhone) throw new ConflictException('Phone already in use');

    const existsEmail = await this.prisma.user.findFirst({
      where: { email },
    });
    if (existsEmail) throw new ConflictException('Email already in use');

    const user = await this.usersService.create(
      {
        email,
        phone,
        password,
        role: Role.INSTRUCTOR,
        firstName,
        lastName,
      },
      undefined,
    );

    return this.prisma.instructor.create({
      data: {
        firstName,
        lastName,
        phone,
        sector,
        color,
        order,
        instructorType,
        isExamen,
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
          },
        },
      },
    });
  }

  async findAll(includeInactive = false) {
    return await this.prisma.instructor.findMany({
      where: includeInactive ? {} : { isActive: true },
    });
  }

  async findOne(id: number) {
    const inst = await this.prisma.instructor.findUnique({
      where: { id },
    });
    if (!inst) throw new NotFoundException(`Instructor ${id} not found`);
    if (!inst.isActive)
      throw new ConflictException(`Instructor ${id} is inactive`);
    return inst;
  }

  async findOneByUserId(id: number) {
    const inst = await this.prisma.instructor.findUnique({
      where: { userId: id },
    });
    if (!inst)
      throw new NotFoundException(`Instructor with userId: ${id} not found`);
    if (!inst.isActive)
      throw new ConflictException(`Instructor ${id} is inactive`);
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

    const data: Record<string, unknown> = {};
    if (updateInstructorDto.firstName !== undefined) {
      data.firstName = updateInstructorDto.firstName;
    }
    if (updateInstructorDto.lastName !== undefined) {
      data.lastName = updateInstructorDto.lastName;
    }
    if (updateInstructorDto.phone !== undefined) {
      data.phone = updateInstructorDto.phone;
    }
    if (updateInstructorDto.sector !== undefined) {
      data.sector = updateInstructorDto.sector;
    }
    if (updateInstructorDto.order !== undefined) {
      data.order = updateInstructorDto.order;
    }
    if (updateInstructorDto.color !== undefined) {
      data.color = updateInstructorDto.color;
    }
    if (updateInstructorDto.instructorType !== undefined) {
      data.instructorType = updateInstructorDto.instructorType;
    }
    if (updateInstructorDto.isExamen !== undefined) {
      data.isExamen = updateInstructorDto.isExamen;
    }

    return this.prisma.instructor.update({
      where: { id },
      data,
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
      data: { isActive: false },
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
      data: { isActive: true },
    });
  }

  async getInstructorReservations(
    instructorId: number,
    completed: boolean = false,
  ) {
    const instructor = await this.findOne(instructorId);

    const now = new Date();

    return this.prisma.reservation.findMany({
      where: {
        instructorId: instructor.id,
        startTime: completed ? { lt: now } : { gte: now },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        startTime: completed ? 'desc' : 'asc',
      },
    });
  }

  async getBlackoutsByInstructor(
    instructorId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();
    now.setHours(now.getHours() - 2);
    const start = startDate ? new Date(startDate) : now;
    const end = endDate ? new Date(endDate) : null;

    return this.prisma.instructorBlackout.findMany({
      where: {
        instructorId,
        dateTime: end === null ? { gte: start } : { gte: start, lte: end },
      },
      orderBy: {
        dateTime: 'asc',
      },
    });
  }

  async getBlackouts(
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();
    now.setHours(now.getHours() - 2);
    const start = startDate ? new Date(startDate) : now;
    const end = endDate ? new Date(endDate) : null;

    return this.prisma.instructorBlackout.findMany({
      where: {
        dateTime: end === null ? { gte: start } : { gte: start, lte: end },
      },
      orderBy: {
        dateTime: 'asc',
      },
    });
  }

  async addBlackouts(blackouts: InstructorBlackoutDto[]) {
    for (const blackout of blackouts) {
      const { instructorId, dateTime } = blackout;
      const instructorExists = await this.prisma.instructor.findUnique({
        where: { id: instructorId },
      });
      if (!instructorExists) {
        throw new NotFoundException(
          `Instructor with ID ${instructorId} not found`,
        );
      }
      await this.prisma.instructorBlackout.create({
        data: {
          instructorId,
          dateTime: new Date(dateTime),
        },
      });
    }
  }

  async deleteBlackout(blackoutId: number) {
    const blackout = await this.prisma.instructorBlackout.findUnique({
      where: { id: blackoutId },
    });
    if (!blackout) {
      throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);
    }
    return this.prisma.instructorBlackout.delete({
      where: { id: blackoutId },
    });
  }

  async updateBlackout(blackoutId: number, dto: UpdateInstructorBlackoutDto) {
    const blackout = await this.prisma.instructorBlackout.findUnique({
      where: { id: blackoutId },
    });
    if (!blackout) {
      throw new NotFoundException(`Blackout with ID ${blackoutId} not found`);
    }
    return this.prisma.instructorBlackout.update({
      where: { id: blackoutId },
      data: dto,
    });
  }

  async getSectorSchedule(instructorId: number) {
    const instructor = await this.prisma.instructor.findUnique({ where: { id: instructorId } });
    if (!instructor) throw new NotFoundException(`Instructor ${instructorId} not found`);

    const schedule = await this.prisma.instructorSectorSchedule.findMany({
      where: { instructorId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return { instructorId, schedule };
  }

  async setSectorSchedule(
    instructorId: number,
    entries: { dayOfWeek: number; sector: string }[],
  ) {
    const instructor = await this.prisma.instructor.findUnique({ where: { id: instructorId } });
    if (!instructor) throw new NotFoundException(`Instructor ${instructorId} not found`);

    // Upsert fiecare zi trimisă
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.instructorSectorSchedule.upsert({
          where: { instructorId_dayOfWeek: { instructorId, dayOfWeek: entry.dayOfWeek } },
          create: { instructorId, dayOfWeek: entry.dayOfWeek, sector: entry.sector },
          update: { sector: entry.sector },
        }),
      ),
    );

    return this.getSectorSchedule(instructorId);
  }

  async deleteSectorScheduleDay(instructorId: number, dayOfWeek: number) {
    const existing = await this.prisma.instructorSectorSchedule.findUnique({
      where: { instructorId_dayOfWeek: { instructorId, dayOfWeek } },
    });
    if (!existing) throw new NotFoundException(`No schedule found for instructor ${instructorId} on day ${dayOfWeek}`);

    await this.prisma.instructorSectorSchedule.delete({
      where: { instructorId_dayOfWeek: { instructorId, dayOfWeek } },
    });

    return { message: `Schedule for day ${dayOfWeek} deleted` };
  }
}
