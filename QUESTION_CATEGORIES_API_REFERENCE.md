# Question Categories API - Quick Reference

## Base URL
`/api`

---

## Question Categories Endpoints

### 1. Create Category
**POST** `/question-categories`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "nameRo": "Semne de circulație",
  "nameRu": "Дорожные знаки"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "nameRo": "Semne de circulație",
  "nameRu": "Дорожные знаки",
  "createdAt": "2025-12-07T...",
  "updatedAt": "2025-12-07T..."
}
```

---

### 2. Get All Categories
**GET** `/question-categories?page=1&limit=50`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "nameRo": "Semne de circulație",
      "nameRu": "Дорожные знаки",
      "createdAt": "2025-12-07T...",
      "updatedAt": "2025-12-07T...",
      "_count": {
        "questions": 25
      }
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

### 3. Get Categories with Count
**GET** `/question-categories/with-count`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "nameRo": "Semne de circulație",
    "nameRu": "Дорожные знаки",
    "createdAt": "2025-12-07T...",
    "updatedAt": "2025-12-07T...",
    "_count": {
      "questions": 25
    }
  }
]
```

---

### 4. Get Category by ID
**GET** `/question-categories/:id`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "nameRo": "Semne de circulație",
  "nameRu": "Дорожные знаки",
  "createdAt": "2025-12-07T...",
  "updatedAt": "2025-12-07T...",
  "_count": {
    "questions": 25
  }
}
```

---

### 5. Update Category
**PUT** `/question-categories/:id`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "nameRo": "Updated name RO",
  "nameRu": "Updated name RU"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "nameRo": "Updated name RO",
  "nameRu": "Updated name RU",
  "createdAt": "2025-12-07T...",
  "updatedAt": "2025-12-07T..."
}
```

---

### 6. Delete Category
**DELETE** `/question-categories/:id`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "message": "Category deleted successfully"
}
```

**Error:** `400 Bad Request` (if category has questions)
```json
{
  "statusCode": 400,
  "message": "Cannot delete category with 25 associated questions. Please reassign or delete the questions first."
}
```

---

## Updated Questions Endpoints

### Create Question with Category
**POST** `/exams/questions`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "text": "Care este semnificația acestui semn?",
  "image": "signs/sign-123.jpg",
  "answers": ["Stop obligatoriu", "Cedează trecerea", "Oprire interzisă"],
  "correctAnswer": 0,
  "categoryId": 1
}
```

**Response:** `201 Created`
```json
{
  "id": 100,
  "text": "Care este semnificația acestui semn?",
  "image": "signs/sign-123.jpg",
  "answers": "[\"Stop obligatoriu\",\"Cedează trecerea\",\"Oprire interzisă\"]",
  "correctAnswer": 0,
  "categoryId": 1,
  "createdAt": "2025-12-07T...",
  "updatedAt": "2025-12-07T...",
  "category": {
    "id": 1,
    "nameRo": "Semne de circulație",
    "nameRu": "Дорожные знаки",
    "createdAt": "2025-12-07T...",
    "updatedAt": "2025-12-07T..."
  }
}
```

---

## Category-Based Practice Endpoints

### 1. Start Practice by Category
**POST** `/exams/practice/by-category?lang=ro`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "categoryId": 1,
  "questionCount": 20
}
```

**Response:** `201 Created`
```json
{
  "id": 50,
  "ticketName": "Category_Practice_1_1733587200000",
  "status": "IN_PROGRESS",
  "score": null,
  "totalQuestions": 20,
  "lastQuestionIndex": 0,
  "startedAt": "2025-12-07T...",
  "completedAt": null,
  "questions": [
    {
      "id": 100,
      "text": "Care este semnificația acestui semn?",
      "image": "signs/sign-123.jpg",
      "imageUrl": "http://localhost:3000/uploads/signs/sign-123.jpg",
      "answers": ["Stop obligatoriu", "Cedează trecerea", "Oprire interzisă"],
      "order": 1,
      "selectedAnswer": null,
      "isCorrect": null,
      "isAnswered": false
    }
  ]
}
```

---

### 2. Submit Answer (Same as Ticket Practice)
**POST** `/exams/practice/:id/answers`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "questionId": 100,
  "selectedAnswer": 0
}
```

**Response:** `200 OK`
```json
{
  "isCorrect": true,
  "correctAnswer": 0,
  "progress": {
    "answered": 1,
    "total": 20,
    "isCompleted": false
  }
}
```

---

### 3. Get Category Practice History
**GET** `/exams/practice/category/:categoryId/history?page=1&limit=10&lang=ro`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 50,
      "ticketName": "Category_Practice_1_1733587200000",
      "categoryName": "Semne de circulație",
      "status": "COMPLETED",
      "score": 18,
      "totalQuestions": 20,
      "startedAt": "2025-12-07T10:00:00Z",
      "completedAt": "2025-12-07T10:15:00Z",
      "lastQuestionIndex": 20
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## Language Support

All endpoints that return category names or questions support language selection:

**Query Parameter:** `?lang=ro` or `?lang=ru`

**Default:** `ro` (Romanian)

**Affects:**
- Category names in responses
- Question text parsing
- Answer text parsing

---

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Category with ID 999 not found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Cannot delete category with questions"
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

## Swagger Documentation

Full interactive API documentation available at:
**http://localhost:3000/api-docs**

Look for:
- **question-categories** tag - Category management
- **exams** tag - Practice endpoints (includes category-based practice)
