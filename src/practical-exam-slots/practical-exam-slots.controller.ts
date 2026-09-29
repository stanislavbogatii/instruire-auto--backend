import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import { PracticalExamSlotsService } from './practical-exam-slots.service';
import { CreatePracticalExamSlotDto } from './dto/create-practical-exam-slot.dto';
import { UpdatePracticalExamSlotDto } from './dto/update-practical-exam-slot.dto';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { BookForStudentDto } from './dto/book-for-student.dto';
import { BookSlotDto } from './dto/book-slot.dto';
import { UpdatePracticalExamReservationDto } from './dto/update-practical-exam-reservation.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { Session } from 'src/common/session.decorator';
import { Response } from 'express';
import { PdfService } from 'src/exams/pdf.service';
import { PracticalDocumentsQueryDto } from './dto/practical-documents.dto';

@ApiTags('practical-exam-slots')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('practical-exam-slots')
export class PracticalExamSlotsController {
  constructor(
    private readonly service: PracticalExamSlotsService,
    private readonly pdfService: PdfService,
  ) {}

  // ─── Admin/Manager: manage slots ───────────────────────────────────────

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Generate slots from a weekly recurring schedule (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Slots generated.', schema: { example: { created: 12 } } })
  @ApiResponse({ status: 400, description: 'Invalid date range.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  generate(@Body() dto: GenerateSlotsDto) {
    return this.service.generateFromSchedule(dto);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a practical exam slot (Admin/Manager only)' })
  @ApiResponse({ status: 201, description: 'Slot created successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  create(@Body() dto: CreatePracticalExamSlotDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all practical exam slots with reservations ordered by position' })
  @ApiResponse({ status: 200, description: 'List of slots.' })
  findAll() {
    return this.service.findAll();
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available slots for the authenticated student' })
  @ApiResponse({ status: 200, description: 'Available slots.' })
  @ApiResponse({ status: 403, description: 'Student not allowed to book.' })
  @ApiResponse({ status: 409, description: 'Already has a reservation or pending exam.' })
  findAvailable(@Session() session: User) {
    return this.service.findAvailableForStudent(session);
  }

  @Get('my-reservation')
  @ApiOperation({ summary: 'Get the current student active reservation' })
  @ApiResponse({ status: 200, description: 'Active reservation or null.' })
  getMyReservation(@Session() session: User) {
    return this.service.getMyReservation(session.id);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Get the practical exam history for the authenticated student' })
  @ApiResponse({ status: 200, description: 'List of all past and current reservations with slot details.' })
  getMyHistory(@Session() session: User) {
    return this.service.getMyHistory(session.id);
  }

  @Get('admin/reservations')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List all exam reservations with filters (Admin/Manager only)' })
  @ApiQuery({ name: 'date', required: false, description: 'Exact date (ISO 8601)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Range start (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Range end (ISO 8601)' })
  @ApiQuery({ name: 'instructorId', required: false, type: Number })
  @ApiQuery({ name: 'sector', required: false })
  @ApiQuery({ name: 'gearbox', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['SCHEDULED', 'PASSED', 'FAILED', 'ABSENT', 'CANCELLED'] })
  @ApiResponse({ status: 200, description: 'Filtered list of reservations.' })
  listReservations(@Query() query: ListReservationsDto) {
    return this.service.listReservations(query);
  }

  @Get('documents/daily-process-verbal')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Download the daily practical exam process verbal (Admin/Manager only)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Exam date in YYYY-MM-DD format. Defaults to the current day.',
  })
  async downloadDailyProcessVerbal(
    @Query() query: PracticalDocumentsQueryDto,
    @Res() res: Response,
  ) {
    const report = await this.service.getDailyProcessVerbal(query);
    const pdfBuffer = await this.pdfService.generatePracticalDailyProcessVerbalPdf(report);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Proces_Verbal_Practic_${report.date}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }

  @Get('documents/individual/:reservationId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Download an individual practical exam document (Admin/Manager only)',
  })
  @ApiParam({ name: 'reservationId', type: Number })
  async downloadIndividualExamDocument(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Res() res: Response,
  ) {
    const document = await this.service.getIndividualExamDocument(reservationId);
    const pdfBuffer = await this.pdfService.generatePracticalIndividualExamPdf(document);
    const studentName = `${document.user.firstName || ''} ${document.user.lastName || ''}`
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_') || 'Student';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Exam_Practic_${studentName}_${reservationId}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.end(pdfBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a practical exam slot by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'The slot.' })
  @ApiResponse({ status: 404, description: 'Slot not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/reservations')
  @ApiOperation({ summary: 'List active reservations for a slot ordered by positionInCar' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Ordered list of reservations.' })
  @ApiResponse({ status: 404, description: 'Slot not found.' })
  getSlotReservations(@Param('id', ParseIntPipe) id: number) {
    return this.service.getSlotReservations(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a practical exam slot (Admin/Manager only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Slot updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Slot not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePracticalExamSlotDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a practical exam slot (Admin/Manager only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Slot deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Slot not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // ─── Reservations ───────────────────────────────────────────────────────

  @Post(':id/book')
  @ApiOperation({ summary: 'Book a practical exam slot (student)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 201, description: 'Reservation created with positionInCar.' })
  @ApiResponse({ status: 400, description: 'Slot inactive or full.' })
  @ApiResponse({ status: 403, description: 'Not allowed to book.' })
  @ApiResponse({ status: 409, description: 'Already booked, exam already passed, or has pending exam.' })
  book(
    @Param('id', ParseIntPipe) slotId: number,
    @Body() dto: BookSlotDto,
    @Session() session: User,
  ) {
    return this.service.bookSlot(
      session,
      slotId,
      dto.color,
      dto.privateMessage,
    );
  }

  @Post(':id/book-for-student')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Book a slot on behalf of a student (Admin/Manager only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Slot ID' })
  @ApiResponse({ status: 201, description: 'Reservation created.' })
  @ApiResponse({ status: 400, description: 'Slot inactive or full.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Slot or student not found.' })
  @ApiResponse({ status: 409, description: 'Student already booked, exam already passed, or has pending exam.' })
  bookForStudent(
    @Param('id', ParseIntPipe) slotId: number,
    @Body() dto: BookForStudentDto,
  ) {
    return this.service.bookSlotForStudent(
      slotId,
      dto.studentId,
      dto.color,
      dto.privateMessage,
    );
  }

  @Delete('reservations/:reservationId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a reservation permanently (Admin/Manager only)' })
  @ApiParam({ name: 'reservationId', type: Number })
  @ApiResponse({ status: 200, description: 'Reservation deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  deleteReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return this.service.deleteReservation(reservationId);
  }

  @Patch('reservations/:reservationId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.INSTRUCTOR)
  @ApiOperation({
    summary:
      'Editează statusul, culoarea sau nota rezervării (Admin/Manager/Instructor EXAMEN asignat)',
  })
  @ApiParam({ name: 'reservationId', type: Number })
  @ApiResponse({ status: 200, description: 'Reservation updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  updateReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() dto: UpdatePracticalExamReservationDto,
    @Session() session: User,
  ) {
    return this.service.updateReservation(session, reservationId, dto);
  }

  @Patch('reservations/:reservationId/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Set the final result of a reservation (Admin/Manager only)' })
  @ApiParam({ name: 'reservationId', type: Number })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  @ApiResponse({ status: 400, description: 'Already has a final status.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  updateReservationStatus(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() dto: UpdateReservationStatusDto,
    @Session() session: User,
  ) {
    return this.service.updateReservationStatus(session, reservationId, dto);
  }
}
