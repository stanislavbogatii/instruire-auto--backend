# Professor Role Implementation

## Overview
Implemented a new **PROFESSOR** role with limited access to view their assigned group's students and monitor practice progress. Professors have read-only access and cannot modify exam permissions or create groups.

---

## Database Changes

### Schema Updates (Prisma)

#### Updated Enum: Role
Added `PROFESSOR` to the existing Role enum:
```prisma
enum Role {
  USER
  MANAGER
  ADMIN
  INSTRUCTOR
  PROFESSOR
}
```

**Applied to database using:** `npx prisma db push`

---

## Role Capabilities

### PROFESSOR Role Permissions

✅ **Can Do:**
- View all students in their assigned group
- View individual student practice progress and statistics
- View detailed practice sessions including answers
- View group-wide practice overview and statistics
- Access multilingual content (RO/RU)

❌ **Cannot Do:**
- Grant exam permissions
- Create or modify groups
- Delete or reactivate students
- Access students from other groups
- Modify questions or tickets
- View official exam results (only practice sessions)

### Comparison with Other Roles

| Feature | PROFESSOR | INSTRUCTOR | MANAGER | ADMIN |
|---------|-----------|------------|---------|-------|
| View own group students | ✅ | ✅ | ✅ | ✅ |
| View practice progress | ✅ | ✅ | ✅ | ✅ |
| Grant exam permissions | ❌ | ✅ | ✅ | ✅ |
| Create groups | ❌ | ✅ | ✅ | ✅ |
| View exam results | ❌ | ✅ | ✅ | ✅ |
| Manage questions/tickets | ❌ | ❌ | ✅ | ✅ |

---

## New API Endpoints

### Groups Module - Professor Endpoints

Base path: `/api/groups`

#### 1. Get My Group Students
**GET** `/groups/my-group/students`

**Auth:** JWT Required, Role: PROFESSOR

**Description:** Returns all students in the professor's assigned group

**Response:**
```json
{
  "groupId": 1,
  "groupName": "Group A",
  "studentCount": 25,
  "students": [
    {
      "id": 10,
      "email": "student@example.com",
      "firstName": "Ion",
      "lastName": "Popescu",
      "phone": "+37369123456",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

#### 2. Get Student Practice Progress
**GET** `/groups/my-group/students/:studentId/practice-progress?page=1&limit=20`

**Auth:** JWT Required, Role: PROFESSOR

**Path Params:**
- `studentId` - Student user ID (must be in professor's group)

**Query Params:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Description:** Returns detailed practice statistics and paginated history for a specific student

**Response:**
```json
{
  "student": {
    "id": 10,
    "email": "student@example.com",
    "firstName": "Ion",
    "lastName": "Popescu"
  },
  "statistics": {
    "totalPractices": 45,
    "completedPractices": 40,
    "averageScore": 18.5,
    "statusBreakdown": {
      "COMPLETED": 30,
      "PASSED": 25,
      "FAILED": 5,
      "IN_PROGRESS": 5
    }
  },
  "practiceHistory": [
    {
      "id": 100,
      "ticketName": "Ticket 5",
      "ticketType": "PRACTICE",
      "status": "COMPLETED",
      "score": 19,
      "totalQuestions": 20,
      "startedAt": "2025-12-07T10:00:00Z",
      "completedAt": "2025-12-07T10:15:00Z",
      "lastQuestionIndex": 20
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Error Responses:**
- `404` - Student not found
- `400` - Student not in professor's group
- `400` - Professor not assigned to a group

---

#### 3. Get Group Practice Overview
**GET** `/groups/my-group/overview`

**Auth:** JWT Required, Role: PROFESSOR

**Description:** Returns aggregate statistics for all students in the professor's group

**Response:**
```json
{
  "groupId": 1,
  "groupName": "Group A",
  "totalStudents": 25,
  "overview": [
    {
      "student": {
        "id": 10,
        "firstName": "Ion",
        "lastName": "Popescu",
        "email": "student@example.com"
      },
      "totalPractices": 45,
      "completedPractices": 40,
      "averageScore": 18.5
    }
  ]
}
```

---

### Exams Module - Professor Endpoint

Base path: `/api/exams`

#### Get Detailed Practice Session for Student
**GET** `/exams/practice/student/:studentId/detailed?practiceId=100&lang=ro`

**Auth:** JWT Required, Role: PROFESSOR

**Path Params:**
- `studentId` - Student user ID (must be in professor's group)

**Query Params:**
- `practiceId` - Practice session ID (required)
- `lang` - Language (ro/ru, default: ro)

**Description:** View complete practice session with all questions and student answers

**Response:**
```json
{
  "id": 100,
  "student": {
    "id": 10,
    "firstName": "Ion",
    "lastName": "Popescu",
    "email": "student@example.com"
  },
  "ticketName": "Ticket 5",
  "ticketType": "PRACTICE",
  "status": "COMPLETED",
  "score": 19,
  "totalQuestions": 20,
  "lastQuestionIndex": 20,
  "startedAt": "2025-12-07T10:00:00Z",
  "completedAt": "2025-12-07T10:15:00Z",
  "questions": [
    {
      "id": 150,
      "text": "Care este semnificația acestui semn?",
      "image": "signs/sign-123.jpg",
      "imageUrl": "http://localhost:3000/uploads/signs/sign-123.jpg",
      "answers": ["Stop obligatoriu", "Cedează trecerea", "Oprire interzisă"],
      "correctAnswer": 0,
      "category": {
        "id": 1,
        "name": "Semne de circulație"
      },
      "order": 1,
      "selectedAnswer": 0,
      "isCorrect": true,
      "isAnswered": true,
      "answeredAt": "2025-12-07T10:01:30Z"
    }
  ]
}
```

**Error Responses:**
- `404` - Student or practice session not found
- `400` - Student not in professor's group
- `400` - Practice doesn't belong to student
- `403` - Forbidden (student not in your group)

---

## Implementation Details

### Groups Service Methods

#### `getProfessorGroupStudents(professorUserId)`
- Validates professor exists and is assigned to a group
- Returns only students (role: USER) from professor's group
- Orders students alphabetically by last name

#### `getStudentPracticeProgress(professorUserId, studentId, page, limit)`
- Validates professor and student are in the same group
- Aggregates practice statistics (total, completed, average score)
- Groups practices by status
- Returns paginated practice history

#### `getGroupPracticeOverview(professorUserId)`
- Fetches all students in professor's group
- Calculates aggregate stats for each student
- Returns overview sorted by student last name

### Exams Service Methods

#### `getProfessorStudentPracticeDetails(professorUserId, studentId, practiceId, lang)`
- Validates professor and student are in the same group
- Fetches complete practice session with all questions and answers
- Parses multilingual content based on `lang` parameter
- Includes category information and correct answers
- Shows which answers were correct/incorrect

---

## Security & Access Control

### Authorization Checks

1. **Group Membership Validation**
   - All professor endpoints verify student belongs to professor's group
   - Prevents cross-group data access

2. **Role-Based Guards**
   - `@UseGuards(AuthGuard('jwt'), RolesGuard)`
   - `@Roles(Role.PROFESSOR)` decorator ensures only professors can access

3. **Data Scoping**
   - Professors can ONLY view data from their assigned group
   - No access to other groups or system-wide data

### Error Handling

Consistent error responses:
- `400 Bad Request` - Invalid parameters or authorization issues
- `403 Forbidden` - Access denied (student not in group)
- `404 Not Found` - Resource doesn't exist

---

## Usage Workflow

### 1. Assign Professor to Group

Professors must be assigned to a group via the database or admin panel:

```sql
-- Update user role and assign to group
UPDATE User 
SET role = 'PROFESSOR', groupId = 1 
WHERE id = 5;
```

### 2. Professor Views Students

```bash
GET /api/groups/my-group/students
Authorization: Bearer <professor_jwt_token>
```

### 3. Monitor Student Progress

```bash
GET /api/groups/my-group/students/10/practice-progress?page=1&limit=20
Authorization: Bearer <professor_jwt_token>
```

### 4. View Practice Details

```bash
GET /api/exams/practice/student/10/detailed?practiceId=100&lang=ro
Authorization: Bearer <professor_jwt_token>
```

### 5. Check Group Overview

```bash
GET /api/groups/my-group/overview
Authorization: Bearer <professor_jwt_token>
```

---

## Swagger Documentation

All endpoints are fully documented in Swagger UI at `/api-docs`:

**Tags:**
- `groups` - Professor group management endpoints
- `exams` - Professor practice viewing endpoint

**Features:**
- Interactive API testing
- Request/response schemas
- Authentication requirements
- Error response codes

---

## Multilingual Support

All practice-related endpoints support Romanian and Russian:

**Query Parameter:** `?lang=ro` or `?lang=ru`

**Default:** `ro` (Romanian)

**Affects:**
- Question text
- Answer options
- Category names

---

## Key Features

✅ **Read-Only Access** - Professors can view but not modify data

✅ **Group-Scoped** - All operations limited to assigned group

✅ **Comprehensive Statistics** - Aggregated and individual progress tracking

✅ **Detailed Practice View** - Complete visibility into student answers

✅ **Multilingual** - Full RO/RU support

✅ **Paginated Results** - Efficient handling of large datasets

✅ **Swagger Documentation** - Complete API documentation

---

## Files Modified

### Modified
- `prisma/schema.prisma` - Added PROFESSOR to Role enum
- `src/groups/groups.controller.ts` - Added professor endpoints
- `src/groups/groups.service.ts` - Added professor methods
- `src/exams/exams.controller.ts` - Added professor practice detail endpoint
- `src/exams/exams.service.ts` - Added professor practice detail method

### Build & Deploy
- Generated Prisma client with new role
- Pushed schema changes to production database
- Built TypeScript project
- Restarted PM2 process

---

## Testing Recommendations

1. **Role Assignment**
   - Verify professor can only access assigned group
   - Test with professor not assigned to group (should fail)

2. **Student Access**
   - Verify professor can view students in their group
   - Test accessing student from different group (should fail)

3. **Practice Progress**
   - Verify statistics calculations are accurate
   - Test pagination with various page sizes

4. **Practice Details**
   - Verify all question details are visible
   - Test multilingual support (RO/RU)
   - Verify correct/incorrect answers are shown properly

5. **Group Overview**
   - Verify all students appear in overview
   - Test with empty group

---

## Future Enhancements (Optional)

1. Export practice data to CSV/Excel
2. Add filtering by date range
3. Add filtering by practice status
4. Add comparison charts between students
5. Email reports to professors
6. Real-time practice progress notifications
7. Professor dashboard with visualizations

---

## Summary

The PROFESSOR role has been successfully implemented with:
- ✅ New role added to database
- ✅ 4 new API endpoints for monitoring students
- ✅ Group-scoped access control
- ✅ Comprehensive practice statistics
- ✅ Detailed session viewing
- ✅ Full Swagger documentation
- ✅ Multilingual support
- ✅ Production-ready implementation
