# New Endpoint: Create Reservations for Selected User

## Endpoint
`POST /api/reservations/for-user`

## Description
This endpoint allows admins, managers, and instructors to create multiple reservations for any selected user (not just the current user).

## Authorization
- **Required Roles**: ADMIN, MANAGER, or INSTRUCTOR
- **Authentication**: JWT Bearer token required

## Request Body
```json
{
  "userId": 123,
  "instructorId": 45,
  "instructorsGroupId": 2,
  "reservations": [
    {
      "startTime": "2025-09-24T10:00:00Z",
      "sector": "Botanica",
      "gearbox": "Manual",
      "privateMessage": "Please pick up from office",
      "color": "#FF5733"
    },
    {
      "startTime": "2025-09-25T14:00:00Z",
      "sector": "Centru",
      "gearbox": "Automatic",
      "privateMessage": "Regular lesson",
      "color": "#33FF57"
    }
  ]
}
```

## Request Parameters

### Required
- `userId` (number): ID of the user to create reservations for

### Optional
- `instructorId` (number): Specific instructor ID (if not provided, will be assigned based on instructorsGroupId)
- `instructorsGroupId` (number): Instructor group ID for automatic assignment
- `reservations` (array): Array of reservation objects with:
  - `startTime` (string): ISO datetime string for the reservation
  - `sector` (string): Preferred sector/area
  - `gearbox` (string): Gearbox type preference
  - `privateMessage` (string): Message for the instructor
  - `color` (string): Color code for the reservation

## Response
Returns an array of created reservation objects with full details including assigned instructor and user information.

## Error Responses
- `403 Forbidden`: User doesn't have permission (not ADMIN/MANAGER/INSTRUCTOR)
- `404 Not Found`: Target user or instructor not found
- `400 Bad Request`: Invalid data or no available instructor at specified times

## Usage Examples

### Create reservations for a student (as instructor)
```bash
curl -X POST http://localhost:8888/api/reservations/for-user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "instructorsGroupId": 2,
    "reservations": [
      {
        "startTime": "2025-09-24T10:00:00Z",
        "sector": "Botanica",
        "gearbox": "Manual"
      }
    ]
  }'
```

### Create reservations with specific instructor
```bash
curl -X POST http://localhost:8888/api/reservations/for-user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "instructorId": 45,
    "reservations": [
      {
        "startTime": "2025-09-24T10:00:00Z",
        "sector": "Centru",
        "privateMessage": "First lesson for this student"
      }
    ]
  }'
```

## Features
- ✅ **Role-based Access Control**: Only authorized users can create reservations for others
- ✅ **User Validation**: Validates that target user exists before creating reservations
- ✅ **Instructor Assignment**: Supports both specific instructor and group-based assignment
- ✅ **Conflict Detection**: Checks for scheduling conflicts before creating reservations
- ✅ **History Tracking**: Automatically creates history records for audit trail
- ✅ **Comprehensive Validation**: Full input validation with detailed error messages

This endpoint is particularly useful for:
- **Instructors**: Creating schedules for their students
- **Managers**: Bulk scheduling for multiple students
- **Admins**: System-wide reservation management
