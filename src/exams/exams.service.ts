import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PdfService } from './pdf.service';
import { 
  CreateExamDto, 
  SubmitAnswerDto, 
  CreateStudentPermissionDto,
  BulkCreateStudentPermissionDto,
  ReactivateStudentDto
} from './dto/exam.dto';
import { TicketsService } from './tickets.service';
import { Cron, CronExpression } from '@nestjs/schedule';

enum ExamStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
    private mailService: MailService,
    private pdfService: PdfService,
  ) {}

  async createStudentPermission(
    instructorId: number,
    createPermissionDto: CreateStudentPermissionDto,
  ) {
    // Check if student exists
    const student = await this.prisma.user.findUnique({
      where: { id: createPermissionDto.userId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Create or update permission
    return this.prisma.studentExamPermission.upsert({
      where: {
        userId_instructorId: {
          userId: createPermissionDto.userId,
          instructorId,
        },
      },
      update: {
        isActive: true,
        validUntil: new Date(createPermissionDto.validUntil),
        maxAttempts: createPermissionDto.maxAttempts || 3,
        usedAttempts: 0, // Reset attempts when updating
      },
      create: {
        userId: createPermissionDto.userId,
        instructorId,
        isActive: true,
        validUntil: new Date(createPermissionDto.validUntil),
        maxAttempts: createPermissionDto.maxAttempts || 3,
        usedAttempts: 0,
      },
      include: {
        user: true,
      },
    });
  }

  async bulkCreateStudentPermissions(
    instructorId: number,
    bulkCreateDto: BulkCreateStudentPermissionDto,
  ) {
    // Verify all students exist
    const students = await this.prisma.user.findMany({
      where: { id: { in: bulkCreateDto.userIds } },
    });

    if (students.length !== bulkCreateDto.userIds.length) {
      throw new BadRequestException('Some students do not exist');
    }

    const permissions = await Promise.all(
      bulkCreateDto.userIds.map(userId =>
        this.createStudentPermission(instructorId, {
          userId,
          validUntil: bulkCreateDto.validUntil,
          maxAttempts: bulkCreateDto.maxAttempts,
        }),
      ),
    );

    return permissions;
  }

  async getStudentPermissionStatus(userId: number) {
    const permission = await this.prisma.studentExamPermission.findFirst({
      where: {
        userId,
        isActive: true,
        validUntil: { gte: new Date() },
      },
      include: {
        instructor: true,
      },
    });

    if (!permission) {
      return {
        hasPermission: false,
        canTakeExam: false,
        message: 'No active exam permission found',
      };
    }

    const canTakeExam = permission.usedAttempts < permission.maxAttempts;

    return {
      hasPermission: true,
      canTakeExam,
      maxAttempts: permission.maxAttempts,
      usedAttempts: permission.usedAttempts,
      remainingAttempts: permission.maxAttempts - permission.usedAttempts,
      validUntil: permission.validUntil,
      instructor: permission.instructor,
      message: canTakeExam 
        ? 'You can take an exam'
        : 'You have exceeded the maximum number of attempts',
    };
  }

  async checkStudentCanTakeExam(userId: number) {
    const permission = await this.prisma.studentExamPermission.findFirst({
      where: {
        userId,
        isActive: true,
        validUntil: { gte: new Date() },
      },
    });

    if (!permission) {
      throw new ForbiddenException('You do not have permission to take an exam');
    }

    if (permission.usedAttempts >= permission.maxAttempts) {
      throw new ForbiddenException('You have exceeded the maximum number of attempts');
    }

    return permission;
  }

  async createExam(userId: number, createExamDto: CreateExamDto) {
    await this.checkStudentCanTakeExam(userId);

    // Get student's previous exams to avoid repeating tickets
    const previousExams = await this.prisma.exam.findMany({
      where: { userId },
      include: { examTickets: true },
    });

    const usedTicketIds = previousExams.flatMap(exam => 
      exam.examTickets.map(et => et.ticketId)
    );

    // Get 2 random tickets that haven't been used before
    const tickets = await this.ticketsService.getRandomTickets(2, usedTicketIds);

    if (tickets.length < 2) {
      throw new BadRequestException('Not enough available tickets for exam');
    }

    // Get current attempt number
    const attemptNumber = previousExams.length + 1;

    return this.prisma.$transaction(async (tx) => {
      // Create exam
      const exam = await tx.exam.create({
        data: {
          userId,
          status: ExamStatus.IN_PROGRESS,
          timeLimit: createExamDto.timeLimit || 30,
          passScore: createExamDto.passScore || 22,
          attemptNumber,
          totalQuestions: tickets.reduce((sum, ticket) => sum + ticket.questions.length, 0),
        },
      });

      // Associate tickets with exam
      await tx.examTicket.createMany({
        data: tickets.map(ticket => ({
          examId: exam.id,
          ticketId: ticket.id,
        })),
      });

      // Create exam questions from tickets
      let questionOrder = 1;
      for (const ticket of tickets) {
        await tx.examQuestion.createMany({
          data: ticket.questions.map(question => ({
            examId: exam.id,
            questionId: question.id,
            order: questionOrder++,
          })),
        });
      }

      // Update permission attempts
      await tx.studentExamPermission.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          usedAttempts: { increment: 1 },
        },
      });

      return this.getExamDetails(exam.id);
    });
  }

  async getExamDetails(examId: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        user: true,
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return {
      ...exam,
      questions: exam.questions.map(eq => ({
        id: eq.question.id,
        text: eq.question.text,
        image: eq.question.image,
        answers: JSON.parse(eq.question.answers),
        order: eq.order,
        selectedAnswer: eq.selectedAnswer,
        isAnswered: eq.selectedAnswer !== null,
      })),
    };
  }

  async submitAnswer(examId: number, userId: number, submitAnswerDto: SubmitAnswerDto) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        userId,
        status: ExamStatus.IN_PROGRESS,
      },
    });

    if (!exam) {
      throw new NotFoundException('Active exam not found');
    }

    // Check if exam has expired
    const timeElapsed = Date.now() - exam.startedAt.getTime();
    const timeLimit = exam.timeLimit * 60 * 1000; // Convert to milliseconds

    if (timeElapsed > timeLimit) {
      await this.expireExam(examId);
      throw new BadRequestException('Exam time has expired');
    }

    // Find the question in this exam
    const examQuestion = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
        questionId: submitAnswerDto.questionId,
      },
      include: { question: true },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question not found in this exam');
    }

    if (examQuestion.selectedAnswer !== null) {
      throw new BadRequestException('Question already answered');
    }

    // Check if answer is correct
    const isCorrect = examQuestion.question.correctAnswer === submitAnswerDto.selectedAnswer;

    // Update the exam question with the answer
    await this.prisma.examQuestion.update({
      where: { id: examQuestion.id },
      data: {
        selectedAnswer: submitAnswerDto.selectedAnswer,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    // Check if exam is completed
    const answeredQuestions = await this.prisma.examQuestion.count({
      where: {
        examId,
        selectedAnswer: { not: null },
      },
    });

    if (answeredQuestions === exam.totalQuestions) {
      await this.completeExam(examId);
    }

    return {
      isCorrect,
      correctAnswer: examQuestion.question.correctAnswer,
      explanation: examQuestion.question.text, // You can add explanation field to questions if needed
    };
  }

  async completeExam(examId: number) {
    const correctAnswers = await this.prisma.examQuestion.count({
      where: {
        examId,
        isCorrect: true,
      },
    });

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { user: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const status = correctAnswers >= exam.passScore ? ExamStatus.COMPLETED : ExamStatus.FAILED;

    const updatedExam = await this.prisma.exam.update({
      where: { id: examId },
      data: {
        status,
        score: correctAnswers,
        completedAt: new Date(),
      },
      include: { user: true },
    });

    // Generate PDF and send email with results
    try {
      const pdfBuffer = await this.pdfService.generateExamResultPdf(updatedExam);
      await this.mailService.sendExamResultsWithPdf(updatedExam, pdfBuffer);
    } catch (error) {
      console.error('Failed to send exam result email:', error);
      // Fallback to sending email without PDF
      try {
        await this.mailService.sendExamResults(updatedExam);
      } catch (fallbackError) {
        console.error('Failed to send fallback email:', fallbackError);
      }
    }

    return updatedExam;
  }

  async expireExam(examId: number) {
    return this.prisma.exam.update({
      where: { id: examId },
      data: {
        status: ExamStatus.EXPIRED,
        completedAt: new Date(),
      },
    });
  }

  async getStudentExamHistory(userId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          examTickets: {
            include: { ticket: true },
          },
        },
      }),
      this.prisma.exam.count({
        where: { userId },
      }),
    ]);

    return {
      data: exams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInstructorExamHistory(instructorId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Get exams for students who have permission from this instructor
    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({
        where: {
          user: {
            examPermissions: {
              some: { instructorId },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          user: true,
          examTickets: {
            include: { ticket: true },
          },
        },
      }),
      this.prisma.exam.count({
        where: {
          user: {
            examPermissions: {
              some: { instructorId },
            },
          },
        },
      }),
    ]);

    return {
      data: exams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async reactivateStudent(
    instructorId: number,
    managerId: number,
    reactivateDto: ReactivateStudentDto,
  ) {
    // Only managers can reactivate students
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager || manager.role !== 'MANAGER') {
      throw new ForbiddenException('Only managers can reactivate students');
    }

    const permission = await this.prisma.studentExamPermission.findUnique({
      where: {
        userId_instructorId: {
          userId: reactivateDto.userId,
          instructorId,
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Student permission not found');
    }

    return this.prisma.studentExamPermission.update({
      where: {
        userId_instructorId: {
          userId: reactivateDto.userId,
          instructorId,
        },
      },
      data: {
        isActive: true,
        validUntil: new Date(reactivateDto.validUntil),
        usedAttempts: reactivateDto.resetAttempts ? 0 : permission.usedAttempts,
      },
    });
  }

  // Cron job to automatically expire exams that exceed time limit
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExamTimeouts() {
    const expiredExams = await this.prisma.exam.findMany({
      where: {
        status: ExamStatus.IN_PROGRESS,
        startedAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      },
    });

    for (const exam of expiredExams) {
      await this.expireExam(exam.id);
    }
  }
}
