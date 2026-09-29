# 🔧 Database Schema и Data Model — Полный справочник

**Детальное описание структуры базы данных Instruire Auto**

---

## 📋 Оглавление

1. [Таблица User](#таблица-user)
2. [Таблица Instructor](#таблица-instructor)
3. [Таблица Group](#таблица-group)
4. [Таблица Reservation](#таблица-reservation)
5. [Таблица Exam](#таблица-exam)
6. [Таблица StudentTicket](#таблица-studentticket)
7. [Таблица Car](#таблица-car)
8. [Таблица Payment (если есть)](#таблица-payment)
9. [Отношения между таблицами](#отношения-между-таблицами)
10. [Примеры запросов](#примеры-запросов)

---

## Таблица User

Основная таблица для всех пользователей системы.

```typescript
model User {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Аутентификация
  email               String                  @unique
  hash                String                  // bcrypt хеш пароля
  
  // Профиль
  firstName           String?                 @default("")
  lastName            String?                 @default("")
  phone               String?                 @default("")
  
  // Роль и группа
  role                Role                    @default(USER)
  groupId             Int?
  
  // Специфичные поля
  color               String?                 @default("")
  privateMessage      String?                 @default("")
  idnp                String?                 @default("")     // Личный номер
  
  // Изучение
  medical_documents   Boolean                 @default(false)
  individual_work     Boolean                 @default(false)
  number_of_absences  Int                     @default(0)
  canBookPracticalExam Boolean                @default(false)
  
  // Пожелания
  desiredInstructorId Int?
  
  // Отношения
  group               Group?                  @relation(fields: [groupId], references: [id])
  instructorProfile   Instructor?             @relation("UserInstructor")
  desiredInstructor   Instructor?             @relation("DesiredInstructor", fields: [desiredInstructorId], references: [id])
  
  // Одно-к-многим отношения
  exams               Exam[]
  reservations        Reservation[]
  notes               Note[]
  examPermissions     StudentExamPermission[]
  instructorRatings   InstructorRating[]
  
  // Meta
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  @@index([groupId])
  @@index([email])
}

enum Role {
  USER        // Студент
  INSTRUCTOR  // Инструктор по вождению
  PROFESSOR   // Преподаватель теории
  MANAGER     // Менеджер школы
  ADMIN       // Администратор
}
```

### Основные операции

```typescript
// Получить пользователя со всеми данными
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    group: true,
    instructorProfile: true,
    reservations: {
      where: { deletedAt: null },
      include: { instructor: true, car: true }
    },
    exams: true,
    examPermissions: true,
  },
});

// Получить студентов группы
const students = await prisma.user.findMany({
  where: {
    groupId: groupId,
    role: Role.USER,
  },
});

// Обновить профиль пользователя
const updated = await prisma.user.update({
  where: { id: userId },
  data: {
    firstName: 'Иван',
    lastName: 'Сидоров',
    phone: '+373693123456',
  },
});

// Проверить, может ли пользователь сдавать практический экзамен
const canBook = user.canBookPracticalExam === true;
if (!canBook) {
  throw new ForbiddenException('У вас нет разрешения на практический экзамен');
}
```

---

## Таблица Instructor

Профиль инструктора, связана с User через отношение 1:1.

```typescript
model Instructor {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Связь с пользователем
  userId              Int                     @unique
  
  // Классификация
  type                InstructorType
  sector              String                  // Botanica, Ciocana
  
  // Расписание (хранится как JSON)
  availability        Json                    // { "monday": ["09:00-10:00"], ... }
  
  // Отношения
  user                User                    @relation("UserInstructor", fields: [userId], references: [id])
  groups              Group[]
  reservations        Reservation[]
  cars                Car[]
  ratings             InstructorRating[]
  substitutions       InstructorSubstitution[]
  practicalSlots      PracticalExamSlot[]
  
  // Meta
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  @@index([userId])
  @@index([type])
  @@index([sector])
}

enum InstructorType {
  BAZA      // Основной инструктор
  SCHIMB    // Замещающий инструктор (может быть заменой)
  EXAMEN    // Экзаменатор
  SUPERIOR  // Старший инструктор
}
```

### Основные операции

```typescript
// Получить инструктора с его данными
const instructor = await prisma.instructor.findUnique({
  where: { id: instructorId },
  include: {
    user: true,
    reservations: { 
      where: { deletedAt: null, startTime: { gte: today } },
      orderBy: { startTime: 'asc' },
    },
    ratings: true,
    cars: true,
  },
});

// Получить расписание инструктора
const availability = instructor.availability; // JSON объект
// Пример структуры:
{
  "monday": ["09:00-10:00", "14:00-16:00"],
  "tuesday": ["09:00-10:00", "14:00-16:00"],
  "wednesday": [],
  "thursday": ["10:00-12:00"],
  "friday": ["09:00-17:00"],
  "saturday": [],
  "sunday": []
}

// Получить инструкторов по типу и сектору
const instructors = await prisma.instructor.findMany({
  where: {
    type: InstructorType.BAZA,
    sector: 'Botanica',
  },
  include: { user: true },
});

// Получить среднюю оценку инструктора
const ratings = await prisma.instructorRating.findMany({
  where: { instructorId },
});
const average = ratings.reduce((a, b) => a + b.rating, 0) / ratings.length;

// Получить замены инструктора
const substitutions = await prisma.instructorSubstitution.findMany({
  where: {
    substitutorId: instructorId,
    date: { gte: today },
  },
});
```

---

## Таблица Group

Группы студентов, связанные с инструктором и профессором.

```typescript
model Group {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Данные группы
  name                String                  // Название: "Гр. 101 - B1"
  token               String                  @unique  // nanoid для приглашения
  
  // Связи с преподавателями
  instructorId        Int?                    // Инструктор по вождению
  professorId         Int?                    // Преподаватель теории
  
  // Отношения
  instructor          Instructor?             @relation(fields: [instructorId], references: [id])
  professor           User?                   @relation("ProfessorGroups", fields: [professorId], references: [id])
  users               User[]                  // Студенты в группе
  
  // Meta
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  @@index([instructorId])
  @@index([token])
}
```

### Основные операции

```typescript
// Создать новую группу с токеном приглашения
const group = await prisma.group.create({
  data: {
    name: 'Гр. 101 - B1',
    token: generateToken(), // nanoid('16')
    instructorId: 10,
    professorId: 5,
  },
});

// Получить группу со студентами
const group = await prisma.group.findUnique({
  where: { id: groupId },
  include: {
    users: true,
    instructor: { include: { user: true } },
    professor: true,
  },
});

// Присоединиться к группе по токену
const group = await prisma.group.findUnique({
  where: { token: joinToken },
});

if (!group) {
  throw new BadRequestException('Неверный токен приглашения');
}

const updated = await prisma.user.update({
  where: { id: userId },
  data: { groupId: group.id },
});

// Получить все группы с их составом
const allGroups = await prisma.group.findMany({
  include: {
    users: {
      select: { id: true, firstName: true, lastName: true }
    },
    instructor: { include: { user: true } },
  },
  orderBy: { name: 'asc' },
});
```

---

## Таблица Reservation

Бронирование уроков вождения с поддержкой мягкого удаления и аудита.

```typescript
model Reservation {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Ключи
  userId              Int
  instructorId        Int?
  carId               Int?
  instructorsGroupId  Int?
  
  // Параметры урока
  startTime           DateTime
  gearbox             String?                 @default("")   // МКПП или АКПП
  sector              String?                 @default("")   // Botanica, Ciocana
  privateMessage      String?                 @default("")   // Пожелания студента
  
  // UI персонализация
  color               String?                 @default("")
  isFavorite          Boolean                 @default(false)
  isImportant         Boolean                 @default(false)
  
  // Статусы
  isConfirmed         Boolean                 @default(false)
  isCancelled         Boolean                 @default(false)
  
  // Мягкое удаление
  deletedAt           DateTime?
  
  // Отношения
  user                User                    @relation(fields: [userId], references: [id])
  instructor          Instructor?             @relation(fields: [instructorId], references: [id])
  car                 Car?                    @relation(fields: [carId], references: [id])
  instructorsGroup    InstructorsGroup?       @relation(fields: [instructorsGroupId], references: [id])
  history             ReservationHistory[]
  rating              InstructorRating?       // После урока
  
  // Meta
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  @@index([userId])
  @@index([instructorId])
  @@index([startTime])
  @@index([deletedAt])  // Критично для soft delete
}
```

### Основные операции

```typescript
// Создать резервацию с проверкой конфликтов
async function createReservation(userId: number, dto: CreateReservationDto) {
  // Проверить конфликты с инструктором
  const conflicts = await prisma.reservation.findMany({
    where: {
      instructorId: dto.instructorId,
      startTime: { gte: startTime, lte: endTime },
      deletedAt: null,
    },
  });

  if (conflicts.length > 0) {
    throw new ConflictException('Это время уже занято');
  }

  // Создать резервацию
  return prisma.reservation.create({
    data: {
      userId,
      instructorId: dto.instructorId,
      startTime: dto.startTime,
      gearbox: dto.gearbox,
      sector: dto.sector,
      carId: dto.carId,
    },
    include: { instructor: true, car: true },
  });
}

// Получить резервации студента
const reservations = await prisma.reservation.findMany({
  where: {
    userId,
    deletedAt: null,  // Только активные
  },
  include: {
    instructor: { include: { user: true } },
    car: true,
    history: { orderBy: { createdAt: 'desc' }, take: 5 },
  },
  orderBy: { startTime: 'desc' },
});

// Подтвердить резервацию (инструктор)
const confirmed = await prisma.reservation.update({
  where: { id: reservationId },
  data: { isConfirmed: true },
});

// Записать изменение в историю
await prisma.reservationHistory.create({
  data: {
    reservationId,
    userId,
    action: 'UPDATE',
    changedBy: instructorId,
    changedFields: {
      isConfirmed: `false -> true`,
    },
    // Копируем все текущие данные
    instructorId: confirmed.instructorId,
    startTime: confirmed.startTime,
    // ...
  },
});

// Мягко удалить резервацию
await prisma.reservation.update({
  where: { id: reservationId },
  data: { deletedAt: new Date(), isCancelled: true },
});

// Получить историю резервации
const history = await prisma.reservationHistory.findMany({
  where: { reservationId },
  orderBy: { createdAt: 'desc' },
  include: { changedByUser: true },
});
```

---

## Таблица Exam

Экзамены студентов, может быть тип EXAM или PRACTICE.

```typescript
model Exam {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Связи
  userId              Int
  
  // Тип и статус
  type                String                  // 'EXAM' или 'PRACTICE'
  status              ExamStatus
  ticketNumber        String?                 // Для типа EXAM: B1-B42
  
  // Результаты
  correctAnswers      Int                     @default(0)
  totalQuestions      Int
  percentage          Float?
  passed              Boolean?
  
  // Временные метки
  startedAt           DateTime                @default(now())
  completedAt         DateTime?
  timeSpent           Int?                    // Секунды
  
  // Отношения
  user                User                    @relation(fields: [userId], references: [id])
  answers             StudentAnswer[]
  permissions         StudentExamPermission[] @relation("ExamPermission")
  
  // Meta
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  @@index([userId])
  @@index([type])
  @@index([status])
}

enum ExamStatus {
  IN_PROGRESS
  COMPLETED
  FAILED
  ABANDONED
}
```

### Основные операции

```typescript
// Начать экзамен
const exam = await prisma.exam.create({
  data: {
    userId,
    type: 'EXAM',
    ticketNumber: 'B1',
    status: 'IN_PROGRESS',
    totalQuestions: 30,
  },
});

// Получить случайные вопросы для билета
const questions = await prisma.question.findMany({
  where: {
    tickets: {
      some: { ticketNumber: 'B1' },
    },
  },
  select: {
    id: true,
    text: true,
    textRu: true,
    options: true,
    image: true,
  },
});

// Сохранить ответ
await prisma.studentAnswer.create({
  data: {
    examId,
    questionId,
    selectedAnswer,
    isCorrect: selectedAnswer === question.correctAnswer,
  },
});

// Завершить экзамен и рассчитать результат
const answers = await prisma.studentAnswer.findMany({
  where: { examId },
});

const correctCount = answers.filter(a => a.isCorrect).length;
const percentage = (correctCount / answers.length) * 100;
const passed = percentage >= 80; // 24 из 30 = 80%

const completed = await prisma.exam.update({
  where: { id: examId },
  data: {
    status: passed ? 'COMPLETED' : 'FAILED',
    correctAnswers: correctCount,
    passed,
    percentage,
    completedAt: new Date(),
  },
});

// Получить результаты экзамена
const result = await prisma.exam.findUnique({
  where: { id: examId },
  include: {
    answers: {
      include: { question: true },
    },
  },
});
```

---

## Таблица StudentTicket

Связь студента с билетами экзамена для отслеживания прогресса.

```typescript
model StudentTicket {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Связи
  userId              Int
  ticketNumber        String                  // B1-B42
  
  // Статус
  attempts            Int                     @default(0)
  bestScore           Int?
  lastAttemptAt       DateTime?
  completed           Boolean                 @default(false)
  
  // Отношения
  user                User                    @relation(fields: [userId], references: [id])
  
  // Meta
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  @@unique([userId, ticketNumber])  // Один билет на студента
  @@index([userId])
}
```

### Основные операции

```typescript
// Отслеживание попыток сдачи билета
const ticket = await prisma.studentTicket.upsert({
  where: {
    userId_ticketNumber: {
      userId,
      ticketNumber: 'B1',
    },
  },
  create: {
    userId,
    ticketNumber: 'B1',
    attempts: 1,
    bestScore: percentage,
    lastAttemptAt: new Date(),
    completed: percentage >= 80,
  },
  update: {
    attempts: { increment: 1 },
    lastAttemptAt: new Date(),
    bestScore: percentage > (existing.bestScore || 0) ? percentage : undefined,
    completed: percentage >= 80 || existing.completed,
  },
});

// Получить прогресс студента
const tickets = await prisma.studentTicket.findMany({
  where: { userId },
  orderBy: { ticketNumber: 'asc' },
});

const completed = tickets.filter(t => t.completed).length;
const progress = (completed / 42) * 100; // 42 билета всего
```

---

## Таблица Car

Автомобили, привязанные к инструкторам.

```typescript
model Car {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Данные автомобиля
  plateNumber         String                  @unique
  gearbox             String?                 // МКПП или АКПП
  
  // Связь с инструктором
  instructorId        Int?
  
  // Отношения
  instructor          Instructor?             @relation(fields: [instructorId], references: [id])
  reservations        Reservation[]
  
  // Meta
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  @@index([instructorId])
  @@index([plateNumber])
}
```

### Основные операции

```typescript
// Добавить машину инструктору
const car = await prisma.car.create({
  data: {
    plateNumber: 'AB-123-CD',
    gearbox: 'МКПП',
    instructorId,
  },
});

// Получить машины инструктора
const cars = await prisma.car.findMany({
  where: { instructorId },
});

// Удалить машину
await prisma.car.delete({
  where: { id: carId },
});
```

---

## Таблица StudentExamPermission

Контроль доступа к экзаменам (попытки, сроки действия).

```typescript
model StudentExamPermission {
  // Первичный ключ
  id                  Int                     @id @default(autoincrement())
  
  // Связи
  studentId           Int
  
  // Параметры разрешения
  allowedAttempts     Int
  usedAttempts        Int                     @default(0)
  validUntil          DateTime
  
  // Отношения
  student             User                    @relation(fields: [studentId], references: [id])
  
  @@index([studentId])
  @@index([validUntil])
}
```

### Основные операции

```typescript
// Выдать разрешение на экзамен
const permission = await prisma.studentExamPermission.create({
  data: {
    studentId,
    allowedAttempts: 3,
    validUntil: new Date('2024-12-31'),
  },
});

// Проверить разрешение перед экзаменом
const permission = await prisma.studentExamPermission.findFirst({
  where: {
    studentId,
    validUntil: { gte: new Date() },
    usedAttempts: { lt: db.schema.allowedAttempts },
  },
});

if (!permission) {
  throw new ForbiddenException('Вы не имеете разрешения на экзамен');
}

// Записать попытку
await prisma.studentExamPermission.update({
  where: { id: permission.id },
  data: { usedAttempts: { increment: 1 } },
});
```

---

## Отношения между таблицами

### Диаграмма связей

```
User (студент)
├── group → Group
├── instructorProfile → Instructor (если инструктор)
├── desiredInstructor → Instructor
├── reservations → Reservation[]
├── exams → Exam[]
├── notes → Note[]
└── examPermissions → StudentExamPermission[]

Instructor
├── user → User (1:1)
├── groups → Group[] (1:многие)
├── reservations → Reservation[]
├── cars → Car[]
├── ratings → InstructorRating[]
└── substitutions → InstructorSubstitution[]

Group
├── instructor → Instructor
├── professor → User
└── users → User[]

Reservation
├── user → User
├── instructor → Instructor
├── car → Car
└── history → ReservationHistory[]

Exam
├── user → User
└── answers → StudentAnswer[]

Car
├── instructor → Instructor
└── reservations → Reservation[]
```

---

## Примеры запросов

### Получить полные данные студента

```typescript
const student = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    group: {
      include: {
        instructor: { include: { user: true } },
        professor: true,
      },
    },
    reservations: {
      where: { deletedAt: null },
      include: {
        instructor: { include: { user: true } },
        car: true,
      },
      orderBy: { startTime: 'desc' },
    },
    exams: {
      include: { answers: true },
      orderBy: { createdAt: 'desc' },
    },
    notes: {
      orderBy: { createdAt: 'desc' },
    },
    examPermissions: {
      where: { validUntil: { gte: new Date() } },
    },
  },
});
```

### Получить загруженность инструктора на неделю

```typescript
const startOfWeek = moment().tz('Europe/Chisinau').startOf('week').toDate();
const endOfWeek = moment(startOfWeek).add(7, 'days').toDate();

const reservations = await prisma.reservation.findMany({
  where: {
    instructorId,
    startTime: {
      gte: startOfWeek,
      lt: endOfWeek,
    },
    deletedAt: null,
  },
  include: { user: true, car: true },
  orderBy: { startTime: 'asc' },
});

// Группировать по дням
const byDay = {};
reservations.forEach(res => {
  const day = moment(res.startTime).format('YYYY-MM-DD');
  if (!byDay[day]) byDay[day] = [];
  byDay[day].push(res);
});
```

### Получить статистику по экзаменам

```typescript
const statistics = await prisma.exam.groupBy({
  by: ['type', 'status'],
  where: {
    createdAt: { gte: startOfMonth },
  },
  _count: true,
});

// Результат:
// [
//   { type: 'EXAM', status: 'COMPLETED', _count: 15 },
//   { type: 'EXAM', status: 'FAILED', _count: 3 },
//   { type: 'PRACTICE', status: 'COMPLETED', _count: 50 },
// ]
```

### Получить рейтинги инструктора

```typescript
const ratings = await prisma.instructorRating.findMany({
  where: { instructorId },
  include: { student: { select: { firstName: true, lastName: true } } },
  orderBy: { createdAt: 'desc' },
});

const average =
  ratings.reduce((a, b) => a + b.rating, 0) / ratings.length;

return {
  instructorId,
  averageRating: average.toFixed(1),
  totalRatings: ratings.length,
  reviews: ratings,
};
```

---

## Миграции и версионирование

```bash
# Просмотреть все миграции
ls prisma/migrations/

# Пример структуры:
# prisma/migrations/
# ├── 20240101120000_init/migration.sql
# ├── 20240105143000_add_user_roles/migration.sql
# ├── 20240110093000_create_reservations/migration.sql
# └── 20240114102000_add_soft_delete/migration.sql

# Просмотреть конкретную миграцию
cat prisma/migrations/20240114102000_add_soft_delete/migration.sql

# Откатить последнюю миграцию (только в разработке!)
npx prisma migrate resolve --rolled-back 20240114102000_add_soft_delete
```

---

**Документация обновлена:** 14 августа 2024 г.
