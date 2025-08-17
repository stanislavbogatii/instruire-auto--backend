# Database Backup System

This module provides automated daily database backups for the Instruire Auto backend application.

## Features

- **Automated Daily Backups**: Runs every day at 3:00 AM Chisinau time
- **Retention Policy**: Keeps backups for 30 days, automatically cleaning up older files
- **Manual Backup**: API endpoint for creating backups on demand
- **Git Exclusion**: Backup files are automatically excluded from git repository

## Configuration

The backup system uses the following environment variables from `.env`:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 3306)
- `DB_USER` - Database username
- `DB_PASS` - Database password
- `DB_NAME` - Database name

## File Structure

```
/backups/
├── instruire_auto_backup_2025-08-17_03-00-01.sql
├── instruire_auto_backup_2025-08-16_03-00-01.sql
└── ...
```

## API Endpoints

### Manual Backup
```
POST /api/backup/manual
Authorization: Bearer <JWT_TOKEN>
```

Creates a database backup immediately. Returns:
```json
{
  "success": true,
  "message": "Database backup created successfully",
  "backupPath": "instruire_auto_backup_2025-08-17_15-30-45.sql",
  "timestamp": "2025-08-17T15:30:45.123Z"
}
```

### Backup Status
```
GET /api/backup/status
Authorization: Bearer <JWT_TOKEN>
```

Returns backup service information:
```json
{
  "service": "Database Backup",
  "status": "active",
  "schedule": "Daily at 3:00 AM (Europe/Chisinau)",
  "retention": "30 days",
  "nextRun": "Calculated by cron scheduler"
}
```

## Security

- All backup endpoints require JWT authentication
- Backup file paths in API responses only show filenames, not full paths
- Backup directory is excluded from git to prevent accidental commits
- Failed backup files are automatically cleaned up

## Monitoring

The backup service logs all operations:
- Backup start/completion with file sizes
- Cleanup operations
- Errors and failures

## Manual Backup Testing

To test the backup functionality:

1. **Via API** (recommended):
   ```bash
   curl -X POST http://localhost:8888/api/backup/manual \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. **Via Service** (for development):
   The `BackupService.manualBackup()` method can be called directly.

## Requirements

- **mysqldump**: Must be installed on the system
- **Disk Space**: Ensure sufficient space in `/backups` directory
- **Permissions**: Node.js process must have write access to backup directory

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the application has write permissions to the backup directory
2. **mysqldump Not Found**: Install MySQL client tools: `sudo apt-get install mysql-client`
3. **Authentication Failed**: Verify database credentials in `.env` file
4. **Large Backup Files**: Monitor disk space and adjust retention policy if needed

### Log Messages

- ✅ `Database backup completed successfully` - Backup created successfully
- ❌ `Database backup failed` - Check database connection and permissions
- 🧹 `Cleaned up X old backup(s)` - Automatic cleanup completed
- 📁 `Created backup directory` - Backup directory was created

## Implementation Notes

- Uses `mysqldump` with options for consistency and completeness
- Implements automatic retry logic (can be enhanced)
- File naming includes timezone-aware timestamps
- Backup verification checks file size to ensure content was written
