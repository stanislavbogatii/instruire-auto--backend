# ⚡ Быстрый старт и FAQ

**Шпаргалка для новых разработчиков**

---

## 🚀 Быстрый старт (5 минут)

### Шаг 1: Установка

```bash
# Клонировать
git clone https://github.com/instruire-auto/backend.git
cd instruire-auto--backend

# Установить зависимости
npm install
```

### Шаг 2: Конфигурация

```bash
# Создать .env файл
cat > .env << EOF
DATABASE_URL="mysql://root:password@localhost:3306/instruire_auto"
JWT_SECRET="dev-secret-key-change-in-production"
PORT=8888
NODE_ENV=development
MAIL_USER="your-email@gmail.com"
MAIL_PASS="app-password"
CLIENT_URL="http://localhost:3000"
CHROME_BIN="/usr/bin/chromium-browser"
EOF
```

### Шаг 3: База данных

```bash
# Инициализировать БД
npx prisma migrate dev

# (Опционально) Открыть GUI для просмотра
npx prisma studio
```

### Шаг 4: Запуск

```bash
# Запустить сервер
npm run start:dev

# Сервер доступен на:
# http://localhost:8888
# API Swagger: http://localhost:8888/api-docs
```

---

## 📚 Структура проекта за 1 минуту

```
src/
├── auth/              ← Вход, регистрация
├── users/             ← Профили пользователей
├── groups/            ← Группы студентов
├── instructors/       ← Профили инструкторов
├── reservations/      ← Бронирование уроков
├── exams/             ← Экзамены и вопросы
├── cars/              ← Управление машинами
├── notes/             ← Заметки студентов
├── mail/              ← Email отправка
├── backup/            ← Резервные копии БД
└── common/            ← Общие сервисы и декораторы
```

**Каждый модуль имеет:**
- `module.ts` — конфигурация
- `controller.ts` — endpoints
- `service.ts` — логика
- `dto/` — структуры данных
- `*.spec.ts` — тесты

---

## 💡 Типичные задачи

### Получить текущего пользователя

```typescript
import { Session } from '@common/decorators/session.decorator';
import { User } from '@prisma/client';

@Get('profile')
@UseGuards(AuthGuard('jwt'))
getProfile(@Session() user: User) {
  // user уже содержит текущего пользователя
  console.log(user.email);
}
```

### Защитить endpoint определенной ролью

```typescript
@Post()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
createUser(@Body() dto: CreateUserDto) {
  // Только ADMIN и MANAGER имеют доступ
}
```

### Проверить конфликт времени резервации

```typescript
const conflicts = await this.prisma.reservation.findMany({
  where: {
    instructorId,
    startTime: {
      gte: new Date(startTime),
      lte: new Date(endTime),
    },
    deletedAt: null,  // Учитывать только активные
  },
});

if (conflicts.length > 0) {
  throw new ConflictException('Время уже занято');
}
```

### Работать с датами (Molдовский timezone)

```typescript
import * as moment from 'moment-timezone';

// Текущее время в Chisinau
const now = moment().tz('Europe/Chisinau').toDate();

// Завтра в 14:00 Chisinau
const tomorrow14 = moment()
  .tz('Europe/Chisinau')
  .add(1, 'day')
  .set({ hour: 14, minute: 0, second: 0 })
  .toDate();

// Нормализовать дату (только дата, без времени)
const dateOnly = moment(date)
  .tz('Europe/Chisinau')
  .startOf('day')
  .toDate();
```

### Отправить email

```typescript
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class PaymentService {
  constructor(private mailer: MailerService) {}

  async sendPaymentReceipt(email: string, amount: number) {
    await this.mailer.sendMail({
      to: email,
      subject: 'Квитанция оплаты',
      template: 'payment-receipt', // src/templates/payment-receipt.hbs
      context: {
        amount,
        date: new Date(),
      },
    });
  }
}
```

### Генерировать PDF контракт

```typescript
import { PuppeteerService } from '@contract/puppeteer.service';

const pdf = await this.puppeteer.generatePDF({
  html: contractHtml,
  format: 'A4',
});

// Сохранить или отправить
```

---

## ❌ Частые ошибки и как их избежать

### ❌ Ошибка: "PrismaService not found"

```typescript
// ❌ Неправильно — PrismaModule не импортирован
@Module({
  controllers: [MyController],
  providers: [MyService],
})
export class MyModule {}

// ✅ Правильно — PrismaModule ВСЕГДА импортируется
@Module({
  imports: [PrismaModule],  // ← ВАЖНО
  controllers: [MyController],
  providers: [MyService],
})
export class MyModule {}
```

### ❌ Ошибка: "Cannot read property 'instructorId' of null"

```typescript
// ❌ Неправильно — UserContextService для PROFESSOR может вернуть null
const relevantId = this.userContext.getRelevantId(user); // Может быть undefined

// ✅ Правильно — проверить перед использованием
if (!relevantId) {
  throw new BadRequestException('Невалидные данные пользователя');
}
```

### ❌ Ошибка: "CORS error"

```typescript
// ❌ Сервер не видит frontend
// CORS не настроен в main.ts

// ✅ Проверить в src/main.ts
app.enableCors({
  origin: ['http://localhost:3000', 'https://instruireauto.site'],
  credentials: true,
});
```

### ❌ Ошибка: Резервация перекрывает другую

```typescript
// ❌ Неправильно — не проверяется startTime и endTime
const conflicts = await this.prisma.reservation.findMany({
  where: { instructorId },  // Только фильтр по инструктору
});

// ✅ Правильно — проверяется диапазон времени
const conflicts = await this.prisma.reservation.findMany({
  where: {
    instructorId,
    startTime: {
      gte: new Date(startTime),
      lte: new Date(endTime),  // Или вычислить endTime
    },
    deletedAt: null,  // Не учитывать удаленные
  },
});
```

### ❌ Ошибка: PDF не создается

```bash
# Ошибка: "Failed to launch browser"

# ✅ Установить Chromium
sudo apt-get install chromium-browser

# ✅ В .env указать путь
CHROME_BIN=/usr/bin/chromium-browser

# ✅ Перезапустить сервер
npm run start:dev
```

### ❌ Ошибка: Email не отправляется

```bash
# Ошибка: "Authentication failed"

# ✅ Использовать app password, не обычный пароль
# Перейти на https://myaccount.google.com/apppasswords
# Выбрать Mail и Windows (или другое приложение)
# Использовать сгенерированный пароль в MAIL_PASS

# ✅ Перепроверить данные в .env
MAIL_USER="your-email@gmail.com"
MAIL_PASS="generated-app-password"  # ← 16-символьный пароль из Google
```

### ❌ Ошибка: Миграция не работает в production

```bash
# Ошибка: "Could not create shadow database"

# ✅ Добавить shadow database в .env
DATABASE_URL="mysql://user:pass@localhost:3306/instruire_auto"
SHADOW_DATABASE_URL="mysql://user:pass@localhost:3306/instruire_auto_shadow"

# ✅ Затем запустить
npx prisma migrate deploy
```

### ❌ Ошибка: Тесты падают случайно

```bash
# Причина: тесты используют одну БД и конфликтуют

# ✅ Использовать тестовую БД или очищать перед тестами
npm test -- --clearCache
npm run test:watch
```

### ❌ Ошибка: "Duplicate entry for email"

```typescript
// ❌ Неправильно — не проверяется существование
const user = await this.prisma.user.create({
  data: { email, ... }
});

// ✅ Правильно — проверить перед созданием
const existing = await this.prisma.user.findUnique({
  where: { email }
});

if (existing) {
  throw new ConflictException('Email уже используется');
}
```

---

## 🆘 FAQ

### Q: Как добавить новый модуль?
**A:** Создайте структуру:
```
src/my-module/
├── my-module.module.ts
├── my-module.controller.ts
├── my-module.service.ts
└── dto/
    ├── create-my-module.dto.ts
    └── update-my-module.dto.ts
```

Затем импортируйте в `app.module.ts`.

### Q: Как обновить переменные окружения в production?
**A:** Обновить `.env` на сервере и перезапустить:
```bash
ssh user@server.com
cd instruire-auto--backend
nano .env  # Редактировать
npm run build
npm run start:prod
```

### Q: Как откатить миграцию?
**A:** ⚠️ Опасно! Используйте только в разработке:
```bash
npx prisma migrate resolve --rolled-back migration-name
npx prisma migrate dev
```

### Q: Как добавить новый роль (role)?
**A:**
1. Обновить `enum Role` в `schema.prisma`
2. Запустить `npx prisma migrate dev`
3. Обновить `src/auth/role.enum.ts`
4. Обновить guards/policies при необходимости

### Q: Как получить JWT токен для тестирования?
**A:** Используйте Swagger UI на `http://localhost:8888/api-docs`:
1. Нажать кнопку "Authorize"
2. Выполнить `POST /auth/signin`
3. Скопировать `access_token` из ответа
4. Нажать "Authorize" и вставить токен

### Q: Почему резервация не создается?
**A:** Проверьте:
- Время не в прошлом ✓
- Инструктор не занят в это время ✓
- Студент не имеет конфликта ✓
- Инструктор существует ✓

```typescript
// Отладка
try {
  const res = await this.createReservation(userId, dto);
  console.log('Успешно:', res);
} catch (error) {
  console.log('Ошибка:', error.message);
}
```

### Q: Как удалить все данные и начать заново?
**A:** ⚠️ Использовать только в разработке!
```bash
npx prisma migrate reset
```

### Q: Как запустить только определенный тест?
**A:**
```bash
npm test -- PaymentsService
npm test -- --testNamePattern="should create payment"
npm run test:watch  # Для интерактивного режима
```

### Q: Как получить Swagger токен в коде?
**A:**
```typescript
// Использовать @ApiBearerAuth('access-token')
@Get()
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('access-token')  // ← Ключ ДОЛЖЕН совпадать
getReservations() { }
```

### Q: Как настроить новый фронтенд на другом хосте?
**A:** Обновить CORS в `main.ts`:
```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://instruireauto.site',
    'https://new-frontend.com',  // ← Добавить здесь
  ],
  credentials: true,
});
```

### Q: Как создать резервную копию БД вручную?
**A:**
```bash
# mysqldump (если установлен)
mysqldump -u user -p instruire_auto > backup_$(date +%Y%m%d_%H%M%S).sql

# Или использовать Prisma
npx prisma db push  # Синхронизировать
```

### Q: Как отправить файл клиенту?
**A:**
```typescript
import { res } from '@nestjs/common';

@Get(':id/download')
download(@Param('id') id: number, @Res() res: Response) {
  const filePath = path.join(__dirname, `../downloads/file-${id}.pdf`);
  res.download(filePath);
}
```

### Q: Как добавить WebSocket функциональность?
**A:** В `main.ts` раскомментировать:
```typescript
// main.ts
const jwt = app.get(JwtService);
app.useWebSocketAdapter(new WsAdapter(jwt));  // ← Раскомментировать
```

Затем использовать в модуле:
```typescript
@WebSocketGateway()
export class MyGateway {
  @SubscribeMessage('message')
  handleMessage(client, data) { }
}
```

---

## 🔗 Полезные команды

```bash
# Разработка
npm run start:dev              # Запуск с hot-reload
npm run start:debug            # Debug режим
npm run lint                   # ESLint проверка
npm run format                 # Prettier

# Тестирование
npm test                       # Все тесты
npm run test:watch            # Watch mode
npm test -- PaymentsService   # Конкретный тест
npm run test:e2e              # E2E тесты

# База данных
npx prisma migrate dev        # Новая миграция
npx prisma migrate deploy     # Production миграция
npx prisma studio             # GUI для БД
npx prisma generate           # Обновить Prisma Client

# Production
npm run build                 # Сборка
npm run start:prod            # Production запуск
```

---

## 📞 Когда обратиться за помощью

- **Ошибка в коде?** → Проверить консоль, запустить тесты
- **Ошибка БД?** → Открыть `npx prisma studio`, проверить данные
- **Ошибка API?** → Посмотреть logs, использовать Swagger UI
- **Не знаете как сделать?** → Посмотреть похожий модуль в проекте
- **Миграция сломалась?** → Проверить `prisma/migrations/`

---

## 📖 Где найти подробную информацию

| Тема | Файл |
|------|------|
| Полный онбординг | [`docs/ONBOARDING_RU.md`](ONBOARDING_RU.md) |
| Все API endpoints | [`docs/API_REFERENCE_RU.md`](API_REFERENCE_RU.md) |
| Workflow и best practices | [`docs/DEVELOPER_WORKFLOW_RU.md`](DEVELOPER_WORKFLOW_RU.md) |
| Структура БД | [`docs/DATABASE_SCHEMA_RU.md`](DATABASE_SCHEMA_RU.md) |
| Swagger UI | `http://localhost:8888/api-docs` |
| Prisma документация | https://www.prisma.io/docs/ |
| NestJS документация | https://docs.nestjs.com/ |

---

**Последнее обновление:** 14 августа 2024 г.

**Вопрос?** Проверьте документацию выше или спросите в команде! 🚀
