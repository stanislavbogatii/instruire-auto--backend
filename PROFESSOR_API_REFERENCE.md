# Professor API - Quick Reference

## Authentication
All endpoints require JWT Bearer token with PROFESSOR role.

**Header:**
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Endpoints

### 1. List My Group Students

**GET** `/api/groups/my-group/students`

**Response:** `200 OK`
```json
{
  "groupId": 1,
  "groupName": "Group A - 2025",
  "studentCount": 25,
  "students": [
    {
      "id": 10,
      "email": "student@example.com",
      "firstName": "Ion",
      "lastName": "Popescu",
      "phone": "+37369123456",
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Student Practice Progress

**GET** `/api/groups/my-group/students/:studentId/practice-progress`

**Params:**
- `studentId` (path) - Student ID

**Query:**
- `page=1` - Page number
- `limit=20` - Results per page

**Response:** `200 OK`
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
      "IN_PROGRESS": 5,
      "NOT_STARTED": 0
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
      "startedAt": "2025-12-07T10:00:00.000Z",
      "completedAt": "2025-12-07T10:15:00.000Z",
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

**Errors:**
- `400` - Student not in your group
- `404` - Student not found

---

### 3. Get Group Overview

**GET** `/api/groups/my-group/overview`

**Response:** `200 OK`
```json
{
  "groupId": 1,
  "groupName": "Group A - 2025",
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
    },
    {
      "student": {
        "id": 11,
        "firstName": "Maria",
        "lastName": "Ionescu",
        "email": "maria@example.com"
      },
      "totalPractices": 38,
      "completedPractices": 35,
      "averageScore": 17.2
    }
  ]
}
```

---

### 4. Get Detailed Practice Session

**GET** `/api/exams/practice/student/:studentId/detailed`

**Params:**
- `studentId` (path) - Student ID

**Query:**
- `practiceId` (required) - Practice session ID
- `lang` (optional) - Language: `ro` or `ru` (default: `ro`)

**Response:** `200 OK`
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
  "startedAt": "2025-12-07T10:00:00.000Z",
  "completedAt": "2025-12-07T10:15:00.000Z",
  "questions": [
    {
      "id": 150,
      "text": "Care este semnificația acestui semn?",
      "image": "signs/sign-123.jpg",
      "imageUrl": "https://instruireauto.site/uploads/signs/sign-123.jpg",
      "answers": [
        "Stop obligatoriu",
        "Cedează trecerea",
        "Oprire interzisă"
      ],
      "correctAnswer": 0,
      "category": {
        "id": 1,
        "name": "Semne de circulație"
      },
      "order": 1,
      "selectedAnswer": 0,
      "isCorrect": true,
      "isAnswered": true,
      "answeredAt": "2025-12-07T10:01:30.000Z"
    },
    {
      "id": 151,
      "text": "Limita de viteză în localitate este:",
      "image": null,
      "imageUrl": null,
      "answers": [
        "50 km/h",
        "60 km/h",
        "70 km/h"
      ],
      "correctAnswer": 0,
      "category": {
        "id": 2,
        "name": "Regulamente de circulație"
      },
      "order": 2,
      "selectedAnswer": 1,
      "isCorrect": false,
      "isAnswered": true,
      "answeredAt": "2025-12-07T10:02:15.000Z"
    }
  ]
}
```

**Errors:**
- `400` - Student not in your group
- `400` - Practice doesn't belong to student
- `403` - Access denied
- `404` - Student or practice not found

---

## Common Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Professor is not assigned to a group"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Student is not in your group"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Student not found"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## Practice Status Values

- `NOT_STARTED` - Practice created but no questions answered
- `IN_PROGRESS` - Some questions answered
- `COMPLETED` - All questions answered
- `PASSED` - Completed with score ≥ 70%
- `FAILED` - Completed with score < 70%

---

## Example Usage

### Get all students in my group
```bash
curl -X GET "https://instruireauto.site/api/groups/my-group/students" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get student progress
```bash
curl -X GET "https://instruireauto.site/api/groups/my-group/students/10/practice-progress?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get group overview
```bash
curl -X GET "https://instruireauto.site/api/groups/my-group/overview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View detailed practice session
```bash
curl -X GET "https://instruireauto.site/api/exams/practice/student/10/detailed?practiceId=100&lang=ro" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Swagger Documentation

Interactive API documentation: **https://instruireauto.site/api-docs**

Look for tags:
- **groups** - Professor endpoints for student management
- **exams** - Professor practice viewing endpoints
