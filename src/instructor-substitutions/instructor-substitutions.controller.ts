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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InstructorSubstitutionsService } from './instructor-substitutions.service';
import { CreateInstructorSubstitutionDto } from './dto/create-instructor-substitution.dto';
import { UpdateInstructorSubstitutionDto } from './dto/update-instructor-substitution.dto';
import { ListInstructorSubstitutionsDto } from './dto/list-instructor-substitutions.dto';

@ApiTags('instructor-substitutions')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('instructor-substitutions')
export class InstructorSubstitutionsController {
  constructor(private readonly service: InstructorSubstitutionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Setează un instructor de schimb pentru o zi (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Înlocuire creată.' })
  @ApiResponse({ status: 400, description: 'Instructorul de schimb nu are tipul SCHIMB.' })
  @ApiResponse({ status: 404, description: 'Instructor de bază sau de schimb inexistent.' })
  @ApiResponse({ status: 409, description: 'Există deja o înlocuire pentru acea zi.' })
  create(@Body() dto: CreateInstructorSubstitutionDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.INSTRUCTOR)
  @ApiOperation({
    summary:
      'Listează înlocuirile cu filtre opționale (Admin/Manager/Instructor — doar citire pentru instructori)',
  })
  @ApiQuery({ name: 'date', required: false, description: 'Dată exactă (ISO 8601)' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Interval de la (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Interval până la (ISO 8601)' })
  @ApiQuery({ name: 'baseInstructorId', required: false, type: Number })
  @ApiQuery({ name: 'substituteInstructorId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista înlocuirilor.' })
  findAll(@Query() filters: ListInstructorSubstitutionsDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.INSTRUCTOR)
  @ApiOperation({
    summary:
      'Detalii înlocuire după ID (Admin/Manager/Instructor — doar citire pentru instructori)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Înlocuirea.' })
  @ApiResponse({ status: 404, description: 'Înlocuire inexistentă.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Editează sau dezactivează o înlocuire (Admin/Manager)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Înlocuire actualizată.' })
  @ApiResponse({ status: 400, description: 'Noul instructor de schimb nu are tipul SCHIMB.' })
  @ApiResponse({ status: 404, description: 'Înlocuire sau instructor inexistent.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstructorSubstitutionDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Șterge o înlocuire permanent (Admin/Manager)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Înlocuire ștearsă.' })
  @ApiResponse({ status: 404, description: 'Înlocuire inexistentă.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
