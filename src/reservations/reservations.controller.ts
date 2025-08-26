import {
  Body,
  Controller,
  Delete,
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
import { User } from '@prisma/client';
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
    return this.reservationsService.getUserReservations(session.id);
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
    return await this.reservationsService.findBusyReservation(minFreeDays, gearbox, sector, type);
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
  async getReservationsByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.reservationsService.getReservationsByUser(userId);
  }
}
