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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ExamsService } from './exams.service';
import { QuestionsService } from './questions.service';
import { TicketsService } from './tickets.service';
import {
  CreateExamDto,
  SubmitAnswerDto,
  CreateStudentPermissionDto,
  BulkCreateStudentPermissionDto,
  ReactivateStudentDto,
  StartPracticeDto,
  SubmitPracticeAnswerDto,
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
  @ApiOperation({ summary: 'Get all tickets with pagination' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  findAllTickets(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.ticketsService.findAll(page, limit);
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

  // Student permissions (Instructor endpoints)
  @Post('permissions/student')
  @ApiOperation({ summary: 'Grant exam permission to a student' })
  createStudentPermission(
    @Request() req,
    @Body() createPermissionDto: CreateStudentPermissionDto,
  ) {
    return this.examsService.createStudentPermission(
      req.user.instructorProfile?.id,
      createPermissionDto,
    );
  }

  @Post('permissions/students/bulk')
  @ApiOperation({ summary: 'Grant exam permission to multiple students' })
  bulkCreateStudentPermissions(
    @Request() req,
    @Body() bulkCreateDto: BulkCreateStudentPermissionDto,
  ) {
    return this.examsService.bulkCreateStudentPermissions(
      req.user.instructorProfile?.id,
      bulkCreateDto,
    );
  }

  // Student exam endpoints
  @Post()
  @ApiOperation({ summary: 'Start a new exam for the current student' })
  createExam(@Request() req, @Body() createExamDto: CreateExamDto) {
    return this.examsService.createExam(req.user.id, createExamDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam details' })
  getExam(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getExamDetails(id);
  }

  @Post(':id/answers')
  @ApiOperation({ summary: 'Submit an answer for a question in the exam' })
  submitAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() submitAnswerDto: SubmitAnswerDto,
  ) {
    return this.examsService.submitAnswer(id, req.user.id, submitAnswerDto);
  }

  // History endpoints
  @Get('history/student')
  @ApiOperation({ summary: 'Get student exam history' })
  getStudentHistory(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.examsService.getStudentExamHistory(req.user.id, page, limit);
  }

  @Get('history/instructor')
  @ApiOperation({ summary: 'Get instructor exam history (all students)' })
  getInstructorHistory(
    @Request() req,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.examsService.getInstructorExamHistory(
      req.user.instructorProfile?.id,
      page,
      limit,
    );
  }

  @Get('permissions/my-status')
  @ApiOperation({ summary: 'Get current user exam permission status' })
  async getMyPermissionStatus(@Request() req) {
    return this.examsService.getStudentPermissionStatus(req.user.id);
  }

  // Manager endpoints
  @Post('reactivate')
  @ApiOperation({ summary: 'Reactivate a student for exams (Manager only)' })
  reactivateStudent(
    @Request() req,
    @Body() reactivateDto: ReactivateStudentDto,
  ) {
    return this.examsService.reactivateStudent(
      req.user.instructorProfile?.id,
      req.user.id,
      reactivateDto,
    );
  }

  // ================================
  // PRACTICE MODE ENDPOINTS
  // ================================

  @Post('practice')
  @ApiOperation({ summary: 'Start or resume practice session for a ticket' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  startPractice(@Request() req, @Body() startPracticeDto: StartPracticeDto) {
    return this.examsService.startPractice(req.user.id, startPracticeDto);
  }

  @Get('practice/:id')
  @ApiOperation({ summary: 'Get practice session details' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  getPracticeDetails(@Param('id', ParseIntPipe) id: number) {
    return this.examsService.getPracticeDetails(id);
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
}
