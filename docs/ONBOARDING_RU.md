# 🚗 Instruire Auto — Руководство для новых разработчиков

**Instruire Auto** — это современная система управления автошколой, разработанная на **NestJS** с использованием **Prisma** и **MySQL**. Система предназначена для школы вождения в Молдове и поддерживает управление студентами, инструкторами, профессорами и администраторами.

**Развернуто на:** `instruireauto.site`

---

## 📋 Содержание

1. [Введение](#введение)
2. [Требования и установка](#требования-и-установка)
3. [Структура проекта](#структура-проекта)
4. [Ключевые концепции](#ключевые-концепции)
5. [Архитектура системы](#архитектура-системы)
6. [Аутентификация и авторизация](#аутентификация-и-авторизация)
7. [Основные модули](#основные-модули)
8. [Работа с базой данных](#работа-с-базой-данных)
9. [Типичные задачи](#типичные-задачи)
10. [Потенциальные проблемы](#потенциальные-проблемы)

---

## Введение

### Что это?

Instruire Auto — полнофункциональный backend для управления автошколой. Система предоставляет:

- 👥 **Управление пользователями** — студенты, инструкторы, профессора, администраторы
- 📅 **Система бронирования** — буквально занятия практического вождения
- 🎯 **Систему экзаменов** — 1008 вопросов, 42 билета (B1-B42), симуляция экзамена
- 🔐 **Безопасность** — JWT аутентификация, управление ролями
- 💬 **Уведомления** — система оповещения студентов и инструкторов
- 📊 **Аналитика** — рейтинги инструкторов, статистика экзаменов
- 💾 **Резервное копирование** — автоматические дневные резервные копии БД
- 🔗 **WebSocket** — реал-тайм обновления (в процессе разработки)

### Технологический стек

| Компонент | Версия/Описание |
|-----------|-----------------|
| **Framework** | NestJS 11+ |
| **ORM** | Prisma 6+ |
| **БД** | MySQL 8+ |
| **Auth** | JWT + Passport |
| **Тестирование** | Jest |
| **API docs** | Swagger/OpenAPI |
| **PDF** | Puppeteer + PDFKit |

---

## Требования и установка

### Системные требования

```bash
Node.js      >= 18.0.0
npm          >= 9.0.0
MySQL        >= 8.0
Git          (для версионирования)
```

### Шаг 1: Клонирование проекта

```bash
git clone https://github.com/instruire-auto/backend.git
cd instruire-auto--backend
```

### Шаг 2: Установка зависимостей

```bash
npm install
```

### Шаг 3: Конфигурация окружения

Создайте файл `.env` в корне проекта:

```bash
cp .env.example .env
```

Заполните переменные окружения:

```env
# База данных
DATABASE_URL="mysql://user:password@localhost:3306/instruire_auto"
SHADOW_DATABASE_URL="mysql://user:password@localhost:3306/instruire_auto_shadow"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="24h"

# Сервер
PORT=8888
NODE_ENV=development

# Email (Gmail SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM="Instruire Auto <noreply@instruireauoto.md>"

# Frontend URLs
CLIENT_URL=http://localhost:3000
FRONTEND_URL=https://instruireauto.site

# Chromium (для генерации PDF)
CHROME_BIN=/usr/bin/chromium-browser
```

### Шаг 4: Подготовка базы данных

```bash
# Применить миграции
npx prisma migrate dev

# Или в production:
npx prisma migrate deploy

# Открыть GUI для БД
npx prisma studio
```

### Шаг 5: Запуск сервера

```bash
# Режим разработки (watch mode)
npm run start:dev

# Production режим
npm run build
npm run start:prod

# Debug режим
npm run start:debug
```

Сервер будет доступен на: `http://localhost:8888`
Swagger документация: `http://localhost:8888/api-docs`

---

## Структура проекта

```
instruire-auto--backend/
├── src/
│   ├── auth/                    # Аутентификация, JWT, Passport
│   ├── users/                   # Управление пользователями
│   ├── groups/                  # Группы студентов с токенами приглашений
│   ├── instructors/             # Профили инструкторов, доступность
│   ├── instructors-group/       # Групповые инструкторы (секторы)
│   ├── reservations/            # Бронирование уроков вождения
│   ├── exams/                   # Жизненный цикл экзаменов, вопросы
│   ├── question-categories/     # Категории вопросов (двуязычные)
│   ├── notes/                   # Личные заметки студентов
│   ├── cars/                    # Управление автомобилями
│   ├── mail/                    # Email (Gmail + Handlebars templates)
│   ├── notifications/           # Уведомления пользователей
│   ├── contract/                # PDF контракты (Puppeteer)
│   ├── backup/                  # Автоматические резервные копии
│   ├── images/                  # Загрузка и управление изображениями
│   ├── ws/                      # WebSocket gateway (Socket.io)
│   ├── common/                  # Общие декораторы, сервисы
│   ├── prisma/                  # PrismaService
│   ├── instructor-ratings/      # Рейтинги инструкторов (1-5)
│   ├── instructor-substitutions/# Замены инструкторов по дням
│   ├── practical-exam-slots/    # Слоты практических экзаменов
│   ├── chat/                    # Чат между студентом и инструктором
│   ├── types/                   # TypeScript типы и augmentations
│   ├── app.module.ts            # Главный модуль приложения
│   ├── app.controller.ts        # Главный контроллер
│   ├── main.ts                  # Точка входа приложения
│   └── templates/               # Email шаблоны (Handlebars)
│
├── prisma/
│   ├── schema.prisma            # Prisma data model
│   └── migrations/              # История миграций БД
│
├── test/                        # E2E тесты
├── docs/                        # Документация
├── scripts/                     # Утилиты и скрипты
├── package.json                 # Зависимости проекта
├── tsconfig.json                # TypeScript конфигурация
├── eslint.config.mjs            # ESLint правила
├── .env                         # Переменные окружения (НЕ коммитить!)
└── README.md                    # Базовая документация
```

---

## Ключевые концепции

### 1. Модульная архитектура

Каждый модуль следует одинаковой структуре:

```
module/
├── module.module.ts           # NestJS модуль
├── module.controller.ts       # REST endpoints
├── module.service.ts          # Бизнес-логика
├── module.service.spec.ts     # Юнит тесты
└── dto/
    ├── create-module.dto.ts   # DTO для создания
    └── update-module.dto.ts   # DTO для обновления
```

**Пример структуры модуля:**

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],  // ⚠️ ВАЖНО: PrismaModule НЕ @Global
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### 2. Роли пользователей

Система использует 5 основных ролей:

| Роль | Описание | ID для запросов |
|------|---------|-----------------|
| `USER` | Студент автошколы | `user.id` |
| `INSTRUCTOR` | Инструктор по вождению | `user.instructorId` |
| `PROFESSOR` | Преподаватель теории | `user.id` (пока нет dedicatedId) |
| `MANAGER` | Менеджер школы | `user.id` |
| `ADMIN` | Администратор системы | `user.id` |

### 3. UserContextService

Сервис автоматически определяет, какой ID использовать в зависимости от роли:

```typescript
// Пример использования
constructor(private userContext: UserContextService) {}

async getUserData(user: User) {
  const relevantId = this.userContext.getRelevantId(user);
  // Для инструктора: вернет instructorId
  // Для студента: вернет userId
}
```

### 4. Двуязычность

Система поддерживает румынский и русский языки:

- Поля модели: `nameRo`, `nameRu` (без middleware i18n)
- Выбор языка происходит на стороне frontend
- Категории вопросов хранят обе версии в одной записи

### 5. Мягкое удаление (Soft Delete)

Вместо физического удаления используется флаг `deletedAt`:

```typescript
// Reservation имеет deletedAt: DateTime?
// При удалении: UPDATE reservation SET deletedAt = NOW()
// При запросе: WHERE deletedAt IS NULL (по умолчанию)
```

### 6. Аудит и история

Критические операции сохраняются в таблицах History:

```typescript
// ReservationHistory хранит:
- reservationId
- userId
- action (CREATE, UPDATE, DELETE)
- changedFields (JSON)
- changedBy (кто внес изменения)
- createdAt (когда)
```

---

## Архитектура системы

### Слой приложения (Application Layer)

```
Пользователь
    ↓
  [API Request]
    ↓
[Router: /api/users, /api/auth, etc.]
    ↓
[Guard: AuthGuard, RolesGuard]
    ↓
[Controller] → обработка HTTP
    ↓
[Service] → бизнес-логика
    ↓
[PrismaService] → запросы к БД
    ↓
  [MySQL Database]
```

### Жизненный цикл запроса

1. **Входящий запрос** → пример: `GET /api/users/123`
2. **Роутер** → поиск подходящего контроллера
3. **Guards** (охранники):
   - `AuthGuard('jwt')` — проверка токена
   - `RolesGuard` — проверка ролей
4. **Controller** → парсинг параметров, вызов сервиса
5. **Service** → бизнес-логика, валидация
6. **Prisma** → запрос к БД
7. **Response** — возврат результата клиенту

### Обработка ошибок

Используются встроенные NestJS исключения:

```typescript
// src/users/users.service.ts
async getUser(id: number) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    throw new NotFoundException(`Пользователь ${id} не найден`);
  }
  
  return user;
}
```

---

## Аутентификация и авторизация

### 1. Поток аутентификации

#### Регистрация (Sign Up)

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "securePassword123",
  "firstName": "Иван",
  "lastName": "Сидоров",
  "phone": "+373693123456"
}

# Ответ:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "firstName": "Иван",
    "role": "USER"
  }
}
```

#### Вход (Sign In)

```bash
POST /api/auth/signin
{
  "email": "student@example.com",
  "password": "securePassword123"
}

# Ответ: access_token + user data
```

#### Обновление токена (Refresh Token)

```bash
POST /api/auth/refresh
Authorization: Bearer {access_token}

# Получить новый token
```

### 2. Защита эндпоинтов

Используйте декораторы для защиты маршрутов:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from './role.enum';

@Controller('users')
export class UsersController {
  
  // Только аутентифицированные пользователи
  @Get()
  @UseGuards(AuthGuard('jwt'))
  getAllUsers() { }
  
  // Только администраторы
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  getUserById(@Param('id') id: number) { }
}
```

### 3. Получение текущего пользователя

Используйте кастомный декоратор `@Session()`:

```typescript
import { Session } from '../common/decorators/session.decorator';
import { User } from '@prisma/client';

@Get('profile')
@UseGuards(AuthGuard('jwt'))
getProfile(@Session() user: User) {
  // user содержит текущего аутентифицированного пользователя
  console.log(user.email, user.role);
}
```

### 4. JWT Конфигурация

```typescript
// Ключ для подписания токенов
JWT_SECRET=my-super-secret-key

// Время жизни токена
JWT_EXPIRATION=24h

// Payloald токена:
{
  "sub": 1,          // User ID
  "email": "user@example.com",
  "role": "USER",
  "iat": 1234567890,
  "exp": 1234654290
}
```

---

## Основные модули

### 📌 Auth Module

**Функции:** регистрация, вход, обновление токена

```bash
# Endpoints
POST   /api/auth/signup
POST   /api/auth/signin
POST   /api/auth/refresh
POST   /api/auth/password-reset
```

### 👥 Users Module

**Функции:** управление профилем, просмотр пользователей (ADMIN)

```bash
# Endpoints
GET    /api/users                 # Все пользователи (ADMIN)
GET    /api/users/:id             # Профиль пользователя
POST   /api/users                 # Создание пользователя (ADMIN)
PATCH  /api/users/:id             # Обновление профиля
DELETE /api/users/:id             # Удаление пользователя (ADMIN)
```

### 👨‍🎓 Groups Module

**Функции:** управление группами студентов, генерация токенов приглашений

```bash
# Endpoints
GET    /api/groups
POST   /api/groups                # Создать группу (ADMIN)
PATCH  /api/groups/:id            # Обновить группу
POST   /api/groups/:id/join       # Присоединиться по токену
```

**Важно:** каждая группа имеет уникальный `token` для присоединения студентов.

### 🚗 Instructors Module

**Функции:** профили инструкторов, доступность, секторы

```bash
# Endpoints
GET    /api/instructors
GET    /api/instructors/:id
POST   /api/instructors           # Создать инструктора (ADMIN)
PATCH  /api/instructors/:id       # Обновить профиль
GET    /api/instructors/:id/availability
```

**Типы инструкторов:**
- `BAZA` — основной инструктор
- `SCHIMB` — замещающий инструктор
- `EXAMEN` — экзаменатор
- `SUPERIOR` — старший инструктор

### 📅 Reservations Module

**Функции:** бронирование уроков вождения, конфликты расписания

```bash
# Endpoints
GET    /api/reservations
POST   /api/reservations          # Новое бронирование
PATCH  /api/reservations/:id      # Обновить время/инструктора
DELETE /api/reservations/:id      # Отменить (soft delete)
```

**Поля резервации:**
- `startTime` — дата и время начала урока
- `instructorId` — инструктор
- `gearbox` — МКПП или АКПП
- `sector` — Ботаника или Чокана
- `isConfirmed` — подтверждено ли
- `isCancelled` — отменено ли
- `deletedAt` — время удаления (мягкое удаление)

### 🎯 Exams Module

**Функции:** управление экзаменами, вопросы, билеты, разрешения

```bash
# Endpoints
GET    /api/exams/questions
GET    /api/exams/tickets         # Список билетов (B1-B42)
POST   /api/exams/start           # Начать экзамен
POST   /api/exams/:id/answer      # Ответить на вопрос
POST   /api/exams/:id/submit      # Завершить экзамен
GET    /api/exams/results/:id     # Результаты экзамена
```

**Структура вопроса:**
```typescript
{
  id: number;
  text: string;        // На румынском
  textRu: string;      // На русском
  correctAnswer: number; // 1, 2 или 3
  options: string[];
  image?: string;
  categoryId: number;
}
```

**Типы билетов:**
- `EXAM` — официальный экзамен
- `PRACTICE` — тренировка

**Контроль доступа:**
Таблица `StudentExamPermission` определяет:
- Кто может пройти экзамен
- Сколько попыток разрешено
- Дата истечения разрешения

### 📝 Notes Module

**Функции:** личные заметки студентов

```bash
# Endpoints
GET    /api/notes
POST   /api/notes               # Создать заметку
PATCH  /api/notes/:id           # Обновить заметку
DELETE /api/notes/:id           # Удалить заметку
```

### 🎬 Practical Exam Slots

**Функции:** управление слотами практических экзаменов

```bash
# Endpoints
POST   /api/practical-exam-slots/generate    # Генерировать слоты
GET    /api/practical-exam-slots             # Список доступных слотов
POST   /api/practical-exam-slots/:id/book    # Забронировать слот
POST   /api/practical-exam-slots/:id/result  # Установить результат
```

### ⭐ Instructor Ratings

**Функции:** рейтинги инструкторов (1-5 звезд)

```bash
# Endpoints
POST   /api/instructor-ratings           # Оставить отзыв
GET    /api/instructor-ratings/:id       # Рейтинг инструктора
GET    /api/instructor-ratings/stats     # Статистика (ADMIN)
```

**Важно:** каждая резервация может иметь только один рейтинг (`@@unique([reservationId])`).

---

## Работа с базой данных

### Prisma Commands

```bash
# Генерировать Prisma Client (после изменения schema.prisma)
npx prisma generate

# Создать новую миграцию и применить
npx prisma migrate dev --name add_new_field

# Применить миграции в production
npx prisma migrate deploy

# Просмотреть данные через GUI
npx prisma studio

# Сбросить БД (только в разработке!)
npx prisma migrate reset

# Просмотр статуса миграций
npx prisma migrate status
```

### Модель данных (ключевые таблицы)

```typescript
// User — основная таблица пользователей
model User {
  id: Int;
  email: String @unique;
  hash: String;
  firstName: String;
  lastName: String;
  role: Role;           // USER, INSTRUCTOR, PROFESSOR, MANAGER, ADMIN
  groupId: Int;         // Группа студента
  instructorProfile: Instructor?;  // Если инструктор
  // ...другие поля
}

// Instructor — профиль инструктора
model Instructor {
  id: Int;
  userId: Int @unique;  // Связь с User
  type: InstructorType; // BAZA, SCHIMB, EXAMEN, SUPERIOR
  sector: String;       // Botanica, Ciocana
  availability: Json;   // Расписание
  // ...
}

// Group — группа студентов
model Group {
  id: Int;
  name: String;
  token: String @unique;        // Для приглашения
  instructorId: Int;
  professorId: Int;
  users: User[];
}

// Reservation — бронирование урока
model Reservation {
  id: Int;
  userId: Int;
  instructorId: Int;
  startTime: DateTime;
  gearbox: String;
  sector: String;
  isConfirmed: Boolean;
  isCancelled: Boolean;
  deletedAt: DateTime?;  // Мягкое удаление
  history: ReservationHistory[];
  // ...
}

// Exam — экзамен
model Exam {
  id: Int;
  userId: Int;
  type: 'EXAM' | 'PRACTICE';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  correctAnswers: Int;
  totalQuestions: Int;
  // ...
}
```

### Примеры запросов

```typescript
// 1. Получить пользователя с его группой
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  include: {
    group: true,
    instructorProfile: true,
  },
});

// 2. Все резервации студента (не удаленные)
const reservations = await this.prisma.reservation.findMany({
  where: {
    userId: studentId,
    deletedAt: null,
  },
  include: {
    instructor: true,
    car: true,
  },
  orderBy: { startTime: 'desc' },
});

// 3. Резервации, конфликтующие с временем
const conflicts = await this.prisma.reservation.findMany({
  where: {
    instructorId: instructorId,
    startTime: {
      gte: new Date(startTime),
      lte: new Date(endTime),
    },
    deletedAt: null,
  },
});

// 4. История изменения резервации
const history = await this.prisma.reservationHistory.findMany({
  where: { reservationId: id },
  orderBy: { createdAt: 'desc' },
  include: { changedByUser: true },
});
```

### Миграции

```bash
# Создать новую миграцию
npx prisma migrate dev --name descriptive_migration_name

# Файл автоматически создается в prisma/migrations/
# Пример: prisma/migrations/20240814_add_new_field/migration.sql
```

**Важно в production:**
- Всегда используйте `npx prisma migrate deploy` (не dev)
- Требуется `shadowDatabaseUrl` в `.env` для безопасного плана миграции
- Тестируйте миграции на staging перед production

---

## Типичные задачи

### Создание нового модуля

1. **Создайте файлы модуля:**

```bash
mkdir -p src/my-feature/dto
touch src/my-feature/my-feature.module.ts
touch src/my-feature/my-feature.controller.ts
touch src/my-feature/my-feature.service.ts
touch src/my-feature/dto/create-my-feature.dto.ts
touch src/my-feature/dto/update-my-feature.dto.ts
```

2. **Напишите модуль:**

```typescript
// my-feature.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MyFeatureController } from './my-feature.controller';
import { MyFeatureService } from './my-feature.service';

@Module({
  imports: [PrismaModule],
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
  exports: [MyFeatureService],
})
export class MyFeatureModule {}
```

3. **Добавьте в app.module.ts:**

```typescript
import { MyFeatureModule } from './my-feature/my-feature.module';

@Module({
  imports: [MyFeatureModule, /* ...другие модули... */],
})
export class AppModule {}
```

### Добавление API endpoint

```typescript
// my-feature.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Session } from '../common/decorators/session.decorator';
import { User } from '@prisma/client';
import { MyFeatureService } from './my-feature.service';
import { CreateMyFeatureDto } from './dto/create-my-feature.dto';

@ApiTags('my-feature')
@Controller('my-feature')
export class MyFeatureController {
  constructor(private service: MyFeatureService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  async getAll(@Session() user: User) {
    return this.service.getAll(user.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  async create(
    @Session() user: User,
    @Body() dto: CreateMyFeatureDto,
  ) {
    return this.service.create(user.id, dto);
  }
}
```

### Создание DTO (Data Transfer Object)

```typescript
// create-my-feature.dto.ts
import { IsString, IsNotEmpty, IsOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CreateMyFeatureDto {
  @ApiProperty({ description: 'Имя признака' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Описание', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
```

### Работа с датами (временная зона Chisinau)

```typescript
import * as moment from 'moment-timezone';

// Правильно для Молдовы
const now = moment().tz('Europe/Chisinau').toDate();
const tomorrow = moment().tz('Europe/Chisinau').add(1, 'day').toDate();

// Нормализация даты (только дата, без времени)
function toUTCDate(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

// Пример: получить все резервации на сегодня
const today = moment().tz('Europe/Chisinau').startOf('day').toDate();
const tomorrow = moment(today).add(1, 'day').toDate();

const reservations = await this.prisma.reservation.findMany({
  where: {
    startTime: {
      gte: today,
      lt: tomorrow,
    },
  },
});
```

### Тестирование

```bash
# Юнит тесты (Jest)
npm test

# Смотреть изменения
npm run test:watch

# Coverage
npm run test:cov

# E2E тесты
npm run test:e2e
```

**Пример юнит теста:**

```typescript
// users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return a user', async () => {
    const mockUser = { id: 1, email: 'test@test.com' };
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

    const result = await service.getUser(1);
    expect(result).toEqual(mockUser);
  });
});
```

---

## Потенциальные проблемы

### ⚠️ Prisma Client не обновляется

**Проблема:** После изменения `schema.prisma` типы не обновляются в коде.

**Решение:**
```bash
# Регенерировать Prisma Client
npx prisma generate

# Или применить миграции (автоматически генерирует)
npx prisma migrate dev
```

### ⚠️ WebSocket соединение не работает

**Проблема:** WebSocket в `main.ts` закомментирован.

**Текущее состояние:** WebSocket функциональность скаффолдирована, но неактивна.

**Как включить:**
```typescript
// main.ts
const jwt = app.get(JwtService);
app.useWebSocketAdapter(new WsAdapter(jwt));  // Раскомментировать
```

### ⚠️ PrismaService не глобальный

**Проблема:** При добавлении нового модуля, который использует БД, может быть ошибка "PrismaService not found".

**Решение:** Всегда добавляйте `PrismaModule` в `imports`:

```typescript
@Module({
  imports: [PrismaModule],  // ✅ Важно!
  // ...
})
export class MyModule {}
```

### ⚠️ CORS ошибки при локальном тесте

**Проблема:** Фронтенд не может подключиться к бэкенду.

**Решение:** Добавьте ваш URL в `main.ts`:

```typescript
// main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',           // локальная разработка
    'https://instruireauto.site',      // production
    'http://31.97.76.142:3000',        // staging
  ],
  credentials: true,
});
```

### ⚠️ PDF генерация не работает (Puppeteer)

**Проблема:** "Failed to launch browser" при создании контрактов.

**Решение:**
```bash
# Установить Chromium
sudo apt-get install chromium-browser

# В .env установить путь
CHROME_BIN=/usr/bin/chromium-browser
```

### ⚠️ Email не отправляются

**Проблема:** "Authentication failed" при отправке через Gmail.

**Решение:**
1. Включите двухфакторную аутентификацию в Google Account
2. Сгенерируйте app password: https://myaccount.google.com/apppasswords
3. Используйте app password в `MAIL_PASS` (не обычный пароль)

### ⚠️ Дублирование модуля в app.module.ts

**Проблема:** `InstructorsModule` импортирован два раза.

**Текущее:** безопасно, но избегайте при добавлении новых модулей.

### ⚠️ Резервные копии не создаются

**Проблема:** Резервные копии не работают в назначенное время (03:00 Europe/Chisinau).

**Проверка:**
- Убедитесь, что `@nestjs/schedule` в `BackupModule`
- Не отключайте schedule module в `AppModule`
- Проверьте логи сервера

### ⚠️ Рейтинги инструкторов — дублирование

**Проблема:** Вторая попытка оставить рейтинг для той же резервации выдает `409 Conflict`.

**Причина:** Уникальное ограничение на `reservationId` в таблице `InstructorRating`.

**Решение:** Перед созданием рейтинга проверьте:
```typescript
const existing = await this.prisma.instructorRating.findUnique({
  where: { reservationId },
});

if (existing) {
  throw new ConflictException('Рейтинг уже оставлен');
}
```

### ⚠️ Замены инструкторов (Substitutions) — проблемы с датами

**Проблема:** Даты не совпадают при запросе/создании.

**Решение:** Всегда нормализуйте даты до UTC midnight:

```typescript
import { toUTCDate } from '../common/utils/date.utils';

// Создание замены
await this.prisma.instructorSubstitution.create({
  data: {
    date: toUTCDate(substitutionDate),
    // ...
  },
});

// Запрос
const substitutions = await this.prisma.instructorSubstitution.findMany({
  where: {
    date: toUTCDate(queryDate),
  },
});
```

### ⚠️ Практические экзамены — день недели

**Проблема:** Неправильный день недели при создании слотов.

**Важно:** `getUTCDay()` возвращает:
- `0` = Воскресенье
- `1` = Понедельник
- `6` = Суббота

**НЕ используйте `7` для воскресенья!**

### ⚠️ Миграции в production без shadow database

**Проблема:** `prisma migrate deploy` падает.

**Решение:** В `.env` добавьте:
```env
SHADOW_DATABASE_URL="mysql://user:password@localhost:3306/instruire_auto_shadow"
```

---

## 📚 Полезные ссылки и ресурсы

### Документация

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Passport.js Strategies](https://www.passportjs.org/packages/)

### Локальная разработка

```bash
# Стартовые команды
npm run start:dev         # Запуск в режиме разработки
npm run lint              # Проверка кода (ESLint)
npm run format            # Форматирование (Prettier)
npm test                  # Запуск тестов
npm run build             # Сборка для production

# База данных
npx prisma studio        # GUI для работы с БД
npx prisma migrate dev   # Новая миграция + применение
npx prisma db push       # Синхронизация schema с БД (без миграций)
```

### API документация

```
http://localhost:8888/api-docs
```

Используйте кнопку "Authorize" для ввода JWT токена и тестирования защищенных эндпоинтов.

---

## 🎓 Заключение

Вы теперь знаете основы системы Instruire Auto! Основные принципы:

✅ **Модульная архитектура** — каждый модуль независим
✅ **Role-based access control** — гранулярное управление доступом
✅ **Prisma ORM** — типобезопасные запросы к БД
✅ **API-first** — все через REST endpoints
✅ **Swagger документация** — автоматическая генерация API docs
✅ **Error handling** — встроенные NestJS исключения
✅ **Timezone aware** — правильная работа с датами (Europe/Chisinau)

**Если у вас есть вопросы:**
1. Проверьте документацию выше
2. Посмотрите существующий код в похожем модуле
3. Запустите `npx prisma studio` для исследования БД
4. Используйте Swagger UI для тестирования API

**Удачи в разработке! 🚗💪**
