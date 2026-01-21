import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService, 
  ) {}

  /** Create a group with a short unique token */
  async create(dto: CreateGroupDto) {
    await this.prisma.user.findFirst({where: {id: dto.professorId}});
    const token = nanoid(8); 

    try {
      const group = await this.prisma.group.create({
        data: { name: dto.name, token, professorId: dto.professorId },
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

  async update(id: number, dto: UpdateGroupDto) {
    await this.findOne(id);
    
    if (dto.professorId === undefined) {
      throw new BadRequestException('professorId is required');
    }
    
    await this.prisma.user.findFirst({where: {id: dto.professorId}});

    // Prepare update data
    const updateData: any = {
      name: dto.name,
      professorId: dto.professorId,
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

  // ================================
  // PROFESSOR METHODS
  // ================================

  /**
   * Get all students in professor's group
   */
  async getProfessorGroupStudents(professorUserId: number, groupId: number) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, professorId: professorUserId },
      include: {
        users: {
          where: {
            role: 'USER', 
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
          orderBy: {
            lastName: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new BadRequestException('Professor is not assigned to a group');
    }

    return {
      groupId: group.id,
      groupName: group.name,
      studentCount: group.users.length,
      students: group.users,
    };
  }

  /**
   * Get detailed practice progress for a specific student
   * Professor can only view students in their own group
   */
  async getStudentPracticeProgress(
    professorUserId: number,
    studentId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const group = await this.prisma.group.findFirst({
      where: { professorId: professorUserId },
      select: { id: true },
    });

    if (!group) {
      throw new BadRequestException('Professor is not assigned to a group');
    }

    // Verify student exists and is in the same group
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        groupId: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.groupId !== group.id) {
      throw new BadRequestException('Student is not in your group');
    }

    // Get practice statistics
    const skip = (page - 1) * limit;

    const [practiceHistory, totalPractices, practiceStats] = await Promise.all([
      // Get paginated practice history
      this.prisma.studentTicket.findMany({
        where: { userId: studentId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          ticket: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),
      // Total count
      this.prisma.studentTicket.count({
        where: { userId: studentId },
      }),
      // Aggregate statistics
      this.prisma.studentTicket.aggregate({
        where: {
          userId: studentId,
          status: { in: ['COMPLETED', 'PASSED', 'FAILED'] },
        },
        _count: true,
        _avg: {
          score: true,
        },
      }),
    ]);

    // Count by status
    const statusCounts = await this.prisma.studentTicket.groupBy({
      by: ['status'],
      where: { userId: studentId },
      _count: true,
    });

    return {
      student: {
        id: student.id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      statistics: {
        totalPractices: totalPractices,
        completedPractices: practiceStats._count,
        averageScore: practiceStats._avg.score || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      practiceHistory: practiceHistory.map((practice) => ({
        id: practice.id,
        ticketName: practice.ticket.name,
        ticketType: practice.ticket.type,
        status: practice.status,
        score: practice.score,
        totalQuestions: practice.totalQuestions,
        startedAt: practice.startedAt,
        completedAt: practice.completedAt,
        lastQuestionIndex: practice.lastQuestionIndex,
      })),
      pagination: {
        page,
        limit,
        total: totalPractices,
        totalPages: Math.ceil(totalPractices / limit),
      },
    };
  }

  /**
   * Get aggregate overview of all students' practice progress in professor's group
   */
  async getGroupPracticeOverview(professorUserId: number) {
    const groups = await this.prisma.group.findMany({
      where: { professorId: professorUserId },
      select: {
        id: true,
        name: true,
        token: true,
        professorId: true,
        _count: {
          select: {
            users: {
              where: { role: 'USER' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      totalGroups: groups.length,
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        token: group.token,
        professorId: group.professorId,
        studentCount: group._count.users,
      })),
    };
  }

  /**
   * Get all students across professor's groups
   */
  async getProfessorAllGroupStudents(professorUserId: number) {
    const groups = await this.prisma.group.findMany({
      where: { professorId: professorUserId },
      select: {
        id: true,
        users: {
          where: { role: 'USER' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
          orderBy: { lastName: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const students = groups.flatMap((group) =>
      group.users.map((user) => ({
        groupId: group.id,
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        createdAt: user.createdAt,
      })),
    );

    return {
      totalGroups: groups.length,
      totalStudents: students.length,
      students,
    };
  }
}
