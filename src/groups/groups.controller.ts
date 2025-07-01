import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

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
}
