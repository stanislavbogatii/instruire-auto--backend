import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BackupService } from './backup.service';

@ApiTags('backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('manual')
  @ApiOperation({ summary: 'Create manual database backup' })
  @ApiResponse({ status: 201, description: 'Backup created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  async createManualBackup() {
    try {
      const backupPath = await this.backupService.manualBackup();
      return {
        success: true,
        message: 'Database backup created successfully',
        backupPath: backupPath.split('/').pop(), // Only return filename for security
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create database backup',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get backup service status' })
  @ApiResponse({ status: 200, description: 'Backup service status.' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  async getBackupStatus() {
    return {
      service: 'Database Backup',
      status: 'active',
      schedule: 'Daily at 3:00 AM (Europe/Chisinau)',
      retention: '30 days',
      nextRun: 'Calculated by cron scheduler'
    };
  }
}
