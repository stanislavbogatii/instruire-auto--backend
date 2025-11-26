# Notes Module Documentation

## Overview
The Notes module provides a complete CRUD (Create, Read, Update, Delete) API for managing user notes in the Instruire Auto backend application. Each note is automatically assigned to the user who created it.

## Database Schema

### Note Model
```prisma
model Note {
  id        Int      @id @default(autoincrement())
  title     String
  content   String   @db.Text
  userId    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### 1. Create Note
**POST** `/notes`

Creates a new note for the authenticated user.

**Request Body:**
```json
{
  "title": "My Note Title",
  "content": "Note content goes here..."
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "title": "My Note Title",
  "content": "Note content goes here...",
  "userId": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Get All Notes
**GET** `/notes`

Retrieves all notes from all users (includes user information).

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "My Note Title",
    "content": "Note content goes here...",
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
]
```

### 3. Get My Notes
**GET** `/notes/my-notes`

Retrieves all notes created by the authenticated user.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "My Note Title",
    "content": "Note content goes here...",
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 4. Get Notes by User ID
**GET** `/notes/user/:userId`

Retrieves all notes for a specific user.

**Parameters:**
- `userId` (number): The ID of the user

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "My Note Title",
    "content": "Note content goes here...",
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 5. Get Note by ID
**GET** `/notes/:id`

Retrieves a specific note by ID (includes user information).

**Parameters:**
- `id` (number): The note ID

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "My Note Title",
  "content": "Note content goes here...",
  "userId": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Note with id=1 not found"
}
```

### 6. Update Note
**PATCH** `/notes/:id`

Updates a note. Only the note owner or ADMIN/MANAGER can update.

**Parameters:**
- `id` (number): The note ID

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "content": "Updated content"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Updated Title",
  "content": "Updated content",
  "userId": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Note doesn't exist
- `403 Forbidden` - User doesn't have permission to update this note

### 7. Delete Note
**DELETE** `/notes/:id`

Deletes a note. Only the note owner or ADMIN/MANAGER can delete.

**Parameters:**
- `id` (number): The note ID

**Response:** `200 OK`
```json
{
  "message": "Note deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - Note doesn't exist
- `403 Forbidden` - User doesn't have permission to delete this note

## Authorization & Permissions

### Create Note
- Any authenticated user can create notes

### Read Notes
- Any authenticated user can read all notes or specific user notes

### Update Note
- Note owner can update their own notes
- ADMIN role can update any note
- MANAGER role can update any note

### Delete Note
- Note owner can delete their own notes
- ADMIN role can delete any note
- MANAGER role can delete any note

## Data Validation

### CreateNoteDto
- `title`: Required, string, max 255 characters
- `content`: Required, string, stored as TEXT in database

### UpdateNoteDto
- `title`: Optional, string, max 255 characters
- `content`: Optional, string

## Architecture

The Notes module follows the standard NestJS architecture pattern used throughout the project:

```
notes/
├── dto/
│   ├── create-note.dto.ts      # DTO for creating notes
│   ├── update-note.dto.ts      # DTO for updating notes
│   └── note-response.dto.ts    # DTO for API responses
├── notes.controller.ts          # REST API endpoints
├── notes.service.ts             # Business logic
└── notes.module.ts              # Module definition
```

### Key Features
- **Decorators Used**: `@Session()` for getting authenticated user
- **Guards**: `AuthGuard('jwt')` for authentication
- **Swagger Documentation**: Full API documentation with `@ApiTags`, `@ApiOperation`, etc.
- **PrismaService**: Database operations using Prisma ORM
- **Validation**: Class-validator decorators on DTOs
- **Cascade Delete**: Notes are automatically deleted when user is deleted

## Testing

A test script is provided at `test-notes-api.sh` for manual API testing. 

**Usage:**
1. Update the `TOKEN` variable in the script with a valid JWT token
2. Run: `./test-notes-api.sh`

## Database Migration

The Notes table was added to the database using:
```bash
npx prisma db push
```

This command safely adds the new table without dropping existing data, which is critical for production environments.

## Integration

The NotesModule is registered in `app.module.ts` and is available at the `/notes` endpoint.

## Future Enhancements

Possible enhancements for the Notes module:
- Add note categories/tags
- Add sharing functionality between users
- Add rich text formatting support
- Add file attachments
- Add search functionality
- Add pagination for large note lists
- Add soft delete (archive) functionality
