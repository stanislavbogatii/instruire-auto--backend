# Modul Examen Practic — Ghid Frontend

**Base URL:** `https://instruireauto.site/api`  
**Autentificare:** toate endpoint-urile cer header `Authorization: Bearer <token>`  
**Swagger interactiv:** `https://instruireauto.site/api-docs` → secțiunea `practical-exam-slots`

---

## Cuprins

1. [Roluri și permisiuni](#1-roluri-și-permisiuni)
2. [Câmpul nou pe User — canBookPracticalExam](#2-câmpul-nou-pe-user--canbookpracticalexam)
3. [Modele de date](#3-modele-de-date)
4. [Endpoint-uri — Gestionare sloturi (Admin/Manager)](#4-endpoint-uri--gestionare-sloturi-adminmanager)
5. [Endpoint-uri — Student](#5-endpoint-uri--student)
6. [Endpoint-uri — Admin/Manager: rezervări](#6-endpoint-uri--adminmanager-rezervări)
7. [Reguli de business (limite)](#7-reguli-de-business-limite)
8. [Coduri de eroare](#8-coduri-de-eroare)
9. [Fluxuri tipice](#9-fluxuri-tipice)

---

## 1. Roluri și permisiuni

| Acțiune | USER (student) | INSTRUCTOR | MANAGER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Vizualizează toate sloturile | ✅ | ✅ | ✅ | ✅ |
| Vede sloturile disponibile pentru sine | ✅ | — | — | — |
| Rezervă un slot | ✅ | — | — | — |
| Vede rezervarea activă proprie | ✅ | — | — | — |
| Vede istoricul rezervărilor proprii | ✅ | — | — | — |
| Anulează propria rezervare | ✅ | — | — | — |
| Creează / editează / șterge sloturi | ❌ | ❌ | ✅ | ✅ |
| Generează sloturi din program săptămânal | ❌ | ❌ | ✅ | ✅ |
| Setează rezultatul unui examen (PASSED/FAILED/ABSENT) | ❌ | ❌ | ✅ | ✅ |
| Listează toate rezervările cu filtre | ❌ | ❌ | ✅ | ✅ |
| Activează/dezactivează `canBookPracticalExam` pe un user | ❌ | ❌ | ✅ | ✅ |

---

## 2. Câmpul nou pe User — `canBookPracticalExam`

**Câmp adăugat pe modelul `User`:**

```
canBookPracticalExam: boolean   // default: true
```

Când este `false`, studentul **nu poate** rezerva un examen practic și primește `403 Forbidden` la orice încercare de booking.

**Modificare (Admin/Manager):**

```
PATCH /api/users/:id
Authorization: Bearer <admin_token>

Body:
{
  "canBookPracticalExam": false
}
```

Răspuns: obiectul `User` actualizat.

> **Notă:** Dacă un student are deja o rezervare activă și se setează `canBookPracticalExam: false`, rezervarea **rămâne activă** — interdicția se aplică doar la booking-urile noi.

---

## 3. Modele de date

### PracticalExamSlot

```ts
{
  id: number;
  date: string;          // ISO 8601, ex: "2026-06-15T00:00:00.000Z"
  time: string;          // "HH:mm", ex: "09:00"
  sector: string;        // ex: "Botanica", "Ciocana"
  gearbox: string;       // "manual" sau "automatic"
  capacity: number;      // numărul maxim de studenți
  isActive: boolean;     // dacă slotul acceptă rezervări
  instructorId: number | null;
  createdAt: string;
  updatedAt: string;
  instructor: Instructor | null;
  reservations: PracticalExamSlotReservation[];  // doar cele cu status=SCHEDULED, ordonate după positionInCar
}
```

### PracticalExamSlotReservation

```ts
{
  id: number;
  slotId: number;
  userId: number;
  positionInCar: number;   // locul în mașină (1, 2, 3...); atribuit automat la booking
  status: "SCHEDULED" | "PASSED" | "FAILED" | "ABSENT" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  slot?: PracticalExamSlot;
  user?: { id, firstName, lastName, email, phone };
}
```

### Statusuri rezervare

| Status | Semnificație | Final? |
|---|---|:---:|
| `SCHEDULED` | Rezervare activă, examenul nu a avut loc | ❌ |
| `PASSED` | Student a promovat examenul | ✅ |
| `FAILED` | Student a picat examenul | ✅ |
| `ABSENT` | Student nu s-a prezentat | ✅ |
| `CANCELLED` | Rezervare anulată (de student sau admin) | ✅ |

Odată ajuns într-un status **Final**, rezervarea **nu mai poate fi modificată**.

---

## 4. Endpoint-uri — Gestionare sloturi (Admin/Manager)

### 4.1 Creează un slot manual

```
POST /api/practical-exam-slots
Authorization: Bearer <admin_token>

Body:
{
  "date": "2026-06-20",        // obligatoriu, ISO 8601
  "time": "09:00",             // obligatoriu, HH:mm
  "sector": "Botanica",        // obligatoriu
  "gearbox": "manual",         // obligatoriu
  "capacity": 10,              // obligatoriu, minim 1
  "instructorId": 3,           // opțional
  "isActive": true             // opțional, default true
}

Răspuns 201: PracticalExamSlot (cu instructor + reservations)
```

---

### 4.2 Generează sloturi din program săptămânal

Crează automat sloturi pentru un interval de date, pentru zilele specificate ale săptămânii și orele dorite.

```
POST /api/practical-exam-slots/generate
Authorization: Bearer <admin_token>

Body:
{
  "daysOfWeek": [1, 3, 5],          // 0=Duminică, 1=Luni, ..., 6=Sâmbătă
  "times": ["09:00", "11:00"],       // orele pentru fiecare zi selectată
  "sector": "Botanica",
  "gearbox": "manual",
  "capacity": 10,
  "startDate": "2026-06-01",        // inclusiv
  "endDate": "2026-06-30",          // inclusiv
  "instructorId": 3                  // opțional
}

Răspuns 201:
{
  "created": 24   // numărul de sloturi create
}
```

**Exemplu:** `daysOfWeek: [1,3]` + `times: ["09:00","14:00"]` + interval de 2 săptămâni → 8 sloturi.

> **Atenție:** Dacă `endDate < startDate` → `400 Bad Request`.  
> Dacă nicio zi din interval nu se potrivește cu `daysOfWeek` → `{ created: 0 }`.

---

### 4.3 Listează toate sloturile

```
GET /api/practical-exam-slots
Authorization: Bearer <token>

Răspuns 200: PracticalExamSlot[]
  — ordonate după date ASC, time ASC
  — fiecare slot include instructor + lista de rezervări SCHEDULED ordonate după positionInCar
```

---

### 4.4 Detalii slot

```
GET /api/practical-exam-slots/:id
Authorization: Bearer <token>

Răspuns 200: PracticalExamSlot
Răspuns 404: slot nu există
```

---

### 4.5 Modifică un slot

```
PATCH /api/practical-exam-slots/:id
Authorization: Bearer <admin_token>

Body (toate câmpurile opționale):
{
  "date": "2026-06-21",
  "time": "10:00",
  "sector": "Ciocana",
  "gearbox": "automatic",
  "capacity": 8,
  "isActive": false,
  "instructorId": null    // null = deconectează instructorul
}

Răspuns 200: PracticalExamSlot actualizat
Răspuns 404: slot nu există
```

---

### 4.6 Șterge un slot

```
DELETE /api/practical-exam-slots/:id
Authorization: Bearer <admin_token>

Răspuns 200: slotul șters
Răspuns 404: slot nu există
```

> **Atenție:** Ștergerea unui slot șterge **în cascadă** toate rezervările asociate (Cascade delete).

---

### 4.7 Lista rezervărilor unui slot

```
GET /api/practical-exam-slots/:id/reservations
Authorization: Bearer <token>

Răspuns 200: PracticalExamSlotReservation[]
  — toate statusurile (nu doar SCHEDULED)
  — ordonate după positionInCar ASC
  — fiecare rezervare include { id, firstName, lastName, email, phone } al studentului
Răspuns 404: slot nu există
```

---

## 5. Endpoint-uri — Student

### 5.1 Sloturi disponibile pentru mine

Returnează sloturile active, viitoare, cu locuri libere. Verifică și regulile de booking (dacă studentul e eligibil).

```
GET /api/practical-exam-slots/available
Authorization: Bearer <student_token>

Răspuns 200: array de sloturi disponibile
  — fiecare slot include câmpurile extra:
    {
      "bookedCount": 7,       // câte rezervări SCHEDULED are deja
      "availableSpots": 3     // capacity - bookedCount
    }
  — ordonate: date ASC, time ASC

Răspuns 403: "You are not allowed to book a practical exam"
  (canBookPracticalExam = false)
Răspuns 409: student are deja o rezervare activă / ultima rezervare nu are rezultat final / are examen teoretic IN_PROGRESS
```

> Dacă studentul nu e eligibil, se returnează eroare (nu array gol). Verifică statusul înainte de a afișa butonul de booking.

---

### 5.2 Rezervă un slot

```
POST /api/practical-exam-slots/:id/book
Authorization: Bearer <student_token>

Body: (gol — nu se trimite nimic)

Răspuns 201: PracticalExamSlotReservation
  {
    "id": 15,
    "slotId": 42,
    "userId": 101,
    "positionInCar": 3,       // locul atribuit automat
    "status": "SCHEDULED",
    "createdAt": "...",
    "updatedAt": "...",
    "slot": { ...slot cu instructor },
    "user": { id, firstName, lastName, email, phone }
  }

Răspuns 400: slot inactiv sau complet plin
Răspuns 403: canBookPracticalExam = false
Răspuns 404: slot nu există
Răspuns 409: deja are rezervare activă / ultima fără rezultat / examen teoretic în progres
```

---

### 5.3 Rezervarea mea activă

```
GET /api/practical-exam-slots/my-reservation
Authorization: Bearer <student_token>

Răspuns 200: PracticalExamSlotReservation (cu slot + instructor)
  SAU null dacă nu are nicio rezervare SCHEDULED
```

---

### 5.4 Anulează propria rezervare activă

```
PATCH /api/practical-exam-slots/my-reservation/cancel
Authorization: Bearer <student_token>

Body: (gol)

Răspuns 200: rezervarea actualizată cu status "CANCELLED"
Răspuns 404: nu are nicio rezervare SCHEDULED activă
```

---

### 5.5 Istoricul meu de examene practice

```
GET /api/practical-exam-slots/my-history
Authorization: Bearer <student_token>

Răspuns 200: PracticalExamSlotReservation[]
  — toate rezervările (toate statusurile), cea mai recentă prima
  — fiecare include:
    {
      "id": 15,
      "positionInCar": 3,
      "status": "PASSED",
      "createdAt": "...",
      "slot": {
        "date": "2026-06-20T00:00:00.000Z",
        "time": "09:00",
        "sector": "Botanica",
        "gearbox": "manual",
        "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu" }
      }
    }
```

---

## 6. Endpoint-uri — Admin/Manager: rezervări

### 6.1 Setează rezultatul unui examen

```
PATCH /api/practical-exam-slots/reservations/:reservationId/status
Authorization: Bearer <admin_token>

Body:
{
  "status": "PASSED"   // "SCHEDULED" | "PASSED" | "FAILED" | "ABSENT" | "CANCELLED"
}

Răspuns 200: rezervarea actualizată (cu slot + instructor + user)
Răspuns 400: rezervarea are deja un status final
Răspuns 403: Forbidden
Răspuns 404: rezervare inexistentă
```

> **Regula:** Odată setată în `PASSED`, `FAILED`, `ABSENT` sau `CANCELLED`, rezervarea nu mai poate fi modificată. Orice `PATCH` ulterior returnează `400`.

---

### 6.2 Listează toate rezervările cu filtre

```
GET /api/practical-exam-slots/admin/reservations
Authorization: Bearer <admin_token>

Query params (toți opționali, combinabili):
  date=2026-06-15              // dată exactă (ISO 8601)
  dateFrom=2026-06-01          // interval de la (inclusiv)
  dateTo=2026-06-30            // interval până la (inclusiv)
  instructorId=3               // ID instructor (număr)
  sector=Botanica
  gearbox=manual
  status=SCHEDULED             // SCHEDULED | PASSED | FAILED | ABSENT | CANCELLED

Exemple:
  GET /api/practical-exam-slots/admin/reservations?status=SCHEDULED&sector=Botanica
  GET /api/practical-exam-slots/admin/reservations?dateFrom=2026-06-01&dateTo=2026-06-30&instructorId=3
  GET /api/practical-exam-slots/admin/reservations?date=2026-06-15

Răspuns 200: PracticalExamSlotReservation[]
  — ordonate: slot.date ASC → slot.time ASC → positionInCar ASC
  — fiecare include slot (cu instructor) + user { id, firstName, lastName, email, phone }
```

> **Notă:** `date`, `dateFrom`, `dateTo` se aplică pe data slotului (`slot.date`), nu pe `createdAt`.  
> `date` și `dateFrom`/`dateTo` pot fi combinate cu ceilalți filtre, dar nu are sens să trimiți `date` împreună cu `dateFrom`/`dateTo`.

---

## 7. Reguli de business (limite)

### Reguli de booking (pentru student)

1. **`canBookPracticalExam` trebuie să fie `true`** — altfel `403`.
2. **O singură rezervare SCHEDULED la un moment dat** — nu poți rezerva dacă ai deja una activă (`409`).
3. **Ultima rezervare trebuie să aibă rezultat final** — dacă ultima rezervare e `SCHEDULED` (sau orice non-final), nu poți rezerva una nouă (`409`). *(Practic, acoperit de regula 2, dar e o verificare separată pentru edge-case-uri.)*
4. **Niciun examen teoretic `IN_PROGRESS`** — dacă există un examen teoretic fără rezultat final, booking-ul e blocat (`409`).
5. **Slotul trebuie să fie `isActive: true`** — altfel `400`.
6. **Slotul nu trebuie să fie plin** — `bookedCount >= capacity` → `409`.

### Reguli de status

- Un student **poate vedea** `GET /available` și primește eroare dacă nu e eligibil (nu primește array gol).
- `positionInCar` se atribuie **automat** în ordine: 1, 2, 3... Nu se trimite de la frontend.
- Statusul **nu poate fi schimbat înapoi** odată ce e final (`PASSED/FAILED/ABSENT/CANCELLED`).
- Un student poate schimba statusul rezervării proprii **doar în `CANCELLED`**, prin `PATCH /my-reservation/cancel`.

---

## 8. Coduri de eroare

| Cod | Când apare |
|---|---|
| `400 Bad Request` | Date invalide (endDate < startDate, slot inactiv, status deja final) |
| `401 Unauthorized` | Token lipsă sau expirat |
| `403 Forbidden` | Rol insuficient sau `canBookPracticalExam = false` |
| `404 Not Found` | Slot sau rezervare inexistentă |
| `409 Conflict` | Rezervare duplicată, slot plin, rezervare fără rezultat final, examen teoretic în progres |

Toate erorile au forma:
```json
{
  "statusCode": 409,
  "message": "You already have an active practical exam reservation",
  "error": "Conflict"
}
```

---

## 9. Fluxuri tipice

### Flux student — rezervare examen practic

```
1. GET /api/practical-exam-slots/available
   → dacă 403/409: afișează mesaj de eligibilitate, nu afișa buton de booking
   → dacă 200: afișează lista de sloturi cu "availableSpots" disponibile

2. POST /api/practical-exam-slots/:id/book
   → 201: rezervare creată, afișează "positionInCar" (locul în mașină)
   → 409: slot s-a umplut între timp, refresh lista și alege alt slot

3. GET /api/practical-exam-slots/my-reservation
   → afișează rezervarea activă curentă (dată, oră, sector, instructor)

4. (opțional) PATCH /api/practical-exam-slots/my-reservation/cancel
   → anulare rezervare
```

### Flux admin — zi de examen

```
1. GET /api/practical-exam-slots/admin/reservations?date=2026-06-20
   → lista completă a rezervărilor din acea zi

2. (după desfășurarea examenului)
   PATCH /api/practical-exam-slots/reservations/:id/status
   Body: { "status": "PASSED" } / { "status": "FAILED" } / { "status": "ABSENT" }
   → pentru fiecare student din listă
```

### Flux admin — creare program lunar

```
1. POST /api/practical-exam-slots/generate
   Body: {
     "daysOfWeek": [2, 4],         // Marți și Joi
     "times": ["09:00", "13:00"],
     "sector": "Botanica",
     "gearbox": "manual",
     "capacity": 8,
     "startDate": "2026-07-01",
     "endDate": "2026-07-31",
     "instructorId": 3
   }
   → { "created": 18 }

2. GET /api/practical-exam-slots
   → verifică sloturile generate

3. (ajustări) PATCH /api/practical-exam-slots/:id
   → modifică individual dacă e nevoie (ex: zi de sărbătoare → isActive: false)
```
