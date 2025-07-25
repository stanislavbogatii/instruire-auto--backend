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
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Session } from 'src/common/session.decorator';
import { User } from '@prisma/client';

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

  @Get('all')
  @ApiOperation({ summary: 'Get all reservations (admin)' })
  @ApiResponse({ status: 200, description: 'List of all reservations' })
  async findAll() {
    return await this.reservationsService.findAll();
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

}
