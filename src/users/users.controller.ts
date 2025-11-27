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
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetDesiredInstructorDto } from './dto/set-desired-instructor.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Session } from 'src/common/session.decorator';
import { Role, User } from '@prisma/client';
import { UserResponseDto } from './dto/user-response.dto'; // Import the UserResponseDto

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  @ApiBearerAuth('access-token') 
  @UseGuards(AuthGuard('jwt'))
  findAll(@Session() session: User) {  
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'The user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get all users in a group' })
  @ApiParam({ name: 'groupId', type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'List of users in the group',
    type: [UserResponseDto]  // Use the DTO instead of User
  })
  async getUsersByGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.usersService.getUsersByGroup(groupId);
  }

  @Patch('me/desired-instructor')
  @ApiOperation({ summary: 'Set desired instructor for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Desired instructor set successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  async setDesiredInstructor(
    @Session() session: User,
    @Body() dto: SetDesiredInstructorDto
  ) {
    return this.usersService.update(session.id, { desiredInstructorId: dto.desiredInstructorId });
  }
}
