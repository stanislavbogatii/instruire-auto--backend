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
  async getProfessorGroupStudents(professorUserId: number) {
    // Find the professor's user record and their group
    const professor = await this.prisma.user.findUnique({
      where: { id: professorUserId },
      include: {
        group: {
          include: {
            users: {
              where: {
                role: 'USER', // Only get students
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
        },
      },
    });

    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    if (!professor.group) {
      throw new BadRequestException('Professor is not assigned to a group');
    }

    return {
      groupId: professor.group.id,
      groupName: professor.group.name,
      studentCount: professor.group.users.length,
      students: professor.group.users,
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
    // Verify professor and get their group
    const professor = await this.prisma.user.findUnique({
      where: { id: professorUserId },
      select: { groupId: true },
    });

    if (!professor || !professor.groupId) {
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

    if (student.groupId !== professor.groupId) {
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
    // Find professor's group
    const professor = await this.prisma.user.findUnique({
      where: { id: professorUserId },
      include: {
        group: {
          include: {
            users: {
              where: { role: 'USER' },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!professor || !professor.group) {
      throw new BadRequestException('Professor is not assigned to a group');
    }

    const studentIds = professor.group.users.map((u) => u.id);

    if (studentIds.length === 0) {
      return {
        groupId: professor.group.id,
        groupName: professor.group.name,
        totalStudents: 0,
        overview: [],
      };
    }

    // Get practice stats for all students
    const studentStats = await Promise.all(
      studentIds.map(async (studentId) => {
        const [student, totalPractices, completedPractices, avgScore] =
          await Promise.all([
            this.prisma.user.findUnique({
              where: { id: studentId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            }),
            this.prisma.studentTicket.count({
              where: { userId: studentId },
            }),
            this.prisma.studentTicket.count({
              where: {
                userId: studentId,
                status: { in: ['COMPLETED', 'PASSED', 'FAILED'] },
              },
            }),
            this.prisma.studentTicket.aggregate({
              where: {
                userId: studentId,
                status: { in: ['COMPLETED', 'PASSED', 'FAILED'] },
              },
              _avg: { score: true },
            }),
          ]);

        return {
          student: student,
          totalPractices,
          completedPractices,
          averageScore: avgScore._avg.score || 0,
        };
      }),
    );

    return {
      groupId: professor.group.id,
      groupName: professor.group.name,
      totalStudents: studentIds.length,
      overview: studentStats.sort((a, b) => {
        const lastNameA = a.student?.lastName || '';
        const lastNameB = b.student?.lastName || '';
        return lastNameA.localeCompare(lastNameB);
      }),
    };
  }
}
