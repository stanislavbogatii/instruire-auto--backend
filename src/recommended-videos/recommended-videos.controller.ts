import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { Session } from '../common/session.decorator';
import { RecommendedVideosService } from './recommended-videos.service';
import { CreateRecommendedVideoDto } from './dto/create-recommended-video.dto';
import { UpdateRecommendedVideoDto } from './dto/update-recommended-video.dto';
import { SendLessonVideoDto } from './dto/send-lesson-video.dto';

@ApiTags('recommended-videos')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('recommended-videos')
export class RecommendedVideosController {
  constructor(private readonly service: RecommendedVideosService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Creează un videoclip recomandat (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Videoclip creat cu succes.' })
  @ApiResponse({ status: 400, description: 'Date invalide (titlu lipsă sau link YouTube nevalid).' })
  create(@Body() dto: CreateRecommendedVideoDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista videoclipurilor recomandate, paginată' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Implicit 1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Implicit 50' })
  @ApiResponse({ status: 200, description: 'Listă paginată de videoclipuri, cu numărul de trimiteri per videoclip.' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(page, limit);
  }

  @Get('pending-sends')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({
    summary: 'Lecții trecute fără videoclip trimis (Instructor) — obligații în așteptare',
  })
  @ApiResponse({ status: 200, description: 'Lista lecțiilor trecute, necancelate, pentru care nu a fost trimis încă un videoclip.' })
  getPendingSends(@Session() session: User) {
    return this.service.getPendingSends(session.id);
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(Role.INSTRUCTOR)
  @ApiOperation({
    summary: 'Trimite un videoclip recomandat studentului pentru o lecție (Instructor)',
  })
  @ApiResponse({ status: 201, description: 'Videoclip trimis; studentul este notificat (in-app + WebSocket).' })
  @ApiResponse({
    status: 400,
    description: 'Lecția e anulată sau nu a avut loc încă — videoclipul poate fi trimis doar după lecție.',
  })
  @ApiResponse({ status: 404, description: 'Rezervarea sau videoclipul nu a fost găsit.' })
  @ApiResponse({ status: 409, description: 'Videoclip deja trimis pentru această lecție.' })
  sendVideo(@Session() session: User, @Body() dto: SendLessonVideoDto) {
    return this.service.sendVideo(session.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalii videoclip recomandat' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Videoclipul, cu numărul de trimiteri.' })
  @ApiResponse({ status: 404, description: 'Videoclipul nu a fost găsit.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Actualizează un videoclip recomandat (Admin/Manager)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Videoclip actualizat cu succes.' })
  @ApiResponse({ status: 404, description: 'Videoclipul nu a fost găsit.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecommendedVideoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Șterge un videoclip recomandat (Admin/Manager)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Videoclip șters cu succes.' })
  @ApiResponse({ status: 400, description: 'Videoclipul a fost deja trimis la cel puțin o lecție — nu poate fi șters.' })
  @ApiResponse({ status: 404, description: 'Videoclipul nu a fost găsit.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
