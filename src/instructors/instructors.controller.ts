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
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { Session } from 'src/common/session.decorator';
import { Role, User } from '@prisma/client';
import { InstructorBlackoutResponseDto } from './dto/instructor-blackout-response.dto';
import { AddBlackoutsDto } from './dto/add-blackouts.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

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
  @ApiResponse({ status: 200, description: 'List of blackouts.', type: [InstructorBlackoutResponseDto] })
  async getBlackouts(@Param('instructorId', ParseIntPipe) instructorId: number, @Session() session: User) {
    const blackouts = await this.instructorsService.getBlackoutsByInstructor(instructorId);
    return plainToInstance(InstructorBlackoutResponseDto, blackouts, { groups: [session.role] });
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
}
