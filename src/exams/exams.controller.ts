import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  Res,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExamsService } from './exams.service';
import { QuestionsService } from './questions.service';
import { TicketsService } from './tickets.service';
import { PdfService } from './pdf.service';
import { Response } from 'express';
import {
  CreateExamDto,
  SubmitAnswerDto,
  CreateStudentPermissionDto,
  BulkCreateStudentPermissionDto,
  ReactivateStudentDto,
  StartPracticeDto,
  SubmitPracticeAnswerDto,
  LanguageQueryDto,
  StartPracticeByCategoryDto,
} from './dto/exam.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';

@ApiTags('exams')
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly questionsService: QuestionsService,
    private readonly ticketsService: TicketsService,
    private readonly pdfService: PdfService,
  ) {}

  // Questions endpoints
  @Post('questions')
  @ApiOperation({ summary: 'Create a new question' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Get('questions')
  @ApiOperation({ summary: 'Get all questions with pagination' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  findAllQuestions(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.questionsService.findAll(page, limit);
  }

  @Get('questions/:id')
  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  findOneQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.findOne(id);
  }

  @Put('questions/:id')
  @ApiOperation({ summary: 'Update a question' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete('questions/:id')
  @ApiOperation({ summary: 'Delete a question' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  removeQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.remove(id);
  }

  // Tickets endpoints
  @Post('tickets')
  @ApiOperation({ summary: 'Create a new ticket with questions' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  createTicket(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get all tickets with pagination and optional type filtering' })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    enum: ['EXAM', 'PRACTICE'],
    description: 'Filter tickets by type (EXAM or PRACTICE). Defaults to EXAM if not specified.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  findAllTickets(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('type') type?: 'EXAM' | 'PRACTICE',
  ) {
    return this.ticketsService.findAll(page, limit, type);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a ticket by ID with questions' })
  findOneTicket(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Get('tickets/:id/questions')
  @ApiOperation({ summary: 'Get all questions from a ticket' })
  getTicketQuestions(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findTicketQuestions(id);
  }

  @Put('tickets/:id')
  @ApiOperation({ summary: 'Update a ticket' })
  updateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @Delete('tickets/:id')
  @ApiOperation({ summary: 'Delete a ticket' })
  removeTicket(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.remove(id);
  }

  // Student permissions (Multi-role endpoints)
  @Post('permissions/student')
  @ApiOperation({ summary: 'Grant exam permission to a student' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  createStudentPermission(
    @Request() req,
    @Body() createPermissionDto: CreateStudentPermissionDto,
  ) {
    return this.examsService.createStudentPermission(
      req.user,
      createPermissionDto,
    );
  }

  @Post('permissions/students/bulk')
  @ApiOperation({ summary: 'Grant exam permission to multiple students' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  bulkCreateStudentPermissions(
    @Request() req,
    @Body() bulkCreateDto: BulkCreateStudentPermissionDto,
  ) {
    return this.examsService.bulkCreateStudentPermissions(
      req.user,
      bulkCreateDto,
    );
  }

  // Student exam endpoints
  @Post()
  @ApiOperation({ summary: 'Start a new exam for the current student' })
  @ApiQuery({ 
    name: 'lang', 
    required: false, 
    enum: ['ro', 'ru'],
    description: 'Language for questions and answers (ro or ru). Defaults to Romanian.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  createExam(
    @Request() req, 
    @Body() createExamDto: CreateExamDto,
    @Query() query: LanguageQueryDto,
  ) {
    return this.examsService.createExam(req.user.id, createExamDto, query.lang);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam details' })
  @ApiQuery({ 
    name: 'lang', 
    required: false, 
    enum: ['ro', 'ru'],
    description: 'Language for questions and answers (ro or ru). Defaults to Romanian.'
  })
  getExam(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: LanguageQueryDto,
  ) {
    return this.examsService.getExamDetails(id, query.lang);
  }

  @Post(':id/answers')
  @ApiOperation({ summary: 'Submit an answer for a question in the exam' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  submitAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() submitAnswerDto: SubmitAnswerDto,
  ) {
    console.log(id, req.user.id, submitAnswerDto);
    return this.examsService.submitAnswer(id, req.user.id, submitAnswerDto);
  }

  @Post(':id/fail')
  @ApiOperation({ 
    summary: 'Mark an exam as failed', 
    description: 'Allows a student to voluntarily mark their in-progress exam as failed. This will calculate the current score and send result notifications.' 
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  async markExamAsFailed(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() body?: { reason?: string },
  ) {
    return this.examsService.markExamAsFailed(id, req.user.id, body?.reason);
  }

  // History endpoints
  @Get('history/student')
  @ApiOperation({ summary: 'Get student exam history' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  getStudentHistory(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.examsService.getStudentExamHistory(req.user.id, page, limit);
  }

  @Get('history/instructor')
  @ApiOperation({ 
    summary: 'Get exam history for managed students',
    description: 'Available for INSTRUCTOR, MANAGER, and ADMIN roles. Returns exam history for students under their supervision.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.MANAGER, Role.ADMIN)
  getInstructorHistory(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.examsService.getExamHistoryByRole(
      req.user,
      page,
      limit,
    );
  }

  @Get('history/student/:studentId')
  @ApiOperation({ 
    summary: 'Get exam history for a specific student',
    description: 'Available for MANAGER and ADMIN roles. Returns exam history for the specified student by ID.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  getStudentHistoryById(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.examsService.getStudentExamHistory(studentId, page, limit);
  }

  @Get('permissions/my-status')
  @ApiOperation({ summary: 'Get current user exam permission status' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  async getMyPermissionStatus(@Request() req) {
    return this.examsService.getStudentPermissionStatus(req.user.id);
  }

  // Manager endpoints
  @Post('reactivate')
  @ApiOperation({ 
    summary: 'Reactivate a student for exams',
    description: 'Available for MANAGER and ADMIN roles. Allows reactivating exam permissions for students.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  reactivateStudent(
    @Request() req,
    @Body() reactivateDto: ReactivateStudentDto,
  ) {
    return this.examsService.reactivateStudentByRole(
      req.user,
      reactivateDto,
    );
  }

  // ================================
  // PRACTICE MODE ENDPOINTS
  // ================================

  @Post('practice')
  @ApiOperation({ summary: 'Start or resume practice session for a ticket' })
  @ApiQuery({ 
    name: 'lang', 
    required: false, 
    enum: ['ro', 'ru'],
    description: 'Language for questions and answers (ro or ru). Defaults to Romanian.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  startPractice(
    @Request() req, 
    @Body() startPracticeDto: StartPracticeDto,
    @Query() query: LanguageQueryDto,
  ) {
    return this.examsService.startPractice(req.user.id, startPracticeDto, query.lang);
  }

  @Get('practice/:id')
  @ApiOperation({ summary: 'Get practice session details' })
  @ApiQuery({ 
    name: 'lang', 
    required: false, 
    enum: ['ro', 'ru'],
    description: 'Language for questions and answers (ro or ru). Defaults to Romanian.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  getPracticeDetails(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: LanguageQueryDto,
  ) {
    return this.examsService.getPracticeDetails(id, query.lang);
  }

  @Post('practice/:id/answers')
  @ApiOperation({ summary: 'Submit answer for a practice question' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  submitPracticeAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() submitAnswerDto: SubmitPracticeAnswerDto,
  ) {
    return this.examsService.submitPracticeAnswer(req.user.id, id, submitAnswerDto);
  }

  @Get('practice/history/my')
  @ApiOperation({ summary: 'Get my practice history' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  getMyPracticeHistory(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.examsService.getUserPracticeHistory(req.user.id, page, limit);
  }

  @Get('practice/ticket/:ticketId')
  @ApiOperation({ summary: 'Get practice session for specific ticket' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  getPracticeByTicket(
    @Request() req,
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ) {
    return this.examsService.getPracticesByTicket(req.user.id, ticketId);
  }

  // ================================
  // CATEGORY-BASED PRACTICE ENDPOINTS
  // ================================

  @Post('practice/by-category')
  @ApiOperation({ summary: 'Start practice session with questions from a specific category' })
  @ApiQuery({ 
    name: 'lang', 
    required: false, 
    enum: ['ro', 'ru'],
    description: 'Language for questions and answers (ro or ru). Defaults to Romanian.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  startPracticeByCategory(
    @Request() req, 
    @Body() startPracticeByCategoryDto: StartPracticeByCategoryDto,
    @Query() query: LanguageQueryDto,
  ) {
    return this.examsService.startPracticeByCategory(req.user.id, startPracticeByCategoryDto, query.lang);
  }

  @Get('practice/category/:categoryId/history')
  @ApiOperation({ summary: 'Get practice history for a specific category' })
  @ApiQuery({ 
    name: 'lang', 
    required: false, 
    enum: ['ro', 'ru'],
    description: 'Language for category names (ro or ru). Defaults to Romanian.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  getCategoryPracticeHistory(
    @Request() req,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query() query: LanguageQueryDto,
  ) {
    return this.examsService.getCategoryPracticeHistory(req.user.id, categoryId, page, limit, query.lang);
  }

  @Get(':examId/download-pdf')
  @ApiOperation({ 
    summary: 'Download exam results as PDF form',
    description: 'Generate and download exam results as a PDF document using the official exam form template. Only accessible by managers and admins.'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.MANAGER, Role.ADMIN)
  async downloadExamResultsPdf(
    @Param('examId', ParseIntPipe) examId: number,
    @Res() res: Response,
  ) {
    try {
      // Validate examId
      if (!examId || examId <= 0) {
        throw new BadRequestException('Invalid exam ID provided');
      }

      // Fetch exam details with comprehensive error handling
      const exam = await this.examsService.getExamDetails(examId);
      
      if (!exam) {
        throw new NotFoundException(`Exam with ID ${examId} not found`);
      }

      // Validate exam data completeness
      if (!exam.user) {
        throw new BadRequestException('Exam user data is incomplete');
      }

      if (!exam.questions || exam.questions.length === 0) {
        throw new BadRequestException('Exam has no questions data');
      }

      // Ensure exam is completed or failed (not in progress)
      if (exam.status === 'IN_PROGRESS') {
        throw new BadRequestException('Cannot generate PDF for exam still in progress');
      }

      // Fetch the complete exam data with isCorrect information from database
      const completeExam = await this.examsService.getCompleteExamForPdf(examId);

      // Prepare ticket information with question ranges
      const tickets = completeExam.examTickets.map((et, index) => {
        // Calculate question range for each ticket
        const questionsPerTicket = Math.floor(completeExam.totalQuestions / completeExam.examTickets.length);
        const startQuestion = index * questionsPerTicket + 1;
        const endQuestion = index === completeExam.examTickets.length - 1 
          ? completeExam.totalQuestions 
          : (index + 1) * questionsPerTicket;
        
        return {
          name: et.ticket.name,
          startQuestion,
          endQuestion,
        };
      });

      // Prepare exam data for PDF generation
      const examDataForPdf = {
        id: exam.id,
        status: exam.status,
        score: exam.score,
        totalQuestions: exam.totalQuestions,
        passScore: exam.passScore,
        startedAt: exam.startedAt,
        completedAt: exam.completedAt,
        user: {
          firstName: completeExam.user.firstName,
          lastName: completeExam.user.lastName,
          email: completeExam.user.email,
          idnp: (completeExam.user as any).idnp || '', // Get idnp from database
        },
        tickets, // Add ticket information
        questions: completeExam.questions.map(q => ({
          id: q.questionId,
          selectedAnswer: q.selectedAnswer,
          isCorrect: q.isCorrect,
          order: q.order,
          correctAnswer: q.question.correctAnswer, // Include correct answer
        })),
      };

      // Generate PDF with comprehensive error handling
      const pdfBuffer = await this.pdfService.generateExamResultFormPdf(examDataForPdf);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new InternalServerErrorException('Generated PDF is empty or invalid');
      }

      // Generate safe filename
      const studentName = `${exam.user.firstName || ''} ${exam.user.lastName || ''}`.trim() || 'Student';
      const safeStudentName = studentName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
      const examDate = exam.startedAt.toISOString().split('T')[0];
      const filename = `Exam_Results_${safeStudentName}_${examDate}_${examId}.pdf`;

      // Set response headers
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      // Send the PDF
      res.end(pdfBuffer);
    } catch (error) {
      // Log the error for debugging
      console.error(`Error generating PDF for exam ${examId}:`, error);
      
      // Handle different types of errors appropriately
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException ||
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      // For any other unexpected errors
      throw new InternalServerErrorException(
        `Failed to generate exam results PDF: ${error.message || 'Unknown error'}`
      );
    }
  }
}
