import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { Session } from '../common/session.decorator';
import { DocumentReadyDto } from './dto/document-ready.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── In-app notification panel (self-scoped) ──────────────────────────────

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lista notificărilor proprii, paginată' })
  findAll(
    @Session() session: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findAllForUser(session.id, page, limit, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Numărul de notificări necitite' })
  getUnreadCount(@Session() session: User) {
    return this.notificationsService.getUnreadCount(session.id);
  }

  @Patch(':id/read')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Marchează o notificare ca citită' })
  markAsRead(@Param('id', ParseIntPipe) id: number, @Session() session: User) {
    return this.notificationsService.markAsRead(id, session.id);
  }

  @Patch('read-all')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Marchează toate notificările ca citite' })
  markAllAsRead(@Session() session: User) {
    return this.notificationsService.markAllAsRead(session.id);
  }

  @Post('document-ready')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Notifică studentul că un document e gata de ridicare (Admin/Manager)' })
  notifyDocumentReady(@Body() dto: DocumentReadyDto) {
    return this.notificationsService.notifyDocumentReady(dto.userId, dto.message);
  }

  // ─── Legacy reservation-reminder cron endpoints (unchanged) ───────────────

  @Post('test-tomorrow')
  @ApiOperation({ summary: 'Test sending notifications for tomorrow\'s reservations' })
  async testTomorrowNotifications() {
    await this.notificationsService.sendNotificationsForNextDay();
    return { message: 'Test notifications sent successfully' };
  }

  @Post('confirm/:token')
  @ApiOperation({ summary: 'Confirm a reservation using the token from email' })
  async confirmReservation(@Param('token') token: string) {
    try {
      // Decode the token to get reservationId
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [reservationId] = decoded.split('-');
      
      if (!reservationId || isNaN(+reservationId)) {
        throw new BadRequestException('Invalid confirmation token');
      }

      const reservation = await this.notificationsService.confirmReservation(+reservationId);
      return { message: 'Reservation confirmed successfully', reservation };
    } catch (error) {
      throw new BadRequestException('Failed to confirm reservation');
    }
  }
}
