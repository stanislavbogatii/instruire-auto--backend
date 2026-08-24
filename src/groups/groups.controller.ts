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
  Request,
  Query,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new teaching group' })
  @ApiResponse({ status: 201, description: 'Group created with token.' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups' })
  @ApiResponse({ status: 200, description: 'Array of groups.' })
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a group by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'The group.' })
  @ApiResponse({ status: 404, description: 'Group not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a group' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Group updated.' })
  @ApiResponse({ status: 404, description: 'Group not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Group deleted.' })
  @ApiResponse({ status: 404, description: 'Group not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.remove(id);
  }

  @Get('manager/:managerId')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List groups assigned to a manager' })
  @ApiParam({ name: 'managerId', type: Number })
  getManagerGroups(@Param('managerId', ParseIntPipe) managerId: number) {
    return this.groupsService.getAssignedGroupsForManager(managerId);
  }

  @Post('manager/:managerId/assign')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign one or more groups to a manager' })
  @ApiParam({ name: 'managerId', type: Number })
  assignGroupsToManager(
    @Param('managerId', ParseIntPipe) managerId: number,
    @Body() body: { groupIds: number[] },
  ) {
    return this.groupsService.assignGroupsToManager(managerId, body.groupIds);
  }

  @Delete('manager/:managerId/group/:groupId')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a manager assignment from a group' })
  @ApiParam({ name: 'managerId', type: Number })
  @ApiParam({ name: 'groupId', type: Number })
  removeGroupFromManager(
    @Param('managerId', ParseIntPipe) managerId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.groupsService.removeGroupFromManager(managerId, groupId);
  }

  // ================================
  // PROFESSOR ENDPOINTS
  // ================================

  @Get('my-group/:groupId/students')
  @ApiOperation({ 
    summary: 'Get students in a professor group (Professor only)',
    description: 'Returns all students in the specified professor group with their basic information'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROFESSOR)
  @ApiParam({ name: 'groupId', type: Number })
  @ApiResponse({ status: 200, description: 'List of students in the group.' })
  @ApiResponse({ status: 403, description: 'User is not a professor or not assigned to a group.' })
  getMyGroupStudents(
    @Request() req,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.groupsService.getProfessorGroupStudents(req.user.id, groupId);
  }

  @Get('my-group/students/:studentId/practice-progress')
  @ApiOperation({ 
    summary: 'Get practice progress for a specific student (Professor only)',
    description: 'Returns detailed practice statistics and history for a student in the professor\'s group'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROFESSOR)
  @ApiParam({ name: 'studentId', type: Number })
  @ApiResponse({ status: 200, description: 'Student practice progress data.' })
  @ApiResponse({ status: 403, description: 'Student not in professor\'s group.' })
  getStudentPracticeProgress(
    @Request() req,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.groupsService.getStudentPracticeProgress(req.user.id, studentId, page, limit);
  }

  @Get('my-group/overview')
  @ApiOperation({ 
    summary: 'Get group practice overview (Professor only)',
    description: 'Returns aggregate statistics for all students in the professor\'s group'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROFESSOR)
  @ApiResponse({ status: 200, description: 'Group practice overview.' })
  getGroupOverview(@Request() req) {
    return this.groupsService.getGroupPracticeOverview(req.user.id);
  }

  @Get('my-groups/students')
  @ApiOperation({ 
    summary: 'Get all students across professor groups (Professor only)',
    description: 'Returns all students across all groups owned by the professor'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROFESSOR)
  @ApiResponse({ status: 200, description: 'List of students across groups.' })
  getAllGroupStudents(@Request() req) {
    return this.groupsService.getProfessorAllGroupStudents(req.user.id);
  }

  @Get('my-groups/students/practice-progress')
  @ApiOperation({ 
    summary: 'Get practice progress for all students across professor groups (Professor only)',
    description: 'Returns practice progress for each student across all groups owned by the professor'
  })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PROFESSOR)
  @ApiResponse({ status: 200, description: 'Practice progress across all students.' })
  getAllGroupStudentsPracticeProgress(@Request() req) {
    return this.groupsService.getProfessorAllStudentsPracticeProgress(req.user.id);
  }
}
