import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { HistoryService } from './history.service';
import { CreateReservationsDto } from './dto/create-reservations.dto';
import { CreateReservationsForUserDto } from './dto/create-reservations-for-user.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Session } from 'src/common/session.decorator';
import { Role, User } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { ReservationDto } from './dto/reservation.dto';
import { BusyReservationResponse } from './dto/ busy-reservation.dto';
import { ReservationHistoryDto } from './dto/reservation-history.dto';


@ApiTags('reservations')
@ApiBearerAuth('access-token') 
@UseGuards(AuthGuard('jwt'))
@Controller('reservations')
export class ReservationsController {
  constructor(
    private reservationsService: ReservationsService,
    private historyService: HistoryService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create multiple reservations for current user' })
  @ApiBody({ type: CreateReservationsDto })
  @ApiResponse({ status: 201, description: 'Reservations created' })
  async create(
    @Body() dto: CreateReservationsDto, 
    @Session() session: User
  ) {
    return this.reservationsService.createReservations(session.id, dto);
  }

  @Post('for-user')
  @ApiOperation({ 
    summary: 'Create multiple reservations for a selected user', 
    description: 'Allows admins, managers, and instructors to create multiple reservations for any user. Requires ADMIN, MANAGER, or INSTRUCTOR role.'
  })
  @ApiBody({ type: CreateReservationsForUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Reservations created successfully for the selected user',
    type: [ReservationDto]
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Only admins, managers, and instructors can create reservations for other users' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found or instructor not available at specified times' 
  })
  async createForUser(
    @Body() dto: CreateReservationsForUserDto, 
    @Session() session: User
  ) {
    if (session.role !== Role.ADMIN && session.role !== Role.MANAGER && session.role !== Role.INSTRUCTOR) {
      throw new ForbiddenException("Only admins, managers, and instructors can create reservations for other users");
    }
    
    return this.reservationsService.createReservationsForUser(dto.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user reservations' })
  @ApiResponse({ status: 200, description: 'List of reservations for current user' })
  async getMine(@Session() session: User) {
    return this.reservationsService.getReservationsByUserId(session.id);
  }

  @Get('instructor')
  @ApiOperation({ summary: 'Get current instructor reservations' })
  @ApiResponse({ status: 200, description: 'List of reservations for current instructor' })
  async getMineForInstructor(@Session() session: User) {
    if (session.role !== Role.INSTRUCTOR) throw new ForbiddenException("This user is not instructor");
    return this.reservationsService.getReservationsByInstructorId(session.id);
  }

  @Get('busy-reservation')
  @ApiResponse({ status: 200})
  async getBusyReservations(
    @Query('days') days: string,
    @Query('gearbox') gearbox: string,
    @Query('sector') sector: string,
    @Query('type') type: "single" | "group",
  ): Promise<BusyReservationResponse | null> {
    const minFreeDays = parseInt(days, 10) || 15;
    return await this.reservationsService.findBusyReservation(
      minFreeDays, 
      gearbox, 
      sector, 
      type,
    );
  }

  @Get('busy-reservation/instructor/:instructor_id')
  @ApiResponse({ status: 200})
  async getBusyReservationsForByInstructorId(
    @Param('instructor_id', ParseIntPipe) instructor_id: number,
  ): Promise<BusyReservationResponse | null> {
    if (!instructor_id) {
      throw new BadRequestException("instructor_id cannot be null");
    }
    return await this.reservationsService.findBusyReservationByInstructorId(
      instructor_id,
    );
  }

  @Get('busy-reservation/instructors-group/:instructors_group_id')
  @ApiResponse({ status: 200})
  async getBusyReservationsForByInstructorsGroupId(
    @Param('instructors_group_id', ParseIntPipe) instructors_group_id: number,
  ): Promise<BusyReservationResponse | null> {
    if (!instructors_group_id) {
      throw new BadRequestException("instructors_group_id cannot be null");
    }
    return await this.reservationsService.findBusyReservationByInstructorsGroupId(
      instructors_group_id
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all reservations' })
  @ApiResponse({ status: 200, description: 'List of all reservations' })
  async findAll(
    @Session() session: User
  ) {
    const reservations = await this.reservationsService.findAll();
    return plainToInstance(ReservationDto, reservations, { groups: [session.role] });
  }


  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReservationDto })
  @ApiResponse({ status: 200, description: 'Reservation updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationDto,
    @Session() session: User
  ) {
    return await this.reservationsService.update(id, dto, session.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete reservation" })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Reservation success deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Reservation not found"})
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: User
  ) {
    await this.reservationsService.delete(id, session.id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all reservations for a specific user' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'List of reservations for the user'
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getReservationsByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.reservationsService.getReservationsByUserId(userId);
  }

  @Get('instructor/:instructorId')
  @ApiOperation({ summary: 'Get all reservations for a specific instructor' })
  @ApiParam({ name: 'instructorId', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'List of reservations for the instructor'
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getReservationsByInstructorId(@Param('userId', ParseIntPipe) instructorId: number) {
    return this.reservationsService.getReservationsByInstructorId(instructorId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get history of changes for a specific reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'History of changes for the reservation'
  })
  async getReservationHistory(@Param('id', ParseIntPipe) id: number): Promise<ReservationHistoryDto[]> {
    return await this.historyService.getReservationHistory(id);
  }

  @Get('history/user/:userId')
  @ApiOperation({ summary: 'Get reservation history for a specific user' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Reservation history for the user'
  })
  async getUserReservationHistory(@Param('userId', ParseIntPipe) userId: number): Promise<ReservationHistoryDto[]> {
    return this.historyService.getUserReservationHistory(userId);
  }

  @Get('history/instructor/:instructorId')
  @ApiOperation({ summary: 'Get reservation history for a specific instructor' })
  @ApiParam({ name: 'instructorId', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'Reservation history for the instructor'
  })
  async getInstructorReservationHistory(@Param('instructorId', ParseIntPipe) instructorId: number): Promise<ReservationHistoryDto[]> {
    return this.historyService.getInstructorReservationHistory(instructorId);
  }

  @Get('history/my')
  @ApiOperation({ summary: 'Get current user reservation history' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current user reservation history'
  })
  async getMyReservationHistory(@Session() session: User): Promise<ReservationHistoryDto[]> {
    return this.historyService.getUserReservationHistory(session.id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reservation confirmed' })
  async confirmReservation(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: User
  ) {
    return await this.reservationsService.confirmReservation(id, session.id);
  }

  @Patch(':id/unconfirm')
  @ApiOperation({ summary: 'Unconfirm a reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reservation unconfirmed' })
  async unconfirmReservation(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: User
  ) {
    return await this.reservationsService.unconfirmReservation(id, session.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  async cancelReservation(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: User
  ) {
    return await this.reservationsService.cancelReservation(id, session.id);
  }

  @Patch(':id/uncancel')
  @ApiOperation({ summary: 'Uncancel a reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Reservation uncancelled' })
  async uncancelReservation(
    @Param('id', ParseIntPipe) id: number,
    @Session() session: User
  ) {
    return await this.reservationsService.uncancelReservation(id, session.id);
  }
}
