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
} from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { Session } from 'src/common/session.decorator';
import { Role, User } from '@prisma/client';
import { InstructorBlackoutResponseDto } from './dto/instructor-blackout-response.dto';
import { AddBlackoutsDto } from './dto/add-blackouts.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UpdateInstructorBlackoutDto } from './dto/update-instructor-blackout.dto';
import { SetSectorScheduleDto } from './dto/sector-schedule.dto';

@ApiTags('instructors')
@ApiBearerAuth('access-token') 
@UseGuards(AuthGuard('jwt'))
@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new instructor' })
  @ApiResponse({ status: 201, description: 'Instructor created.' })
  async create(@Body() dto: CreateInstructorDto) {
    return this.instructorsService.create(dto);
  }

  @Post('blackouts')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Add blackouts for an instructor' })
  @ApiResponse({ status: 201, description: 'Blackouts added.' })
  async addBlackouts(@Body() dto: AddBlackoutsDto) {
    await this.instructorsService.addBlackouts(dto.blackouts);
    return { message: 'Blackouts added successfully' };
  }

  @Get('blackouts/:instructorId')
  @ApiOperation({ summary: 'Get blackouts for an instructor' })
  @ApiParam({ name: 'instructorId', type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of blackouts.', type: [InstructorBlackoutResponseDto] })
  async getBlackoutsByInstructorId(
    @Param('instructorId', ParseIntPipe) instructorId: number, 
    @Session() session: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const blackouts = await this.instructorsService.getBlackoutsByInstructor(instructorId, startDate, endDate);
    return plainToInstance(InstructorBlackoutResponseDto, blackouts, { groups: [session.role] });
  }

  @Get('blackouts')
  @ApiOperation({ summary: 'Get blackouts' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of blackouts.', type: [InstructorBlackoutResponseDto] })
  async getBlackouts(
    @Session() session: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const blackouts = await this.instructorsService.getBlackouts(startDate, endDate);
    return plainToInstance(InstructorBlackoutResponseDto, blackouts, { groups: [session.role] });
  }

  @Delete('blackouts/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a blackout by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Blackout deleted.' })
  async deleteBlackout(@Param('id', ParseIntPipe) id: number) {
    await this.instructorsService.deleteBlackout(id);
  }
  


  @Patch('blackouts/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a blackout by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Blackout updated.' })
  async updateBlackout(id: number, dto: UpdateInstructorBlackoutDto) {
    await this.instructorsService.updateBlackout(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all instructors' })
  async findAll() {
    return await this.instructorsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an instructor by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'The instructor.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.instructorsService.findOne(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an instructor by user ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'The instructor.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  findOneByUserId(@Param('id', ParseIntPipe) id: number) {
    return this.instructorsService.findOneByUserId(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an instructor' })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstructorDto,
  ) {
    return this.instructorsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an instructor' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.instructorsService.remove(id);
  }

  @Get(':id/reservations')
  @ApiOperation({ summary: 'Get upcoming reservations for an instructor' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'List of upcoming reservations.' })
  getUpcomingReservations(@Param('id', ParseIntPipe) id: number) {
    return this.instructorsService.getInstructorReservations(id, false);
  }

  @Get(':id/reservations/completed')
  @ApiOperation({ summary: 'Get completed reservations for an instructor' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'List of completed reservations.' })
  getCompletedReservations(@Param('id', ParseIntPipe) id: number) {
    return this.instructorsService.getInstructorReservations(id, true);
  }

  @Get(':id/sector-schedule')
  @ApiOperation({ summary: 'Get weekly sector schedule for an instructor' })
  @ApiParam({ name: 'id', type: Number })
  getSectorSchedule(@Param('id', ParseIntPipe) id: number) {
    return this.instructorsService.getSectorSchedule(id);
  }

  @Post(':id/sector-schedule')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Set weekly sector schedule for an instructor (replaces/upserts entries)' })
  @ApiParam({ name: 'id', type: Number })
  setSectorSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSectorScheduleDto,
  ) {
    return this.instructorsService.setSectorSchedule(id, dto.schedule);
  }

  @Delete(':id/sector-schedule/:dayOfWeek')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete sector schedule for a specific day (1=Luni...7=Duminica)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'dayOfWeek', type: Number })
  deleteSectorScheduleDay(
    @Param('id', ParseIntPipe) id: number,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
  ) {
    return this.instructorsService.deleteSectorScheduleDay(id, dayOfWeek);
  }
}

