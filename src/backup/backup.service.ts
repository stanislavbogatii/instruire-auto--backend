import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as moment from 'moment-timezone';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');

  constructor(private configService: ConfigService) {
    this.ensureBackupDirectory();
  }

  // Run every day at 3:00 AM Chisinau time
  @Cron('0 3 * * *', {
    timeZone: 'Europe/Chisinau'
  })
  async scheduledBackup() {
    await this.createDatabaseBackup();
  }

  private async ensureBackupDirectory() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        this.logger.log(`Created backup directory: ${this.backupDir}`);
      }
    } catch (error) {
      this.logger.error('Failed to create backup directory:', error);
    }
  }

  async createDatabaseBackup(): Promise<string> {
    const timestamp = moment().tz('Europe/Chisinau').format('YYYY-MM-DD_HH-mm-ss');
    const backupFileName = `instruire_auto_backup_${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, backupFileName);

    const dbHost = this.configService.get('DB_HOST', 'localhost');
    const dbPort = this.configService.get('DB_PORT', '3306');
    const dbUser = this.configService.get('DB_USER');
    const dbPass = this.configService.get('DB_PASS');
    const dbName = this.configService.get('DB_NAME');

    const mysqldumpCommand = [
      'mysqldump',
      `-h${dbHost}`,
      `-P${dbPort}`,
      `-u${dbUser}`,
      `-p${dbPass}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--add-drop-table',
      '--extended-insert',
      dbName,
      `> ${backupPath}`
    ].join(' ');

    try {
      this.logger.log(`Starting database backup: ${backupFileName}`);
      
      // Execute the mysqldump command
      await execAsync(mysqldumpCommand);
      
      // Check if the backup file was created and has content
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      this.logger.log(`Database backup completed successfully: ${backupFileName} (${this.formatFileSize(stats.size)})`);
      
      // Clean up old backups (keep last 30 days)
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      this.logger.error(`Database backup failed: ${error.message}`);
      
      // Remove failed backup file if it exists
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      
      throw error;
    }
  }

  private async cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('instruire_auto_backup_') && file.endsWith('.sql'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Keep the 30 most recent backups
      const filesToDelete = backupFiles.slice(30);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        this.logger.log(`Deleted old backup: ${file.name}`);
      }

      if (filesToDelete.length > 0) {
        this.logger.log(`Cleaned up ${filesToDelete.length} old backup(s)`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old backups:', error);
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Manual backup method for testing
  async manualBackup(): Promise<string> {
    this.logger.log('Manual backup initiated');
    return await this.createDatabaseBackup();
  }
}
