import { Controller, Post, Param, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
