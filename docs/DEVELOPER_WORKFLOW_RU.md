# 🛠️ Руководство разработчика — Workflow и Best Practices

**Практическое руководство для разработчиков Instruire Auto Backend**

---

## 📋 Содержание

1. [Подготовка к работе](#подготовка-к-работе)
2. [Daily workflow](#daily-workflow)
3. [Разработка новой функции](#разработка-новой-функции)
4. [Git workflow](#git-workflow)
5. [Тестирование](#тестирование)
6. [Debugging](#debugging)
7. [Performance tips](#performance-tips)
8. [Code standards](#code-standards)
9. [Troubleshooting](#troubleshooting)

---

## Подготовка к работе

### Первый запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/instruire-auto/backend.git
cd instruire-auto--backend

# 2. Установить зависимости
npm install

# 3. Создать .env файл (скопировать шаблон)
cp .env.example .env

# Редактировать .env со своими значениями
# Минимум:
# - DATABASE_URL (локальная MySQL)
# - JWT_SECRET (любой секретный ключ для разработки)

# 4. Создать и применить миграции
npx prisma migrate dev

# 5. Запустить сервер
npm run start:dev

# 6. Проверить Swagger
# Открыть http://localhost:8888/api-docs
```

### IDE Setup (VS Code)

Рекомендуемые расширения:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",           // ESLint
    "esbenp.prettier-vscode",           // Code formatter
    "prisma.prisma",                    // Prisma support
    "orta.vscode-jest",                 // Jest testing
    "YoavBls.pretty-ts-errors",         // Better TS errors
    "bradlc.vscode-tailwindcss",        // Tailwind (если используется)
    "eamodio.gitlens"                   // Git integration
  ]
}
```

**Конфигурация VS Code (`.vscode/settings.json`):**

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "[prisma]": {
    "editor.defaultFormatter": "prisma.prisma"
  }
}
```

---

## Daily workflow

### Утренний чек-лист

```bash
# 1. Обновить ветку разработки
git fetch origin
git rebase origin/main

# 2. Установить новые зависимости (если были обновления)
npm install

# 3. Проверить миграции
npx prisma migrate dev

# 4. Запустить тесты (убедиться, что все работает)
npm test

# 5. Запустить линтер (проверить качество кода)
npm run lint

# 6. Запустить сервер
npm run start:dev
```

### Во время работы

```bash
# Сохранять и тестировать регулярно
npm run format        # Форматирование кода
npm run lint:fix      # Автоисправление eslint
npm test              # Юнит тесты
```

### В конце дня

```bash
# Перед commit убедиться:
npm run lint          # Нет lint ошибок
npm test              # Все тесты проходят
npm run format        # Код отформатирован

# Затем commit
git add .
git commit -m "feat: описание изменений"
git push
```

---

## Разработка новой функции

### Пример: добавление новой роли пользователя

#### Шаг 1: Обновить schema.prisma

```typescript
// prisma/schema.prisma

enum Role {
  USER
  INSTRUCTOR
  PROFESSOR
  MANAGER
  ADMIN
  SUPERVISOR  // ← Новая роль
}
```

#### Шаг 2: Создать миграцию

```bash
npx prisma migrate dev --name add_supervisor_role
```

#### Шаг 3: Обновить role.enum.ts

```typescript
// src/auth/role.enum.ts
export enum Role {
  USER = 'USER',
  INSTRUCTOR = 'INSTRUCTOR',
  PROFESSOR = 'PROFESSOR',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
}
```

#### Шаг 4: Обновить guards/policies

```typescript
// src/auth/roles.guard.ts
// Обновить логику проверки, если нужны специфические права

// Пример: SupervisorGuard
@Injectable()
export class SupervisorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return user && user.role === Role.SUPERVISOR;
  }
}
```

#### Шаг 5: Использовать в контроллере

```typescript
@Controller('supervisors')
export class SupervisorsController {
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  getSupervisorData(@Session() user: User) {
    // только для SUPERVISOR и ADMIN
  }
}
```

#### Шаг 6: Написать тесты

```typescript
describe('SupervisorGuard', () => {
  it('should allow supervisor access', () => {
    const user = { role: Role.SUPERVISOR };
    expect(guard.canActivate(user)).toBe(true);
  });

  it('should deny non-supervisor access', () => {
    const user = { role: Role.USER };
    expect(guard.canActivate(user)).toBe(false);
  });
});
```

### Пример: создание нового модуля (Payment)

#### Шаг 1: Создать структуру

```bash
mkdir -p src/payments/dto
touch src/payments/{payments.module.ts,payments.controller.ts,payments.service.ts}
touch src/payments/dto/{create-payment.dto.ts,update-payment.dto.ts}
touch src/payments/payments.service.spec.ts
```

#### Шаг 2: Обновить schema.prisma

```prisma
// prisma/schema.prisma
model Payment {
  id        Int       @id @default(autoincrement())
  userId    Int
  amount    Decimal   @db.Decimal(10, 2)
  currency  String    @default("MDL")
  status    PaymentStatus
  method    PaymentMethod
  reference String?   @unique
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  user      User      @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([status])
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CARD
  TRANSFER
  CASH
}
```

#### Шаг 3: Создать миграцию

```bash
npx prisma migrate dev --name add_payments_table
```

#### Шаг 4: Создать DTOs

```typescript
// src/payments/dto/create-payment.dto.ts
import { IsDecimal, IsEnum, ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Сумма платежа' })
  @IsDecimal()
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Идентификатор заказа' })
  @IsOptional()
  @IsString()
  reference?: string;
}
```

#### Шаг 5: Создать Service

```typescript
// src/payments/payments.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(userId: number, dto: CreatePaymentDto) {
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        status: 'PENDING',
      },
    });

    // Интеграция с платежной системой
    // await this.paymentGateway.process(payment);

    return payment;
  }

  async getPayments(userId: number) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayment(id: number, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment || payment.userId !== userId) {
      throw new BadRequestException('Платеж не найден');
    }

    return payment;
  }
}
```

#### Шаг 6: Создать Controller

```typescript
// src/payments/payments.controller.ts
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Session } from '../common/decorators/session.decorator';
import { User } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  async getPayments(@Session() user: User) {
    return this.service.getPayments(user.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  async createPayment(
    @Session() user: User,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.service.createPayment(user.id, dto);
  }
}
```

#### Шаг 7: Создать Module

```typescript
// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

#### Шаг 8: Добавить в AppModule

```typescript
// src/app.module.ts
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    // ... другие модули
    PaymentsModule,
  ],
})
export class AppModule {}
```

#### Шаг 9: Написать тесты

```typescript
// src/payments/payments.service.spec.ts
import { Test } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: { payment: { create: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a payment', async () => {
    const dto = { amount: 100, method: 'CARD' };
    jest.spyOn(prisma.payment, 'create').mockResolvedValue({
      id: 1,
      userId: 1,
      ...dto,
      status: 'PENDING',
    });

    const result = await service.createPayment(1, dto);
    expect(result.id).toBe(1);
  });
});
```

---

## Git workflow

### Branch naming convention

```bash
# Feature
git checkout -b feature/add-payments-module

# Bug fix
git checkout -b fix/resolve-timezone-issue

# Documentation
git checkout -b docs/api-reference

# Refactoring
git checkout -b refactor/optimize-database-queries

# Hotfix (из production)
git checkout -b hotfix/critical-payment-bug
```

### Commit messages

**Используйте Conventional Commits:**

```
feat: краткое описание новой функции
fix: краткое описание исправления
docs: обновление документации
refactor: рефакторинг кода
perf: улучшение производительности
test: добавление/обновление тестов
chore: обновления зависимостей, конфигурации
```

**Примеры:**

```bash
git commit -m "feat: add payment module with Stripe integration"
git commit -m "fix: resolve timezone issue in reservation creation"
git commit -m "docs: add API reference for payments endpoint"
git commit -m "refactor: extract UserContextService to common module"
git commit -m "perf: optimize reservation query with database indices"
git commit -m "test: add unit tests for PaymentsService"
```

### Pull request workflow

```bash
# 1. Создать feature branch
git checkout -b feature/new-feature
git push -u origin feature/new-feature

# 2. Сделать коммиты
git add .
git commit -m "feat: describe your changes"

# 3. Перед push обновить с main
git fetch origin
git rebase origin/main

# Если конфликты:
# - Решить конфликты в файлах
# - git add .
# - git rebase --continue

# 4. Push
git push

# 5. Создать PR в GitHub
# - Заполнить описание
# - Указать требующиеся рецензеры
# - Убедиться, что CI passes

# 6. После approve merge
# GitHub -> Squash and merge
```

---

## Тестирование

### Юнит тесты (Jest)

```bash
# Запустить все тесты
npm test

# Запустить конкретный тест
npm test PaymentsService

# Запустить с watch mode
npm run test:watch

# Генерировать coverage report
npm run test:cov
```

**Пример теста:**

```typescript
describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: PrismaService,
          useValue: {
            reservation: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(ReservationsService);
    prisma = module.get(PrismaService);
  });

  describe('createReservation', () => {
    it('should create reservation if no conflicts', async () => {
      const dto = {
        instructorId: 1,
        startTime: new Date(),
      };

      jest.spyOn(prisma.reservation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.reservation, 'create').mockResolvedValue({
        id: 1,
        ...dto,
      });

      const result = await service.createReservation(1, dto);
      expect(result.id).toBe(1);
    });

    it('should throw ConflictException if time slot taken', async () => {
      const dto = {
        instructorId: 1,
        startTime: new Date(),
      };

      jest.spyOn(prisma.reservation, 'findMany').mockResolvedValue([
        { id: 1, instructorId: 1, startTime: dto.startTime },
      ]);

      await expect(
        service.createReservation(1, dto),
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

### E2E тесты

```bash
# Запустить E2E тесты
npm run test:e2e

# Конкретный E2E тест
npm run test:e2e -- reservations
```

**Пример E2E теста:**

```typescript
describe('Reservations (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Получить токен
    const res = await request(app.getHttpServer())
      .post('/api/auth/signin')
      .send({
        email: 'test@test.com',
        password: 'password123',
      });

    jwtToken = res.body.access_token;
  });

  it('POST /reservations - should create reservation', () => {
    return request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        instructorId: 1,
        startTime: new Date('2024-09-01T14:00:00Z'),
        gearbox: 'МКПП',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.userId).toBe(1);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Тестирование API (curl)

```bash
# 1. Авторизация
curl -X POST http://localhost:8888/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'

# Сохраняем token в переменную
TOKEN="your_token_here"

# 2. Создать резервацию
curl -X POST http://localhost:8888/api/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instructorId": 1,
    "startTime": "2024-08-20T14:00:00Z",
    "gearbox": "МКПП"
  }'

# 3. Получить все резервации
curl -X GET http://localhost:8888/api/reservations \
  -H "Authorization: Bearer $TOKEN"
```

---

## Debugging

### VSCode Debugging

Создайте `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "restart": true,
      "port": 9229,
      "console": "integratedTerminal"
    }
  ]
}
```

Запустить debugger: `F5` или меню Run → Start Debugging

### Логирование

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async createPayment(userId: number, dto: CreatePaymentDto) {
    this.logger.log(`Creating payment for user ${userId}`);
    
    try {
      const payment = await this.prisma.payment.create({ /* ... */ });
      this.logger.debug(`Payment created: ${payment.id}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw error;
    }
  }
}
```

### Просмотр БД

```bash
# Открыть Prisma Studio GUI
npx prisma studio

# Доступно на: http://localhost:5555
```

---

## Performance tips

### 1. Оптимизация запросов

**❌ Плохо:**
```typescript
// N+1 problem
const users = await this.prisma.user.findMany();
for (const user of users) {
  const reservations = await this.prisma.reservation.findMany({
    where: { userId: user.id },
  });
}
```

**✅ Хорошо:**
```typescript
// Использовать include
const users = await this.prisma.user.findMany({
  include: {
    reservations: true,
  },
});
```

### 2. Индексы БД

```prisma
// prisma/schema.prisma
model Reservation {
  id        Int
  userId    Int
  startTime DateTime
  
  // Индексы для частых фильтров
  @@index([userId])
  @@index([instructorId])
  @@index([startTime])
  @@index([deletedAt])  // Важно для soft delete
}
```

### 3. Пагинация

```typescript
// Контроллер
@Get()
async getReservations(
  @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
) {
  return this.service.getReservations(skip, take);
}

// Сервис
async getReservations(skip: number, take: number) {
  return this.prisma.reservation.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}
```

### 4. Кеширование

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private prisma: PrismaService,
  ) {}

  async getCategories() {
    const cached = await this.cache.get('categories');
    if (cached) return cached;

    const categories = await this.prisma.questionCategory.findMany();
    await this.cache.set('categories', categories, 3600000); // 1 час
    return categories;
  }
}
```

---

## Code standards

### TypeScript

```typescript
// ✅ Используйте типы везде
const getUser = (id: number): Promise<User | null> => {
  return this.prisma.user.findUnique({ where: { id } });
};

// ✅ Используйте interfaces для структур
interface CreateReservationInput {
  instructorId: number;
  startTime: Date;
  gearbox: string;
}

// ✅ Используйте enums для фиксированных значений
enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

// ❌ Избегайте any
const getData = (data: any) => {}; // Плохо

// ✅ Используйте конкретные типы
const getData = (data: User | Reservation) => {}; // Хорошо
```

### Структура модулей

```
feature/
├── feature.module.ts          # Главный модуль
├── feature.controller.ts      # Endpoints
├── feature.service.ts         # Бизнес-логика
├── feature.service.spec.ts    # Тесты
├── dto/
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── filter-feature.dto.ts
├── guards/                    # Если нужны custom guards
│   └── feature.guard.ts
├── strategies/                # Если нужны custom strategies
│   └── feature.strategy.ts
└── interfaces/                # TypeScript interfaces
    └── feature.interface.ts
```

### Naming conventions

```typescript
// Services: {name}Service
export class PaymentsService {}

// Controllers: {name}Controller
export class PaymentsController {}

// Guards: {name}Guard
export class RolesGuard {}

// Interfaces: I{name} или {name}Interface
interface IPayment {}
interface PaymentInterface {}

// Constants: UPPER_SNAKE_CASE
const MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 5000;

// Methods: camelCase
async createPayment() {}
async getPaymentById() {}
async updatePaymentStatus() {}

// Classes: PascalCase
class PaymentProcessor {}
class ReservationValidator {}
```

### Error handling

```typescript
// ✅ Используйте встроенные исключения
throw new NotFoundException('Резервация не найдена');
throw new BadRequestException('Неверные данные');
throw new ConflictException('Время уже забронировано');
throw new ForbiddenException('Доступ запрещен');

// ❌ Не используйте throw new Error
throw new Error('Something went wrong');

// ✅ Добавляйте контекст к ошибкам
throw new BadRequestException(
  `Невозможно создать резервацию: время ${startTime} уже занято`,
);
```

---

## Troubleshooting

### Проблема: Тесты падают после обновления БД

```bash
# Решение: Сбросить БД (только в разработке!)
npx prisma migrate reset

# Или создать новую миграцию
npx prisma migrate dev
```

### Проблема: "Module not found"

```bash
# Убедиться, что tsconfig paths правильно сконфигурированы
# tsconfig.json содержит:
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@common/*": ["src/common/*"],
      "@modules/*": ["src/*"]
    }
  }
}

# Использование
import { UserContextService } from '@common/services';
```

### Проблема: Разные результаты в dev и prod

```bash
# Проверить переменные окружения
echo $NODE_ENV
echo $DATABASE_URL

# Убедиться, что используется правильная .env
cat .env

# Проверить, что используется NODE_ENV=production
NODE_ENV=production npm run start:prod
```

### Проблема: Slow queries

```bash
# 1. Открыть Prisma Studio
npx prisma studio

# 2. Проверить индексы
SHOW INDEXES FROM reservation;

# 3. Добавить недостающие индексы в schema.prisma
# 4. Создать миграцию
npx prisma migrate dev --name add_missing_indices
```

### Проблема: Памяти не хватает

```typescript
// Использовать streaming для больших наборов данных
async getLargeDataset() {
  return this.prisma.$queryRaw`
    SELECT * FROM reservation
    WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 YEAR)
  `;
}

// Или пагинировать
async getLargeDataset(page: number = 1, limit: number = 100) {
  const skip = (page - 1) * limit;
  return this.prisma.reservation.findMany({
    skip,
    take: limit,
  });
}
```

---

## 🔗 Полезные команды

```bash
# Разработка
npm run start:dev         # Запуск с hot-reload
npm run start:debug       # Запуск с debugger

# Качество кода
npm run lint              # Проверка ESLint
npm run lint:fix          # Автоисправление
npm run format            # Форматирование Prettier

# Тестирование
npm test                  # Юнит тесты
npm run test:watch        # Тесты с watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # E2E тесты

# База данных
npx prisma migrate dev        # Создать миграцию
npx prisma migrate deploy     # Применить в production
npx prisma generate           # Регенерировать Prisma Client
npx prisma studio             # Открыть GUI

# Production
npm run build             # Сборка
npm run start:prod        # Production режим

# Git
git status
git add .
git commit -m "message"
git push
git log --oneline         # История
git diff                  # Изменения
```

---

**Документация обновлена:** 14 августа 2024 г.
