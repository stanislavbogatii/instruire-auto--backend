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
import { CreateReservationsDto } from './dto/create-reservations.dto';
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
import { group } from 'console';
import { ReservationDto } from './dto/reservation.dto';
import { BusyReservationResponse } from './dto/ busy-reservation.dto';

@ApiTags('reservations')
@ApiBearerAuth('access-token') 
@UseGuards(AuthGuard('jwt'))
@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

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
  ) {
    return await this.reservationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete reservation" })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Reservation success deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Reservation not found"})
  async delete(
    @Param('id', ParseIntPipe) id: number
  ) {
    await this.reservationsService.delete(id);
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
}
