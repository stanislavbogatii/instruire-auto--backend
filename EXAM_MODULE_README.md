# Driving School Exam Module

This module implements a comprehensive driving theory exam system for the driving school management application.

## Features Implemented

### 1. Question Management
- **Entity**: `Question` with image support and multiple choice answers
- **Endpoints**: 
  - `POST /exams/questions` - Create new question
  - `GET /exams/questions` - Get paginated questions list
  - `GET /exams/questions/:id` - Get question details
  - `PUT /exams/questions/:id` - Update question
  - `DELETE /exams/questions/:id` - Delete question

### 2. Ticket System
- **Entity**: `Ticket` with preselected questions
- **Entity**: `TicketQuestion` - Links questions to tickets with order
- **Entity**: `StudentTicket` - Tracks student interaction with tickets (last answer for statistics)
- **Endpoints**:
  - `POST /exams/tickets` - Create new ticket with questions
  - `GET /exams/tickets` - Get paginated tickets list
  - `GET /exams/tickets/:id` - Get ticket with questions
  - `GET /exams/tickets/:id/questions` - Get all questions from a ticket
  - `PUT /exams/tickets/:id` - Update ticket
  - `DELETE /exams/tickets/:id` - Delete ticket

### 3. Exam System
- **Random Selection**: Selects 2 random tickets for each exam
- **No Repetition**: Ensures no ticket is repeated for the same student
- **Attempt Tracking**: Tracks number of attempts per student
- **3 Attempts Limit**: Students can only take 3 exams before being restricted
- **Entities**: 
  - `Exam` - Main exam record with status and scoring
  - `ExamQuestion` - Individual question attempts in exam
  - `ExamTicket` - Links tickets used in exam
  - `StudentExamPermission` - Controls student access to exams

### 4. Instructor Permissions
- **Grant Access**: Instructors can grant exam permissions to students
- **Time Limits**: Set validity period for exam permissions
- **Bulk Operations**: Grant permissions to multiple students at once
- **Endpoints**:
  - `POST /exams/permissions/student` - Grant permission to single student
  - `POST /exams/permissions/students/bulk` - Grant permissions to multiple students

### 5. Exam Taking Process
- **Start Exam**: `POST /exams` - Creates exam with random tickets
- **Submit Answers**: `POST /exams/:id/answers` - Submit answer and get immediate feedback
- **Real-time Validation**: Each answer is validated immediately
- **Auto-completion**: Exam auto-completes when all questions are answered

### 6. Exam History & Statistics
- **Student History**: Students can view their past exam attempts
- **Instructor Overview**: Instructors can see all their students' exam history
- **Detailed Results**: Complete breakdown of scores and performance
- **Endpoints**:
  - `GET /exams/history/student` - Student's exam history
  - `GET /exams/history/instructor` - All students' history for instructor

### 7. Automatic Timeout System
- **Time Limits**: Each exam has a configurable time limit (default: 30 minutes)
- **Auto-Expiry**: Cron job automatically expires overdue exams
- **Status Tracking**: Exams can be IN_PROGRESS, COMPLETED, FAILED, or EXPIRED

### 8. Manager Override System
- **Reactivation**: Managers can reactivate students who exceeded attempt limits
- **Reset Attempts**: Option to reset attempt counter when reactivating
- **Extended Permissions**: Set new validity dates for student permissions
- **Endpoint**: `POST /exams/reactivate` - Reactivate student (Manager only)

### 9. PDF Certificate Generation
- **Automatic Generation**: PDF certificate generated upon exam completion
- **Professional Design**: Clean, professional certificate layout
- **Email Delivery**: PDF automatically attached to result email
- **Pass/Fail Indication**: Clear ADMIS/RESPINS status on certificate

### 10. Email Notifications
- **Result Emails**: Automatic email with exam results
- **PDF Attachment**: Professional certificate attached
- **Status Indication**: Clear pass/fail notification in subject and content

## Database Schema

### Core Entities
```
Question (id, text, image?, answers[], correctAnswer, timestamps)
Ticket (id, name, timestamps)
TicketQuestion (ticketId, questionId, order) - Links questions to tickets
StudentTicket (userId, ticketId, lastAnswer?, answeredAt?) - Student interaction tracking

Exam (id, userId, instructorId?, status, score?, totalQuestions, passScore, startedAt, completedAt?, timeLimit, attemptNumber)
ExamQuestion (examId, questionId, selectedAnswer?, isCorrect?, answeredAt?, order)
ExamTicket (examId, ticketId) - Links tickets used in exam

StudentExamPermission (userId, instructorId, isActive, validUntil, maxAttempts, usedAttempts)
```

### Enum Values
```
ExamStatus: IN_PROGRESS, COMPLETED, FAILED, EXPIRED
```

## Configuration

### Default Settings
- **Time Limit**: 30 minutes per exam
- **Pass Score**: 22 out of 26 questions (configurable)
- **Max Attempts**: 3 attempts per student
- **Random Tickets**: 2 tickets selected randomly per exam

### Customizable Parameters
- Exam time limit (per exam)
- Pass score requirement (per exam)
- Maximum attempts (per permission)
- Validity period (per permission)

## API Usage Examples

### Starting an Exam
```http
POST /exams
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "userId": 123,
  "timeLimit": 30,
  "passScore": 22
}
```

### Submitting an Answer
```http
POST /exams/456/answers
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "questionId": 789,
  "selectedAnswer": 2
}
```

### Granting Student Permission
```http
POST /exams/permissions/student
Authorization: Bearer <instructor_token>
Content-Type: application/json

{
  "userId": 123,
  "validUntil": "2025-12-31T23:59:59Z",
  "maxAttempts": 3
}
```

## Security Features

- **JWT Authentication**: All endpoints protected with JWT tokens
- **Role-based Access**: Different permissions for students, instructors, and managers
- **Attempt Limits**: Automatic restriction after failed attempts
- **Time-based Expiry**: Permissions and exams have expiration dates
- **Data Validation**: Comprehensive input validation on all endpoints

## Monitoring & Logging

- **Cron Jobs**: Automatic cleanup of expired exams every minute
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Audit Trail**: Complete history of exam attempts and results
- **Performance Tracking**: Pagination support for large datasets

## Installation & Setup

1. **Database Migration**: The schema has been applied using `prisma db push`
2. **Seed Data**: Run `npx ts-node seed-exam-data.ts` to create sample questions and tickets
3. **Dependencies**: 
   - `puppeteer` for PDF generation
   - `@nestjs/schedule` for cron jobs
   - `@nestjs-modules/mailer` for email functionality

## Testing

The module includes comprehensive seed data with:
- 10 sample questions covering various driving topics
- 3 sample tickets with different question combinations
- Realistic scenarios for testing all functionality

## Next Steps

1. **Frontend Integration**: Create student and instructor interfaces
2. **Analytics Dashboard**: Add detailed reporting and analytics
3. **Question Categories**: Implement question categorization system
4. **Bulk Import**: Add CSV/Excel import for questions and tickets
5. **Advanced Statistics**: Detailed performance analytics per student/question

This implementation provides a complete, production-ready driving theory exam system with all requested features and robust security measures.
