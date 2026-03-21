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
import { UserContextService } from '../common/user-context.service';
import { parseQuestionText, parseAnswers, Language } from '../common/utils/multilingual.util';
import { 
  CreateExamDto, 
  SubmitAnswerDto, 
  CreateStudentPermissionDto,
  BulkCreateStudentPermissionDto,
  ReactivateStudentDto,
  StartPracticeDto,
  SubmitPracticeAnswerDto,
  StartPracticeByCategoryDto
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
    private userContextService: UserContextService,
  ) {}

  async createStudentPermission(
    user: any, // User object from JWT token
    createPermissionDto: CreateStudentPermissionDto,
  ) {
    // Get the appropriate ID for the user based on their role
    const granterId = createPermissionDto.grantedById || 
                     this.userContextService.getUserContextId(user);
    
    if (!granterId) {
      throw new BadRequestException('Unable to determine granter ID from user context');
    }

    // Check if student exists
    const student = await this.prisma.user.findUnique({
      where: { id: createPermissionDto.userId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Create or update permission using the new flexible schema
    // First try to find existing permission
    const existingPermission = await this.prisma.studentExamPermission.findFirst({
      where: {
        userId: createPermissionDto.userId,
        granterId: granterId,
        granterType: user.role,
      },
    });

    if (existingPermission) {
      // Update existing permission
      return this.prisma.studentExamPermission.update({
        where: { id: existingPermission.id },
        data: {
          isActive: true,
          validUntil: new Date(createPermissionDto.validUntil),
          maxAttempts: createPermissionDto.maxAttempts || 3,
          usedAttempts: 0, // Reset attempts when updating
        },
        include: {
          user: true,
        },
      });
    } else {
      // Create new permission
      return this.prisma.studentExamPermission.create({
        data: {
          userId: createPermissionDto.userId,
          granterId: granterId,
          granterType: user.role,
          instructorId: user.role === 'INSTRUCTOR' ? granterId : undefined, // Only set if granter is an instructor
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
  }

  async bulkCreateStudentPermissions(
    user: any, // User object from JWT token
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
        this.createStudentPermission(user, {
          userId,
          validUntil: bulkCreateDto.validUntil,
          maxAttempts: bulkCreateDto.maxAttempts,
          grantedById: bulkCreateDto.grantedById, // Now using the consistent field name
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

  async createExam(userId: number, createExamDto: CreateExamDto, lang: Language = 'ro') {
    try {
      console.log('=== CREATEEXAM SERVICE DEBUG ===');
      console.log('User ID:', userId);
      console.log('DTO:', createExamDto);
      
      await this.checkStudentCanTakeExam(userId);
      console.log('✅ Student permission check passed');

      // Get student's previous exams to avoid repeating tickets
      const previousExams = await this.prisma.exam.findMany({
        where: { userId },
        include: { examTickets: true },
      });
      console.log('Previous exams count:', previousExams.length);

      const usedTicketIds = previousExams.flatMap(exam => 
        exam.examTickets.map(et => et.ticketId)
      );
      console.log('Used ticket IDs:', usedTicketIds);

      // Get 1 random EXAM-type ticket that hasn't been used before.
      const tickets = await this.ticketsService.getRandomTickets(1, usedTicketIds, 'EXAM');

      if (tickets.length < 1) {
        throw new BadRequestException('Ai parcurs toate biletele de examen disponibile. Încercările de examen au fost epuizate. Contactați administratorul pentru a reseta accesul.');
      }

      // Get current attempt number
      const attemptNumber = previousExams.length + 1;
      console.log('Starting database transaction...');
      console.log(createExamDto.timeLimit)
      return this.prisma.$transaction(async (tx) => {
        // Create exam
        const exam = await tx.exam.create({
          data: {
            userId,
            status: ExamStatus.IN_PROGRESS,
            timeLimit: createExamDto.timeLimit || 30,
            passScore: createExamDto.passScore || 44,
            attemptNumber,
            totalQuestions: tickets.reduce((sum, ticket) => sum + ticket.questions.length, 0),
          },
        });
        console.log('✅ Exam created with ID:', exam.id);

        // Associate tickets with exam
        await tx.examTicket.createMany({
          data: tickets.map(ticket => ({
            examId: exam.id,
            ticketId: ticket.id,
          })),
        });
        console.log('✅ Exam tickets associated');

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
        console.log('✅ Exam questions created');

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
        console.log('✅ Student permissions updated');

        // Get exam details within the same transaction
        const examDetails = await tx.exam.findUnique({
          where: { id: exam.id },
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

        console.log('✅ Exam details fetched from transaction');

        if (!examDetails) {
          throw new Error('Failed to fetch created exam details');
        }

        return {
          ...examDetails,
          questions: examDetails.questions.map(eq => ({
            id: eq.question.id,
            text: parseQuestionText(eq.question.text, lang),
            image: (eq as any).image || eq.question.image,
            answers: parseAnswers(eq.question.answers, lang),
            order: eq.order,
            selectedAnswer: eq.selectedAnswer,
            isAnswered: eq.selectedAnswer !== null,
          })),
        };
      });
    } catch (error) {
      console.log('❌ Error in createExam:', error.message);
      console.log('Error stack:', error.stack);
      throw error;
    }
  }

  async getExamDetails(examId: number, lang: Language = 'ro') {
    console.log('=== GETEXAMDETAILS DEBUG ===');
    console.log('Looking for exam ID:', examId);
    
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

    console.log('Found exam:', exam ? 'YES' : 'NO');
    if (!exam) {
      console.log('❌ Exam not found in database for ID:', examId);
      throw new NotFoundException('Exam not found');
    }
    console.log('✅ Exam found successfully');

    const isFinished = exam.status !== ExamStatus.IN_PROGRESS;

    return {
      ...exam,
      questions: exam.questions.map(eq => ({
        id: eq.question.id,
        text: parseQuestionText(eq.question.text, lang),
        image: (eq as any).image || eq.question.image,
        answers: parseAnswers(eq.question.answers, lang),
        order: eq.order,
        selectedAnswer: eq.selectedAnswer,
        isAnswered: eq.selectedAnswer !== null,
        isCorrect: isFinished ? eq.isCorrect : undefined,
        correctAnswer: isFinished ? eq.question.correctAnswer : undefined,
      })),
    };
  }

  async getCompleteExamForPdf(examId: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            idnp: true, // Add idnp field
          },
        },
        questions: {
          include: {
            question: {
              select: {
                id: true,
                correctAnswer: true, // Include correct answer
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        examTickets: {
          include: {
            ticket: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async submitAnswer(examId: number, userId: number, submitAnswerDto: SubmitAnswerDto) {
    console.log(examId, userId, ExamStatus.IN_PROGRESS);
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        userId,
        status: ExamStatus.IN_PROGRESS,
      },
    });
    console.log(exam);

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

    // Check if exam should be completed:
    // 1. Student reached passScore correct answers (early success)
    // 2. All questions have been answered
    const [answeredQuestions, correctAnswers] = await Promise.all([
      this.prisma.examQuestion.count({
        where: { examId, selectedAnswer: { not: null } },
      }),
      this.prisma.examQuestion.count({
        where: { examId, isCorrect: true },
      }),
    ]);

    if (correctAnswers >= exam.passScore || answeredQuestions === exam.totalQuestions) {
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
    // try {
    //   const pdfBuffer = await this.pdfService.generateExamResultPdf(updatedExam);
    //   await this.mailService.sendExamResultsWithPdf(updatedExam, pdfBuffer);
    // } catch (error) {
    //   console.error('Failed to send exam result email:', error);
    //   // Fallback to sending email without PDF
    //   try {
    //     await this.mailService.sendExamResults(updatedExam);
    //   } catch (fallbackError) {
    //     console.error('Failed to send fallback email:', fallbackError);
    //   }
    // }

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

  async markExamAsFailed(examId: number, userId?: number, reason?: string) {
    // Verify exam exists and is in progress
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { user: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (exam.status !== ExamStatus.IN_PROGRESS) {
      throw new BadRequestException('Can only mark in-progress exams as failed');
    }

    // If userId is provided, verify it matches the exam's user
    if (userId && exam.userId !== userId) {
      throw new ForbiddenException('You can only mark your own exams as failed');
    }

    // Log the reason if provided for audit purposes
    if (reason) {
      console.log(`Exam ${examId} marked as failed by user ${userId}. Reason: ${reason}`);
    }

    // Calculate current score based on answered questions
    const correctAnswers = await this.prisma.examQuestion.count({
      where: {
        examId,
        isCorrect: true,
      },
    });

    const updatedExam = await this.prisma.exam.update({
      where: { id: examId },
      data: {
        status: ExamStatus.FAILED,
        score: correctAnswers,
        completedAt: new Date(),
      },
      include: { user: true },
    });

    // Generate PDF and send email with results
    // try {
    //   const pdfBuffer = await this.pdfService.generateExamResultPdf(updatedExam);
    //   await this.mailService.sendExamResultsWithPdf(updatedExam, pdfBuffer);
    // } catch (error) {
    //   console.error('Failed to send exam result email:', error);
    //   // Fallback to sending email without PDF
    //   try {
    //     await this.mailService.sendExamResults(updatedExam);
    //   } catch (fallbackError) {
    //     console.error('Failed to send fallback email:', fallbackError);
    //   }
    // }

    return updatedExam;
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

  /**
   * Get exam history based on user role - works for INSTRUCTOR, MANAGER, and ADMIN
   */
  async getExamHistoryByRole(user: any, page: number = 1, limit: number = 10) {
    const contextId = this.userContextService.getUserContextId(user);
    
    if (!contextId) {
      throw new ForbiddenException('Unable to determine user context for exam history');
    }

    const skip = (page - 1) * limit;

    // Build query based on user role
    let whereCondition: any;
    
    switch (user.role) {
      case 'INSTRUCTOR':
        // Instructors can use both the legacy instructorId field and the new granterId system
        whereCondition = {
          user: {
            examPermissions: {
              some: {
                OR: [
                  { instructorId: contextId }, // Legacy instructor field
                  { 
                    granterId: contextId,
                    granterType: 'INSTRUCTOR'
                  }
                ]
              },
            },
          },
        };
        break;
        
      case 'MANAGER':
        // Managers see exams for students they granted permissions to
        whereCondition = {
          user: {
            examPermissions: {
              some: { 
                granterId: contextId,
                granterType: 'MANAGER'
              },
            },
          },
        };
        break;
        
      case 'ADMIN':
        // Admins see exams for students they granted permissions to
        whereCondition = {
          user: {
            examPermissions: {
              some: { 
                granterId: contextId,
                granterType: 'ADMIN'
              },
            },
          },
        };
        break;
        
      default:
        throw new ForbiddenException('Role not authorized to view exam history');
    }

    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          },
          examTickets: {
            include: { ticket: true },
          },
        },
      }),
      this.prisma.exam.count({
        where: whereCondition,
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

    const permission = await this.prisma.studentExamPermission.findFirst({
      where: {
        userId: reactivateDto.userId,
        instructorId: instructorId,
        granterType: 'INSTRUCTOR',
      },
    });

    if (!permission) {
      throw new NotFoundException('Student permission not found');
    }

    return this.prisma.studentExamPermission.update({
      where: {
        id: permission.id,
      },
      data: {
        isActive: true,
        validUntil: new Date(reactivateDto.validUntil),
        usedAttempts: reactivateDto.resetAttempts ? 0 : permission.usedAttempts,
        // updatedAt: new Date(),
      },
    });
  }

  /**
   * Reactivate student exam permissions - works for MANAGER and ADMIN roles
   */
  async reactivateStudentByRole(
    user: any,
    reactivateDto: ReactivateStudentDto,
  ) {
    const contextId = this.userContextService.getUserContextId(user);
    
    if (!contextId) {
      throw new ForbiddenException('Unable to determine user context');
    }

    // Verify the user has the appropriate role
    if (!['MANAGER', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only managers and admins can reactivate students');
    }

    // Find the student's exam permission that needs reactivation
    // Look for any permission regardless of who granted it
    const permission = await this.prisma.studentExamPermission.findFirst({
      where: {
        userId: reactivateDto.userId,
        isActive: false, // Only reactivate inactive permissions
      },
      orderBy: {
        updatedAt: 'desc', // Get the most recent permission
      },
    });

    if (!permission) {
      throw new NotFoundException('No inactive exam permission found for this student');
    }

    // Update the permission and record who reactivated it
    return this.prisma.studentExamPermission.update({
      where: {
        id: permission.id,
      },
      data: {
        isActive: true,
        validUntil: new Date(reactivateDto.validUntil),
        usedAttempts: 0, // Reset attempts when reactivating
        updatedAt: new Date(),
        // Note: We could add a reactivatedBy field to track who reactivated it
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExamTimeouts() {
    const expiredExams = await this.prisma.exam.findMany({
      where: {
        status: ExamStatus.IN_PROGRESS,
        startedAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // 60 minutes ago
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

  async startPractice(userId: number, startPracticeDto: StartPracticeDto, lang: Language = 'ro') {
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
      // If practice is completed, delete it and create a new one
      if (existingPractice.status === 'PASSED' || existingPractice.status === 'FAILED') {
        // Delete the completed practice session and all its answers
        await this.prisma.$transaction(async (tx) => {
          await tx.studentTicketAnswer.deleteMany({
            where: { studentTicketId: existingPractice.id },
          });
          await tx.studentTicket.delete({
            where: { id: existingPractice.id },
          });
        });
        
        // Continue to create new practice session below
      } else {
        // Return existing incomplete practice session
        return this.getPracticeDetails(existingPractice.id, lang);
      }
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

    return this.getPracticeDetails(practiceSession.id, lang);
  }

  async getPracticeDetails(studentTicketId: number, lang: Language = 'ro') {
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
        text: parseQuestionText(answer.question.text, lang),
        image: answer.question.image,
        imageUrl: this.imageService.getImageUrl(answer.question.image), // Add full image URL
        answers: parseAnswers(answer.question.answers, lang),
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

  // ================================
  // CATEGORY-BASED PRACTICE METHODS
  // ================================

  async startPracticeByCategory(
    userId: number,
    startPracticeByCategoryDto: StartPracticeByCategoryDto,
    lang: Language = 'ro',
  ) {
    const { categoryId, questionCount = 20 } = startPracticeByCategoryDto;

    // Verify category exists
    const category = await this.prisma.questionCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Get questions from this category
    const questions = await this.prisma.question.findMany({
      where: {
        categoryId,
        ticketQuestions: {
          some: {
            ticket: {
              type: 'PRACTICE',
            },
          },
        },
      },
      take: questionCount,
      orderBy: { id: 'asc' },
    });

    if (questions.length === 0) {
      throw new NotFoundException(
        `No practice questions found for category ${category.nameRo}`,
      );
    }

    // Use a deterministic ticket name per (categoryId, questionCount) — reused across all sessions
    const ticketName = `Category_Practice_${categoryId}_${questionCount}`;

    // Find or create the shared ticket for this category + question count
    let ticket = await this.prisma.ticket.findFirst({
      where: { name: ticketName, type: 'PRACTICE' },
    });

    if (!ticket) {
      const newTicket = await this.prisma.ticket.create({
        data: { name: ticketName, type: 'PRACTICE' },
      });

      await this.prisma.ticketQuestion.createMany({
        data: questions.map((question, index) => ({
          ticketId: newTicket.id,
          questionId: question.id,
          order: index + 1,
        })),
      });

      ticket = newTicket;
    }

    // Check if user already has an in-progress session for this ticket
    const existingPractice = await this.prisma.studentTicket.findUnique({
      where: {
        userId_ticketId: { userId, ticketId: ticket.id },
      },
    });

    if (existingPractice && existingPractice.status === 'IN_PROGRESS') {
      // Return existing in-progress session
      return this.getPracticeDetails(existingPractice.id, lang);
    }

    // Create new practice session
    const practiceSession = await this.prisma.$transaction(async (tx) => {
      const session = await tx.studentTicket.create({
        data: {
          userId,
          ticketId: ticket.id,
          status: 'IN_PROGRESS',
          totalQuestions: questions.length,
          startedAt: new Date(),
          lastQuestionIndex: 0,
        },
      });

      // Create answer placeholders for all questions
      await tx.studentTicketAnswer.createMany({
        data: questions.map((question, index) => ({
          studentTicketId: session.id,
          questionId: question.id,
          order: index + 1,
        })),
      });

      return session;
    });

    return this.getPracticeDetails(practiceSession.id, lang);
  }

  async getCategoryPracticeHistory(
    userId: number,
    categoryId: number,
    page: number = 1,
    limit: number = 10,
    lang: Language = 'ro',
  ) {
    const skip = (page - 1) * limit;

    // Verify category exists
    const category = await this.prisma.questionCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Find all practice sessions where questions belong to this category
    const [practices, total] = await Promise.all([
      this.prisma.studentTicket.findMany({
        where: {
          userId,
          ticket: {
            type: 'PRACTICE',
            questions: {
              some: {
                question: {
                  categoryId,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          ticket: {
            include: {
              questions: {
                include: {
                  question: {
                    include: {
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.studentTicket.count({
        where: {
          userId,
          ticket: {
            type: 'PRACTICE',
            questions: {
              some: {
                question: {
                  categoryId,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: practices.map((practice) => ({
        id: practice.id,
        ticketName: practice.ticket.name,
        categoryName: lang === 'ru' ? category.nameRu : category.nameRo,
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

  // ================================
  // PROFESSOR METHODS
  // ================================

  /**
   * Get detailed practice session for a student (for professors)
   * Professors can only view students in their group
   */
  async getProfessorStudentPracticeDetails(
    professorUserId: number,
    studentId: number,
    practiceId: number,
    lang: Language = 'ro',
  ) {
    // Verify professor and get their group
    const professor = await this.prisma.user.findUnique({
      where: { id: professorUserId },
      select: { groupId: true },
    });

    if (!professor || !professor.groupId) {
      throw new BadRequestException('Professor is not assigned to a group');
    }

    // Verify student is in the same group
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        groupId: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.groupId !== professor.groupId) {
      throw new ForbiddenException('Student is not in your group');
    }

    // Get the practice session
    const practice = await this.prisma.studentTicket.findUnique({
      where: { id: practiceId },
      include: {
        ticket: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        answers: {
          include: {
            question: {
              include: {
                category: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!practice) {
      throw new NotFoundException('Practice session not found');
    }

    // Verify the practice belongs to the student
    if (practice.userId !== studentId) {
      throw new BadRequestException('Practice does not belong to this student');
    }

    return {
      id: practice.id,
      student: practice.user,
      ticketName: practice.ticket.name,
      ticketType: practice.ticket.type,
      status: practice.status,
      score: practice.score,
      totalQuestions: practice.totalQuestions,
      lastQuestionIndex: practice.lastQuestionIndex,
      startedAt: practice.startedAt,
      completedAt: practice.completedAt,
      questions: practice.answers.map((answer) => ({
        id: answer.question.id,
        text: parseQuestionText(answer.question.text, lang),
        image: answer.question.image,
        imageUrl: this.imageService.getImageUrl(answer.question.image),
        answers: parseAnswers(answer.question.answers, lang),
        correctAnswer: answer.question.correctAnswer,
        category: answer.question.category
          ? {
              id: answer.question.category.id,
              name: lang === 'ru' ? answer.question.category.nameRu : answer.question.category.nameRo,
            }
          : null,
        order: answer.order,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        isAnswered: answer.selectedAnswer !== null,
        answeredAt: answer.answeredAt,
      })),
    };
  }
}
