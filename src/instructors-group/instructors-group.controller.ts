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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { InstructorsGroupService } from './instructors-group.service';
import { CreateInstructorsGroupDto } from './dto/create-instructors-group.dto';
import { UpdateInstructorsGroupDto } from './dto/update-instructors-group.dto';
import { User } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { InstructorBlackoutResponseDto } from 'src/instructors/dto/instructor-blackout-response.dto';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { Session } from 'src/common/session.decorator';

@ApiTags('instructors-group')
@Controller('instructors-group')
export class InstructorsGroupController {
  constructor(
    private readonly instructorsGroupService: InstructorsGroupService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new instructors group' })
  async create(@Body() createInstructorsGroupDto: CreateInstructorsGroupDto) {
    return await this.instructorsGroupService.create(createInstructorsGroupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all instructors groups' })
  async findAll() {
    return await this.instructorsGroupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific instructors group' })
  async findOne(@Param('id') id: string) {
    return await this.instructorsGroupService.findOne(+id);
  }

  @Get('blackouts/:instructorsGroupId')
  @ApiOperation({ summary: 'Get blackouts for an instructors group' })
  @ApiParam({ name: 'instructorsGroupId', type: Number })
  @ApiBearerAuth('access-token') 
  @UseGuards(AuthGuard('jwt'))
  @ApiResponse({
    status: 200,
    description: 'List of blackouts.',
    type: [InstructorBlackoutResponseDto],
  })
  async getBlackouts(
    @Param('instructorsGroupId', ParseIntPipe) instructorsGroupId: number,
    @Session() session: User,
  ) {
    const blackouts = await this.instructorsGroupService.getBlackoutsByInstructorsGroup(instructorsGroupId);
    return plainToInstance(InstructorBlackoutResponseDto, blackouts, {
      groups: [session.role],
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a instructors group' })
  async update(
    @Param('id') id: string,
    @Body() updateInstructorsGroupDto: UpdateInstructorsGroupDto,
  ) {
    return await this.instructorsGroupService.update(
      +id,
      updateInstructorsGroupDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a instructors group' })
  async remove(@Param('id') id: string) {
    return await this.instructorsGroupService.remove(+id);
  }

  @Post(':id/instructors/:instructorId')
  @ApiOperation({ summary: 'Add an instructor to the group' })
  async addInstructor(
    @Param('id') id: string,
    @Param('instructorId') instructorId: string,
  ) {
    return await this.instructorsGroupService.addInstructor(+id, +instructorId);
  }

  @Delete(':id/instructors/:instructorId')
  @ApiOperation({ summary: 'Remove an instructor from the group' })
  async removeInstructor(
    @Param('id') id: string,
    @Param('instructorId') instructorId: string,
  ) {
    return await this.instructorsGroupService.removeInstructor(
      +id,
      +instructorId,
    );
  }

  @Post(':id/swap-instructor/:oldInstructorId/:newInstructorId')
  @ApiOperation({ summary: 'Swap an instructor in the group' })
  @ApiResponse({ status: 200, description: 'Instructor successfully swapped' })
  async swapInstructor(
    @Param('id') id: string,
    @Param('oldInstructorId') oldInstructorId: string,
    @Param('newInstructorId') newInstructorId: string,
  ) {
    return await this.instructorsGroupService.swapInstructor(
      +id,
      +oldInstructorId,
      +newInstructorId,
    );
  }
}
