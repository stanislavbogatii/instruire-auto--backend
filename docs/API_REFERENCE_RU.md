# 📖 Справочник API — Instruire Auto

**Полная документация всех REST endpoints системы на русском языке.**

---

## 🔐 Аутентификация

### Регистрация

```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "securePassword123",
  "firstName": "Иван",
  "lastName": "Сидоров",
  "phone": "+373693123456"
}
```

**Ответ (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "firstName": "Иван",
    "lastName": "Сидоров",
    "role": "USER",
    "createdAt": "2024-08-14T10:00:00Z"
  }
}
```

### Вход

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "securePassword123"
}
```

**Ответ (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { /* user data */ }
}
```

### Обновление токена

```http
POST /api/auth/refresh
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Сброс пароля

```http
POST /api/auth/password-reset
Content-Type: application/json

{
  "email": "student@example.com"
}
```

---

## 👥 Пользователи

### Получить список всех пользователей

```http
GET /api/users
Authorization: Bearer {token}
```

**Параметры запроса:**
- `role` (опционально) — фильтр по роли: USER, INSTRUCTOR, ADMIN
- `skip` (опционально) — пропустить N записей (пагинация)
- `take` (опционально) — взять N записей (пагинация)

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "email": "student@example.com",
    "firstName": "Иван",
    "lastName": "Сидоров",
    "role": "USER",
    "phone": "+373693123456",
    "groupId": 5,
    "createdAt": "2024-08-14T10:00:00Z",
    "updatedAt": "2024-08-14T10:00:00Z"
  },
  // ...
]
```

**Доступно только для:** ADMIN, MANAGER

### Получить профиль пользователя

```http
GET /api/users/:id
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
{
  "id": 1,
  "email": "student@example.com",
  "firstName": "Иван",
  "lastName": "Сидоров",
  "phone": "+373693123456",
  "role": "USER",
  "groupId": 5,
  "idnp": "9901234567890",
  "privateMessage": "",
  "color": "#FF5733",
  "medicalDocuments": false,
  "individualWork": false,
  "numberOfAbsences": 2,
  "canBookPracticalExam": false,
  "createdAt": "2024-08-14T10:00:00Z",
  "updatedAt": "2024-08-14T10:00:00Z"
}
```

### Обновить профиль

```http
PATCH /api/users/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Иван",
  "lastName": "Сидоров",
  "phone": "+373693123456",
  "color": "#FF5733",
  "privateMessage": "Строка любого сообщения"
}
```

**Ответ (200 OK):** обновленный профиль пользователя

### Удалить пользователя

```http
DELETE /api/users/:id
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
{ "message": "Пользователь успешно удален" }
```

**Доступно только для:** ADMIN

### Получить пользователей группы

```http
GET /api/users/group/:groupId
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
[
  { /* user 1 */ },
  { /* user 2 */ }
]
```

---

## 👨‍🎓 Группы (Groups)

### Получить все группы

```http
GET /api/groups
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Гр. 101 - B1",
    "token": "GROUP_TOKEN_abc123xyz",
    "instructorId": 10,
    "professorId": 5,
    "createdAt": "2024-08-14T10:00:00Z",
    "updatedAt": "2024-08-14T10:00:00Z",
    "users": [ /* студенты группы */ ]
  }
]
```

### Получить группу

```http
GET /api/groups/:id
Authorization: Bearer {token}
```

### Создать группу

```http
POST /api/groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Гр. 101 - B1",
  "instructorId": 10,
  "professorId": 5
}
```

**Доступно только для:** ADMIN

### Обновить группу

```http
PATCH /api/groups/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Гр. 101 - B2",
  "instructorId": 11
}
```

**Доступно только для:** ADMIN

### Присоединиться к группе

```http
POST /api/groups/join
Authorization: Bearer {token}
Content-Type: application/json

{
  "token": "GROUP_TOKEN_abc123xyz"
}
```

**Ответ (200 OK):**
```json
{
  "message": "Вы успешно присоединились к группе",
  "group": { /* данные группы */ }
}
```

---

## 🚗 Инструкторы (Instructors)

### Получить всех инструкторов

```http
GET /api/instructors
Authorization: Bearer {token}
```

**Параметры:**
- `sector` — фильтр по сектору: Botanica, Ciocana
- `type` — фильтр по типу: BAZA, SCHIMB, EXAMEN, SUPERIOR

**Ответ (200 OK):**
```json
[
  {
    "id": 10,
    "userId": 1,
    "type": "BAZA",
    "sector": "Botanica",
    "availability": {
      "monday": ["09:00-10:00", "14:00-16:00"],
      "tuesday": ["09:00-10:00", "14:00-16:00"],
      // ...
    },
    "user": {
      "id": 1,
      "firstName": "Петр",
      "lastName": "Инструктов"
    }
  }
]
```

### Получить инструктора

```http
GET /api/instructors/:id
Authorization: Bearer {token}
```

### Получить расписание инструктора

```http
GET /api/instructors/:id/availability
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
{
  "monday": ["09:00-10:00", "14:00-16:00"],
  "tuesday": ["09:00-10:00", "14:00-16:00"],
  "wednesday": [],
  "thursday": ["10:00-12:00"],
  "friday": ["09:00-17:00"],
  "saturday": [],
  "sunday": []
}
```

### Создать инструктора

```http
POST /api/instructors
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": 1,
  "type": "BAZA",
  "sector": "Botanica",
  "availability": {
    "monday": ["09:00-10:00", "14:00-16:00"],
    // ...
  }
}
```

**Доступно только для:** ADMIN

### Обновить инструктора

```http
PATCH /api/instructors/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "SCHIMB",
  "availability": { /* новое расписание */ }
}
```

---

## 📅 Резервации (Reservations)

### Получить все резервации

```http
GET /api/reservations
Authorization: Bearer {token}
```

**Параметры:**
- `userId` — резервации студента
- `instructorId` — резервации инструктора
- `startDate` — фильтр по дате (YYYY-MM-DD)
- `endDate` — конец диапазона дат
- `status` — фильтр: confirmed, pending, cancelled

**Ответ (200 OK):**
```json
[
  {
    "id": 100,
    "userId": 1,
    "instructorId": 10,
    "startTime": "2024-08-20T14:00:00Z",
    "gearbox": "МКПП",
    "sector": "Botanica",
    "carId": 5,
    "isConfirmed": true,
    "isCancelled": false,
    "privateMessage": "Попросить объяснить повороты",
    "color": "#FF5733",
    "createdAt": "2024-08-14T10:00:00Z",
    "updatedAt": "2024-08-14T10:00:00Z",
    "deletedAt": null,
    "instructor": { /* данные инструктора */ },
    "car": { /* данные машины */ }
  }
]
```

### Получить резервацию

```http
GET /api/reservations/:id
Authorization: Bearer {token}
```

### Создать резервацию

```http
POST /api/reservations
Authorization: Bearer {token}
Content-Type: application/json

{
  "instructorId": 10,
  "startTime": "2024-08-20T14:00:00Z",
  "gearbox": "МКПП",
  "sector": "Botanica",
  "carId": 5,
  "privateMessage": "Попросить объяснить повороты"
}
```

**Ответ (201 Created):**
```json
{
  "id": 100,
  "userId": 1,
  "instructorId": 10,
  "startTime": "2024-08-20T14:00:00Z",
  // ...
}
```

**Проверки:**
- Студент не может иметь перекрывающихся резервации
- Инструктор не может иметь перекрывающихся резервации
- Время должно быть в будущем

### Обновить резервацию

```http
PATCH /api/reservations/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "startTime": "2024-08-20T15:00:00Z",
  "gearbox": "АКПП",
  "privateMessage": "Новое сообщение"
}
```

### Подтвердить резервацию

```http
PATCH /api/reservations/:id/confirm
Authorization: Bearer {token}
```

**Доступно только для:** INSTRUCTOR, ADMIN

### Отменить резервацию

```http
DELETE /api/reservations/:id
Authorization: Bearer {token}
```

**Эффект:** Мягкое удаление (устанавливается `deletedAt`)

### Получить историю резервации

```http
GET /api/reservations/:id/history
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "reservationId": 100,
    "action": "CREATE",
    "changedFields": null,
    "changedBy": 1,
    "createdAt": "2024-08-14T10:00:00Z",
    "changedByUser": { /* данные пользователя */ }
  },
  {
    "id": 2,
    "reservationId": 100,
    "action": "UPDATE",
    "changedFields": {
      "startTime": "2024-08-20T14:00:00Z -> 2024-08-20T15:00:00Z"
    },
    "changedBy": 1,
    "createdAt": "2024-08-14T11:00:00Z"
  }
]
```

---

## 🎯 Экзамены (Exams)

### Получить все вопросы

```http
GET /api/exams/questions
Authorization: Bearer {token}
```

**Параметры:**
- `categoryId` — фильтр по категории
- `limit` — количество вопросов (по умолчанию: 10)
- `offset` — смещение (пагинация)

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "text": "Acesta este un semn de avertisment?",
    "textRu": "Это знак предупреждения?",
    "correctAnswer": 1,
    "options": [
      "Da",
      "Nu",
      "Parțial"
    ],
    "image": "https://cdn.instruireauoto.site/questions/1.png",
    "categoryId": 5,
    "category": {
      "id": 5,
      "nameRo": "Semnele de circulație",
      "nameRu": "Дорожные знаки"
    }
  }
]
```

**Всего в системе:** 1008 вопросов

### Получить билеты для экзамена

```http
GET /api/exams/tickets
Authorization: Bearer {token}
```

**Параметры:**
- `type` — EXAM или PRACTICE (по умолчанию: EXAM)

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "ticketNumber": "B1",
    "type": "EXAM",
    "questions": [ /* 30 вопросов */ ]
  },
  // B2, B3, ..., B42
]
```

**Официальные билеты:** B1 до B42 для категории B

### Получить категории вопросов

```http
GET /api/exams/categories
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "nameRo": "Indicatoare rutiere",
    "nameRu": "Дорожные знаки"
  },
  {
    "id": 2,
    "nameRo": "Reguli de circulație",
    "nameRu": "Правила дорожного движения"
  },
  // ... всего ~20 категорий
]
```

### Начать экзамен

```http
POST /api/exams/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "EXAM",        // или PRACTICE
  "ticketNumber": "B1"   // для типа EXAM
}
```

**Ответ (201 Created):**
```json
{
  "id": 500,
  "userId": 1,
  "type": "EXAM",
  "status": "IN_PROGRESS",
  "ticketNumber": "B1",
  "correctAnswers": 0,
  "totalQuestions": 30,
  "questions": [
    {
      "id": 1,
      "text": "...",
      "textRu": "...",
      "options": ["...", "...", "..."],
      "image": "..."
    },
    // ... 30 вопросов
  ],
  "startedAt": "2024-08-14T14:00:00Z"
}
```

### Ответить на вопрос

```http
POST /api/exams/:examId/answer
Authorization: Bearer {token}
Content-Type: application/json

{
  "questionId": 1,
  "selectedAnswer": 1
}
```

**Ответ (200 OK):**
```json
{
  "isCorrect": true,
  "correctAnswer": 1,
  "score": 1
}
```

### Завершить экзамен

```http
POST /api/exams/:examId/submit
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
{
  "id": 500,
  "status": "COMPLETED",
  "correctAnswers": 28,
  "totalQuestions": 30,
  "percentage": 93.33,
  "passed": true,
  "passingScore": 24,
  "completedAt": "2024-08-14T14:50:00Z"
}
```

**Проход:** необходимо >= 80% правильных ответов (24 из 30)

### Получить результаты экзамена

```http
GET /api/exams/:id/results
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
{
  "id": 500,
  "correctAnswers": 28,
  "totalQuestions": 30,
  "percentage": 93.33,
  "passed": true,
  "completedAt": "2024-08-14T14:50:00Z",
  "answers": [
    {
      "questionId": 1,
      "selectedAnswer": 1,
      "correctAnswer": 1,
      "isCorrect": true
    }
  ]
}
```

### Получить разрешения студента на экзамен

```http
GET /api/exams/permissions/:userId
Authorization: Bearer {token}
```

**Доступно только для:** ADMIN, PROFESSOR

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "studentId": 1,
    "allowedAttempts": 3,
    "usedAttempts": 1,
    "validUntil": "2024-12-31T23:59:59Z",
    "status": "ACTIVE"
  }
]
```

---

## 📝 Заметки (Notes)

### Получить все заметки

```http
GET /api/notes
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Знаки приоритета",
    "content": "Важно помнить о знаках приоритета...",
    "createdAt": "2024-08-14T10:00:00Z",
    "updatedAt": "2024-08-14T10:00:00Z"
  }
]
```

### Создать заметку

```http
POST /api/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Знаки приоритета",
  "content": "Важно помнить о знаках приоритета..."
}
```

### Обновить заметку

```http
PATCH /api/notes/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Новое название",
  "content": "Новое содержание"
}
```

### Удалить заметку

```http
DELETE /api/notes/:id
Authorization: Bearer {token}
```

---

## 🎬 Практические экзамены (Practical Exam Slots)

### Генерировать слоты

```http
POST /api/practical-exam-slots/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "instructorId": 10,
  "startDate": "2024-09-01",
  "endDate": "2024-09-30",
  "timeSlots": ["09:00", "10:30", "14:00", "15:30"]
}
```

**Доступно только для:** ADMIN

### Получить доступные слоты

```http
GET /api/practical-exam-slots
Authorization: Bearer {token}
```

**Параметры:**
- `instructorId` — слоты инструктора
- `date` — конкретная дата

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "instructorId": 10,
    "date": "2024-09-01T09:00:00Z",
    "status": "AVAILABLE",
    "studentId": null,
    "reservedAt": null
  }
]
```

### Забронировать слот

```http
POST /api/practical-exam-slots/:id/book
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
{
  "id": 1,
  "status": "RESERVED",
  "studentId": 1,
  "reservedAt": "2024-08-14T14:00:00Z"
}
```

### Установить результат экзамена

```http
PATCH /api/practical-exam-slots/:id/result
Authorization: Bearer {token}
Content-Type: application/json

{
  "result": "PASSED",   // или FAILED, ABSENT
  "notes": "Хороший результат"
}
```

**Доступно только для:** INSTRUCTOR, ADMIN

---

## ⭐ Рейтинги инструкторов (Instructor Ratings)

### Оставить рейтинг

```http
POST /api/instructor-ratings
Authorization: Bearer {token}
Content-Type: application/json

{
  "reservationId": 100,
  "rating": 5,
  "comment": "Отличный инструктор, очень помог"
}
```

**Ограничения:**
- `rating` — число от 1 до 5
- Один рейтинг на резервацию
- Может оставить только студент, прошедший урок

**Ответ (201 Created):**
```json
{
  "id": 1,
  "reservationId": 100,
  "studentId": 1,
  "instructorId": 10,
  "rating": 5,
  "comment": "...",
  "createdAt": "2024-08-14T15:00:00Z"
}
```

### Получить рейтинги инструктора

```http
GET /api/instructor-ratings/:instructorId
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
{
  "averageRating": 4.7,
  "totalRatings": 15,
  "distribution": {
    "5": 12,
    "4": 2,
    "3": 1,
    "2": 0,
    "1": 0
  },
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "comment": "...",
      "student": { /* имя студента */ },
      "createdAt": "2024-08-14T15:00:00Z"
    }
  ]
}
```

### Получить статистику рейтингов (ADMIN)

```http
GET /api/instructor-ratings/stats/overview
Authorization: Bearer {token}
```

**Доступно только для:** ADMIN

**Ответ (200 OK):**
```json
[
  {
    "instructorId": 10,
    "instructorName": "Петр Инструктов",
    "averageRating": 4.7,
    "totalRatings": 15,
    "thisMonth": 5,
    "thisYear": 50
  }
]
```

---

## 🚗 Автомобили (Cars)

### Получить все машины

```http
GET /api/cars
Authorization: Bearer {token}
```

**Параметры:**
- `instructorId` — машины инструктора

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "plateNumber": "AB-123-CD",
    "gearbox": "МКПП",
    "instructorId": 10,
    "createdAt": "2024-08-14T10:00:00Z"
  }
]
```

### Добавить машину

```http
POST /api/cars
Authorization: Bearer {token}
Content-Type: application/json

{
  "plateNumber": "AB-123-CD",
  "gearbox": "МКПП",
  "instructorId": 10
}
```

**Доступно только для:** ADMIN

---

## 💬 Уведомления (Notifications)

### Получить уведомления

```http
GET /api/notifications
Authorization: Bearer {token}
```

**Ответ (200 OK):**
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Новое бронирование",
    "message": "Ваше бронирование на 14.08.2024 в 14:00 подтверждено",
    "type": "RESERVATION_CONFIRMED",
    "isRead": false,
    "createdAt": "2024-08-14T14:00:00Z"
  }
]
```

### Отметить как прочитанное

```http
PATCH /api/notifications/:id/read
Authorization: Bearer {token}
```

---

## 📊 Общая информация

### Статусы резервации

- `PENDING` — ожидание подтверждения
- `CONFIRMED` — подтверждено
- `CANCELLED` — отменено
- `COMPLETED` — завершено

### Типы действий в истории

- `CREATE` — создание
- `UPDATE` — изменение
- `DELETE` — удаление
- `CONFIRM` — подтверждение
- `CANCEL` — отмена

### Роли системы

- `USER` — студент
- `INSTRUCTOR` — инструктор
- `PROFESSOR` — преподаватель
- `MANAGER` — менеджер
- `ADMIN` — администратор

---

## 🚨 Коды ошибок

| Код | Описание |
|-----|---------|
| `400` | Неправильный запрос (validation error) |
| `401` | Неавторизированный (отсутствует токен) |
| `403` | Запрещено (недостаточно прав) |
| `404` | Не найдено |
| `409` | Конфликт (например, дублирование) |
| `500` | Ошибка сервера |

**Пример ошибки:**
```json
{
  "statusCode": 400,
  "message": "Это время уже забронировано",
  "error": "Bad Request"
}
```

---

## 📌 Примеры использования

### Полный цикл бронирования

```bash
# 1. Вход
curl -X POST http://localhost:8888/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "securePassword123"
  }'

# Сохраняем access_token

# 2. Создаем резервацию
curl -X POST http://localhost:8888/api/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instructorId": 10,
    "startTime": "2024-08-20T14:00:00Z",
    "gearbox": "МКПП",
    "sector": "Botanica"
  }'

# 3. Инструктор подтверждает
curl -X PATCH http://localhost:8888/api/reservations/100/confirm \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN"

# 4. После урока оставляем рейтинг
curl -X POST http://localhost:8888/api/instructor-ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": 100,
    "rating": 5,
    "comment": "Отличный инструктор"
  }'
```

### Полный цикл экзамена

```bash
# 1. Получить доступные билеты
curl -X GET "http://localhost:8888/api/exams/tickets?type=EXAM" \
  -H "Authorization: Bearer $TOKEN"

# 2. Начать экзамен (билет B1)
curl -X POST http://localhost:8888/api/exams/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "EXAM",
    "ticketNumber": "B1"
  }'

# Сохраняем exam ID (например, 500)

# 3. Ответить на вопросы (повторить для каждого)
curl -X POST http://localhost:8888/api/exams/500/answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": 1,
    "selectedAnswer": 1
  }'

# 4. Завершить экзамен
curl -X POST http://localhost:8888/api/exams/500/submit \
  -H "Authorization: Bearer $TOKEN"

# 5. Получить результаты
curl -X GET http://localhost:8888/api/exams/500/results \
  -H "Authorization: Bearer $TOKEN"
```

---

**Документация обновлена:** 14 августа 2024 г.
**Base URL:** `http://localhost:8888/api`
**Swagger UI:** `http://localhost:8888/api-docs`
