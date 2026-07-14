import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { Session } from 'src/common/session.decorator';
import { InstructorRatingsService } from './instructor-ratings.service';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingStatsQueryDto } from './dto/rating-stats-query.dto';

@ApiTags('instructor-ratings')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('instructor-ratings')
export class InstructorRatingsController {
  constructor(private readonly service: InstructorRatingsService) {}

  // ─── Student endpoints ───────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Acordă rating unui instructor după lecție (student)' })
  @ApiResponse({ status: 201, description: 'Rating salvat.' })
  @ApiResponse({ status: 400, description: 'Lecția nu a avut loc încă sau rezervarea nu are instructor.' })
  @ApiResponse({ status: 404, description: 'Rezervare inexistentă.' })
  @ApiResponse({ status: 409, description: 'Rating deja acordat pentru această lecție.' })
  submitRating(@Body() dto: SubmitRatingDto, @Session() session: User) {
    return this.service.submitRating(session.id, dto);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Lecții trecute fără rating (student) — ratinguri obligatorii în așteptare' })
  @ApiResponse({ status: 200, description: 'Lista rezervărilor care necesită rating.' })
  getPendingRatings(@Session() session: User) {
    return this.service.getPendingRatings(session.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Istoricul ratingurilor acordate de studentul autentificat' })
  @ApiResponse({ status: 200, description: 'Lista ratingurilor.' })
  getMyRatings(@Session() session: User) {
    return this.service.getMyRatings(session.id);
  }

  @Get('reservation/:reservationId')
  @ApiOperation({ summary: 'Rating-ul acordat pentru o rezervare specifică' })
  @ApiParam({ name: 'reservationId', type: Number })
  @ApiResponse({ status: 200, description: 'Rating sau null dacă nu există.' })
  getRatingForReservation(
    @Param('reservationId', ParseIntPipe) reservationId: number,
  ) {
    return this.service.getRatingForReservation(reservationId);
  }

  // ─── Admin/Manager endpoints ──────────────────────────────────────────────

  @Get('admin/overview')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Statistici agregate per instructor (Admin/Manager)' })
  @ApiQuery({ name: 'instructorId', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Medie, total, min, max per instructor.' })
  getOverview(@Query() query: RatingStatsQueryDto) {
    return this.service.getOverview(query);
  }

  @Get('admin/monthly')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Statistici lunare per instructor (Admin/Manager)' })
  @ApiQuery({ name: 'instructorId', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Media ratingurilor pe luni.' })
  getMonthlyStats(@Query() query: RatingStatsQueryDto) {
    return this.service.getMonthlyStats(query);
  }

  @Get('admin/annual')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Statistici anuale per instructor (Admin/Manager)' })
  @ApiQuery({ name: 'instructorId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Media ratingurilor pe ani.' })
  getAnnualStats(@Query() query: RatingStatsQueryDto) {
    return this.service.getAnnualStats(query);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Toate ratingurile individuale cu filtre (Admin/Manager)' })
  @ApiQuery({ name: 'instructorId', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number, description: 'Filtru stele 1–5' })
  @ApiResponse({ status: 200, description: 'Lista completă a ratingurilor.' })
  getAllRatings(@Query() query: RatingStatsQueryDto) {
    return this.service.getAllRatings(query);
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Șterge o recenzie (doar Admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Recenzie ștearsă.' })
  @ApiResponse({ status: 404, description: 'Recenzie inexistentă.' })
  deleteRating(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteRating(id);
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Actualizează o recenzie (Admin/Manager)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Recenzie actualizată.' })
  @ApiResponse({ status: 404, description: 'Recenzie inexistentă.' })
  updateRating(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRatingDto,
  ) {
    return this.service.updateRating(id, dto);
  }
}
