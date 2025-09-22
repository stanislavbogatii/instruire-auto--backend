import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PdfService } from './pdf.service';
import { ImageService } from '../common/image.service';
import { 
  CreateExamDto, 
  SubmitAnswerDto, 
  CreateStudentPermissionDto,
  BulkCreateStudentPermissionDto,
  ReactivateStudentDto,
  StartPracticeDto,
  SubmitPracticeAnswerDto
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
    private imageService: ImageService,
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
          data: ticket.questions.map(ticketQuestion => ({
            examId: exam.id,
            questionId: ticketQuestion.question.id,
            order: questionOrder++,
            image: ticketQuestion.question.image, // Copy image from the original question
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
        image: (eq as any).image || eq.question.image, // Prioritize ExamQuestion image, fallback to Question image
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
        ...(submitAnswerDto.image && { image: submitAnswerDto.image }), // Update image if provided
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

  // ================================
  // PRACTICE MODE METHODS
  // ================================

  async startPractice(userId: number, startPracticeDto: StartPracticeDto) {
    const { ticketId } = startPracticeDto;

    // Verify ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        questions: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Practice ticket not found');
    }

    // Check if user already has a practice session for this ticket
    const existingPractice = await this.prisma.studentTicket.findUnique({
      where: {
        userId_ticketId: { userId, ticketId },
      },
      include: {
        answers: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (existingPractice) {
      // Return existing practice session
      return this.getPracticeDetails(existingPractice.id);
    }

    // Create new practice session
    const practiceSession = await this.prisma.$transaction(async (tx) => {
      const session = await tx.studentTicket.create({
        data: {
          userId,
          ticketId,
          status: 'IN_PROGRESS',
          totalQuestions: ticket.questions.length,
          startedAt: new Date(),
          lastQuestionIndex: 0,
        },
      });

      // Create answer placeholders for all questions
      await tx.studentTicketAnswer.createMany({
        data: ticket.questions.map((tq, index) => ({
          studentTicketId: session.id,
          questionId: tq.question.id,
          order: index + 1,
        })),
      });

      return session;
    });

    return this.getPracticeDetails(practiceSession.id);
  }

  async getPracticeDetails(studentTicketId: number) {
    const practice = await this.prisma.studentTicket.findUnique({
      where: { id: studentTicketId },
      include: {
        ticket: true,
        answers: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice session not found');
    }

    return {
      id: practice.id,
      ticketName: practice.ticket.name,
      status: practice.status,
      score: practice.score,
      totalQuestions: practice.totalQuestions,
      lastQuestionIndex: practice.lastQuestionIndex,
      startedAt: practice.startedAt,
      completedAt: practice.completedAt,
      questions: practice.answers.map(answer => ({
        id: answer.question.id,
        text: answer.question.text,
        image: answer.question.image,
        imageUrl: this.imageService.getImageUrl(answer.question.image), // Add full image URL
        answers: JSON.parse(answer.question.answers),
        order: answer.order,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        isAnswered: answer.selectedAnswer !== null,
      })),
    };
  }

  async submitPracticeAnswer(
    userId: number,
    studentTicketId: number,
    submitAnswerDto: SubmitPracticeAnswerDto,
  ) {
    const practice = await this.prisma.studentTicket.findFirst({
      where: {
        id: studentTicketId,
        userId,
        status: 'IN_PROGRESS',
      },
    });

    if (!practice) {
      throw new NotFoundException('Active practice session not found');
    }

    // Find the answer record
    const answerRecord = await this.prisma.studentTicketAnswer.findFirst({
      where: {
        studentTicketId,
        questionId: submitAnswerDto.questionId,
      },
      include: { question: true },
    });

    if (!answerRecord) {
      throw new NotFoundException('Question not found in this practice session');
    }

    // Check if answer is correct
    const isCorrect = answerRecord.question.correctAnswer === submitAnswerDto.selectedAnswer;

    // Update the answer
    await this.prisma.studentTicketAnswer.update({
      where: { id: answerRecord.id },
      data: {
        selectedAnswer: submitAnswerDto.selectedAnswer,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    // Update practice progress
    const answeredCount = await this.prisma.studentTicketAnswer.count({
      where: {
        studentTicketId,
        selectedAnswer: { not: null },
      },
    });

    const updatedPractice = await this.prisma.studentTicket.update({
      where: { id: studentTicketId },
      data: {
        lastQuestionIndex: Math.max(practice.lastQuestionIndex || 0, answerRecord.order),
      },
    });

    // Check if practice is completed
    if (answeredCount === practice.totalQuestions) {
      await this.completePractice(studentTicketId);
    }

    return {
      isCorrect,
      correctAnswer: answerRecord.question.correctAnswer,
      progress: {
        answered: answeredCount,
        total: practice.totalQuestions,
        isCompleted: answeredCount === practice.totalQuestions,
      },
    };
  }

  async completePractice(studentTicketId: number) {
    // Calculate score
    const correctAnswers = await this.prisma.studentTicketAnswer.count({
      where: {
        studentTicketId,
        isCorrect: true,
      },
    });

    const practice = await this.prisma.studentTicket.findUnique({
      where: { id: studentTicketId },
    });

    if (!practice) {
      throw new NotFoundException('Practice session not found');
    }

    // Determine status based on score (assuming 70% pass rate)
    const passThreshold = Math.ceil((practice.totalQuestions || 0) * 0.7);
    const status = correctAnswers >= passThreshold ? 'PASSED' : 'FAILED';

    return this.prisma.studentTicket.update({
      where: { id: studentTicketId },
      data: {
        status,
        score: correctAnswers,
        completedAt: new Date(),
      },
    });
  }

  async getUserPracticeHistory(userId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [practices, total] = await Promise.all([
      this.prisma.studentTicket.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          ticket: true,
        },
      }),
      this.prisma.studentTicket.count({ where: { userId } }),
    ]);

    return {
      data: practices.map(practice => ({
        id: practice.id,
        ticketName: practice.ticket.name,
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
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPracticesByTicket(userId: number, ticketId: number) {
    return this.prisma.studentTicket.findUnique({
      where: {
        userId_ticketId: { userId, ticketId },
      },
      include: {
        ticket: true,
        answers: {
          include: { question: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }
}
