# Documentație Frontend — Modificări 15 Iunie 2026

**Base URL:** `https://instruireauto.site/api`  
**Autentificare:** toate endpoint-urile cer `Authorization: Bearer <token>`  
**Swagger interactiv:** `https://instruireauto.site/api-docs`

---

## Cuprins

1. [Instructori de Schimb (Înlocuitori)](#1-instructori-de-schimb-înlocuitori)
2. [Bug fix — Istoricul rezervărilor raportat complet](#2-bug-fix--istoricul-rezervărilor-raportat-complet)
3. [Indiciu (Hint) la întrebările de practică](#3-indiciu-hint-la-întrebările-de-practică)
4. [Rating obligatoriu pentru instructor](#4-rating-obligatoriu-pentru-instructor)

---

## 1. Instructori de Schimb (Înlocuitori)

### Concept
Când un instructor de bază nu poate presta într-o zi, se setează un instructor de schimb (cu `instructorType = "SCHIMB"`) care preia **toate** rezervările acelei zile. Logica este transparentă: rezervările nu se mută în DB, dar fiecare răspuns care conține rezervări include câmpurile `effectiveInstructor` și `substitution`.

### Câmpuri noi în răspunsurile de rezervări

Orice endpoint care returnează rezervări (filtre, calendar, per instructor, per student) include acum:

```json
{
  "id": 123,
  "startTime": "2026-06-20T09:00:00.000Z",
  "instructorId": 3,
  "instructor": {
    "id": 3,
    "firstName": "Ion",
    "lastName": "Popescu"
  },
  "effectiveInstructor": {
    "id": 7,
    "firstName": "Vasile",
    "lastName": "Ionescu",
    "sector": "Botanica",
    "color": "#FF5733",
    "instructorType": "SCHIMB"
  },
  "substitution": {
    "id": 1,
    "substituteInstructorId": 7
  }
}
```

- **Dacă nu există înlocuire:** `effectiveInstructor = instructor` și `substitution = null`
- **Dacă există înlocuire:** `effectiveInstructor` = instructorul de schimb, `substitution` conține ID-ul înlocuirii

> **Regula de afișare:** Folosiți întotdeauna `effectiveInstructor` în interfață (calendar, card lecție, etc.), nu `instructor`. Astfel, dacă există înlocuire, utilizatorul vede automat instructorul corect.

---

### Endpoint-uri — `/api/instructor-substitutions`

**Toate endpoint-urile sunt Admin/Manager only.**

---

#### 1.1 Creează o înlocuire

```
POST /api/instructor-substitutions
Authorization: Bearer <admin_token>

Body:
{
  "baseInstructorId": 3,        // instructorul care lipsește
  "substituteInstructorId": 7,  // instructorul de schimb (trebuie să aibă instructorType="SCHIMB")
  "date": "2026-06-20"          // data înlocuirii (ISO 8601)
}

Răspuns 201:
{
  "id": 1,
  "baseInstructorId": 3,
  "substituteInstructorId": 7,
  "date": "2026-06-20T00:00:00.000Z",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "...",
  "baseInstructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu", ... },
  "substituteInstructor": { "id": 7, "firstName": "Vasile", "lastName": "Ionescu", ... }
}

Erori posibile:
  400 — instructorul de schimb nu are tipul SCHIMB
  404 — instructor de bază sau de schimb inexistent
  409 — există deja o înlocuire pentru acel instructor+zi
```

---

#### 1.2 Listează înlocuirile (cu filtre)

```
GET /api/instructor-substitutions
Authorization: Bearer <admin_token>

Query params (toți opționali):
  date=2026-06-20                // dată exactă
  dateFrom=2026-06-01            // interval de la
  dateTo=2026-06-30              // interval până la
  baseInstructorId=3             // ID instructor de bază
  substituteInstructorId=7       // ID instructor de schimb
  isActive=true                  // true / false

Răspuns 200: InstructorSubstitution[]
  — ordonate: date ASC, baseInstructorId ASC
  — fiecare include baseInstructor și substituteInstructor
```

---

#### 1.3 Detalii înlocuire

```
GET /api/instructor-substitutions/:id
Authorization: Bearer <admin_token>

Răspuns 200: InstructorSubstitution
Răspuns 404: înlocuire inexistentă
```

---

#### 1.4 Editează / dezactivează o înlocuire

```
PATCH /api/instructor-substitutions/:id
Authorization: Bearer <admin_token>

Body (toate câmpurile opționale):
{
  "substituteInstructorId": 8,  // schimbă instructorul de schimb
  "date": "2026-06-21",         // schimbă data
  "isActive": false             // dezactivează/anulează înlocuirea
}

Răspuns 200: InstructorSubstitution actualizată
Erori: 400 (noul substitut nu e SCHIMB), 404 (id inexistent)
```

---

#### 1.5 Șterge o înlocuire permanent

```
DELETE /api/instructor-substitutions/:id
Authorization: Bearer <admin_token>

Răspuns 200: înlocuirea ștearsă
Răspuns 404: inexistentă
```

---

### Comportament calendar (Task 10)

Când faci `GET /api/reservations/filter` sau orice alt endpoint de rezervări, dacă există înlocuire activă în acea zi:

```json
{
  "effectiveInstructor": { "id": 7, "firstName": "Vasile", ... },
  "substitution": { "id": 1, "substituteInstructorId": 7 }
}
```

**Afișare în calendar:**
- Arată `effectiveInstructor.firstName + effectiveInstructor.lastName`
- Opțional: afișează un indicator vizual "înlocuitor" dacă `substitution !== null`

---

## 2. Bug fix — Istoricul rezervărilor raportat complet

### Ce s-a rezolvat

Înainte, în `changedFields` din istoricul rezervării, modificările la câmpurile booleane `isCancelled`, `isFavorite`, `isImportant` **nu apăreau**. Acum sunt urmărite corect.

### Câmpuri urmărite în `changedFields`

Toate endpoint-urile de istoric (`GET /api/reservations/:id/history`, `GET /api/reservations/history/my`, etc.) returnează acum corect:

```json
{
  "action": "UPDATE",
  "changedFields": {
    "isCancelled": { "from": false, "to": true },
    "isFavorite":  { "from": false, "to": true },
    "isImportant": { "from": false, "to": true },
    "startTime":   { "from": "2026-06-15T09:00:00Z", "to": "2026-06-16T09:00:00Z" }
  }
}
```

Lista completă de câmpuri urmărite:
`userId`, `instructorId`, `carId`, `instructorsGroupId`, `startTime`, `sector`, `gearbox`, `privateMessage`, `color`, `isConfirmed`, `isCancelled`, `isFavorite`, `isImportant`

**Nu sunt necesare modificări la apeluri — fix transparent pe backend.**

---

## 3. Indiciu (Hint) la întrebările de practică

### Concept
La biletele de testare (practică), după ce studentul răspunde greșit, se afișează un indiciu (hint) care îl ajută să înțeleagă răspunsul corect. **Hint-ul NU apare la examen, doar la practică.**

### Câmp nou pe Question: `hint`

- Stocat ca JSON bilingv: `{"ro": "...", "ru": "..."}` (same convention as `text`)
- Sau text simplu (compatibil backward)
- Nullable — dacă nu e setat, câmpul vine `null`

---

### Setare hint (Admin — creare/editare întrebare)

```
POST /api/exams/questions
PUT  /api/exams/questions/:id

Body (câmp nou opțional):
{
  "text": "{\"ro\": \"Ce înseamnă acest semn?\", \"ru\": \"Что означает этот знак?\"}",
  "answers": [...],
  "correctAnswer": 1,
  "hint": "{\"ro\": \"Semnul interzice depășirea.\", \"ru\": \"Знак запрещает обгон.\"}"
}
```

`hint` este opțional. Dacă nu se trimite, rămâne `null`.

---

### Hint în răspunsul de practică

#### 3.1 La încărcarea sesiunii de practică

`GET /api/exams/practice/:id?lang=ro`

Fiecare întrebare include acum:

```json
{
  "id": 42,
  "text": "Ce înseamnă acest semn?",
  "answers": ["Oprire interzisă", "Depășire interzisă", "Parcare interzisă"],
  "hint": "Semnul interzice depășirea vehiculelor cu mai mult de 3.5t.",
  "order": 1,
  "selectedAnswer": null,
  "isCorrect": null,
  "isAnswered": false
}
```

- Dacă nu există hint: `"hint": null`
- Hint-ul este deja localizat conform `?lang=ro` sau `?lang=ru`

#### 3.2 La trimiterea unui răspuns

`POST /api/exams/practice/:id/answers`

```
Body:
{
  "questionId": 42,
  "selectedAnswer": 0,
  "lang": "ro"          // opțional, default "ro"
}

Răspuns 200:
{
  "isCorrect": false,
  "correctAnswer": 1,
  "hint": "Semnul interzice depășirea vehiculelor cu mai mult de 3.5t.",
  "progress": {
    "answered": 3,
    "total": 26,
    "isCompleted": false
  }
}
```

- `hint` este `null` dacă întrebarea nu are hint setat, sau dacă `isCorrect: true`
- Afișați hint-ul doar când `isCorrect === false && hint !== null`

> **Important:** Hint-ul NU apare în niciun endpoint de examen (`GET /api/exams/:id`, `POST /api/exams/:id/answers`). Este exclusiv pentru modul practică.

---

## 4. Rating obligatoriu pentru instructor

### Concept
După fiecare lecție (rezervare trecută), studentul trebuie să acorde un rating instructorului (1–5 stele + comentariu opțional). Rating-ul este **unul per rezervare** și **nu se poate modifica** după acordare.

Adminul/Managerul poate vedea statistici agregate lunare și anuale.

---

### Modele de date

#### InstructorRating
```ts
{
  id: number;
  userId: number;
  instructorId: number;
  reservationId: number;       // unic — o rezervare = un rating
  rating: number;              // 1–5
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id, firstName, lastName };
  instructor?: { id, firstName, lastName, sector };
  reservation?: { id, startTime };
}
```

---

### Fluxul obligatoriu recomandat

```
1. La login sau la deschiderea aplicației:
   GET /api/instructor-ratings/pending
   → dacă array non-gol: afișează modal/banner "Ai X lecții neratinguite"
   → forțează studentul să acorde ratingurile înainte de a continua

2. Studentul acordă rating:
   POST /api/instructor-ratings
   { "reservationId": 42, "rating": 5, "comment": "Foarte bun!" }

3. Repetă pentru fiecare lecție din pending
```

---

### Endpoint-uri — `/api/instructor-ratings`

---

#### 4.1 Acordă rating (student)

```
POST /api/instructor-ratings
Authorization: Bearer <student_token>

Body:
{
  "reservationId": 42,       // rezervarea pentru care se acordă ratingul
  "rating": 5,               // număr întreg 1–5
  "comment": "Instructor excelent, explicații clare!"  // opțional
}

Răspuns 201:
{
  "id": 15,
  "userId": 101,
  "instructorId": 3,
  "reservationId": 42,
  "rating": 5,
  "comment": "Instructor excelent!",
  "createdAt": "2026-06-15T14:30:00.000Z",
  "updatedAt": "...",
  "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu" },
  "reservation": { "id": 42, "startTime": "2026-06-15T09:00:00.000Z" }
}

Erori:
  400 — lecția nu a avut loc încă (startTime în viitor)
  400 — rezervarea nu are instructor asignat
  404 — rezervarea nu aparține studentului autentificat
  409 — rating deja acordat pentru această rezervare
```

---

#### 4.2 Lecții fără rating (student) — lista obligatorie

```
GET /api/instructor-ratings/pending
Authorization: Bearer <student_token>

Răspuns 200:
[
  {
    "id": 42,
    "startTime": "2026-06-10T09:00:00.000Z",
    "instructorId": 3,
    "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu" }
  },
  {
    "id": 38,
    "startTime": "2026-06-05T11:00:00.000Z",
    "instructorId": 3,
    "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu" }
  }
]
```

- Returnează rezervările trecute (startTime < acum), neşterse, nereziliate, cu instructor, **fără rating încă**
- Array gol = studentul nu are ratinguri de acordat
- **Recomandare UI:** verificați la fiecare login; dacă `length > 0`, blocați navigarea până la completare

---

#### 4.3 Istoricul ratingurilor mele (student)

```
GET /api/instructor-ratings/my
Authorization: Bearer <student_token>

Răspuns 200: InstructorRating[]
  — ordonate: cel mai recent primul
  — fiecare include instructor și reservation
```

---

#### 4.4 Rating pentru o rezervare specifică

```
GET /api/instructor-ratings/reservation/:reservationId
Authorization: Bearer <token>

Răspuns 200: InstructorRating cu user + instructor, sau null dacă nu există
```

Util pentru a afișa ratingul existent pe detaliul unei rezervări.

---

#### 4.5 Statistici agregate (Admin/Manager)

```
GET /api/instructor-ratings/admin/overview
Authorization: Bearer <admin_token>

Query params (toți opționali):
  instructorId=3      // limitează la un instructor
  year=2026           // limitează la un an
  month=6             // limitează la o lună (necesită și year)

Răspuns 200:
[
  {
    "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu", "sector": "Botanica" },
    "totalRatings": 47,
    "average": 4.72,
    "min": 3,
    "max": 5
  },
  {
    "instructor": { "id": 5, "firstName": "Maria", "lastName": "Ionescu", "sector": "Ciocana" },
    "totalRatings": 32,
    "average": 4.31,
    "min": 2,
    "max": 5
  }
]
— ordonat descrescător după average
```

---

#### 4.6 Statistici lunare (Admin/Manager)

```
GET /api/instructor-ratings/admin/monthly
Authorization: Bearer <admin_token>

Query params (toți opționali):
  instructorId=3
  year=2026           // dacă e specificat, returnează toate lunile anului
  month=6             // poate fi combinat cu year pentru o singură lună

Răspuns 200:
[
  {
    "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu", "sector": "Botanica" },
    "monthlyStats": [
      { "month": "2026-01", "count": 18, "average": 4.6 },
      { "month": "2026-02", "count": 22, "average": 4.8 },
      { "month": "2026-06", "count": 15, "average": 4.9 }
    ]
  }
]
```

---

#### 4.7 Statistici anuale (Admin/Manager)

```
GET /api/instructor-ratings/admin/annual
Authorization: Bearer <admin_token>

Query params:
  instructorId=3    // opțional

Răspuns 200:
[
  {
    "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu", "sector": "Botanica" },
    "annualStats": [
      { "year": 2025, "count": 180, "average": 4.5 },
      { "year": 2026, "count": 47,  "average": 4.72 }
    ]
  }
]
```

---

#### 4.8 Toate ratingurile individuale (Admin/Manager)

```
GET /api/instructor-ratings/admin/all
Authorization: Bearer <admin_token>

Query params (toți opționali):
  instructorId=3
  year=2026
  month=6

Răspuns 200: InstructorRating[]
  — ordonate: cel mai recent primul
  — fiecare include instructor (cu sector), user (firstName, lastName), reservation (startTime)

Exemplu element:
{
  "id": 15,
  "rating": 5,
  "comment": "Instructor excelent!",
  "createdAt": "2026-06-15T14:30:00.000Z",
  "instructor": { "id": 3, "firstName": "Ion", "lastName": "Popescu", "sector": "Botanica" },
  "user": { "id": 101, "firstName": "Alexandru", "lastName": "Munteanu" },
  "reservation": { "id": 42, "startTime": "2026-06-15T09:00:00.000Z" }
}
```

---

### Reguli de business — Rating

| Regulă | Comportament |
|---|---|
| Rezervarea trebuie să aparțină studentului | 404 altfel |
| `startTime` trebuie să fie în trecut | 400 dacă lecția nu a avut loc |
| Rezervarea trebuie să aibă instructor | 400 dacă `instructorId` e null |
| Un singur rating per rezervare | 409 dacă există deja |
| Rating nu se poate modifica/șterge | Nu există endpoint de update/delete pentru student |

---

## Coduri de eroare comune

| Cod | Când apare |
|---|---|
| `400 Bad Request` | Date invalide, constrângeri de business |
| `401 Unauthorized` | Token lipsă sau expirat |
| `403 Forbidden` | Rol insuficient |
| `404 Not Found` | Resursă inexistentă sau nu aparține utilizatorului |
| `409 Conflict` | Duplicat (înlocuire existentă, rating deja acordat etc.) |

Format eroare:
```json
{
  "statusCode": 409,
  "message": "Ai acordat deja un rating pentru această lecție",
  "error": "Conflict"
}
```

---

## Rezumat endpoint-uri noi

| Metodă | Path | Rol | Descriere |
|---|---|---|---|
| `POST` | `/api/instructor-substitutions` | Admin/Manager | Creează înlocuire |
| `GET` | `/api/instructor-substitutions` | Admin/Manager | Listează înlocuiri (filtre) |
| `GET` | `/api/instructor-substitutions/:id` | Admin/Manager | Detalii înlocuire |
| `PATCH` | `/api/instructor-substitutions/:id` | Admin/Manager | Editează/dezactivează |
| `DELETE` | `/api/instructor-substitutions/:id` | Admin/Manager | Șterge permanent |
| `POST` | `/api/instructor-ratings` | Orice rol | Acordă rating |
| `GET` | `/api/instructor-ratings/pending` | Orice rol | Lecții fără rating |
| `GET` | `/api/instructor-ratings/my` | Orice rol | Istoricul meu de ratinguri |
| `GET` | `/api/instructor-ratings/reservation/:id` | Orice rol | Rating per rezervare |
| `GET` | `/api/instructor-ratings/admin/overview` | Admin/Manager | Statistici agregate |
| `GET` | `/api/instructor-ratings/admin/monthly` | Admin/Manager | Statistici lunare |
| `GET` | `/api/instructor-ratings/admin/annual` | Admin/Manager | Statistici anuale |
| `GET` | `/api/instructor-ratings/admin/all` | Admin/Manager | Toate ratingurile |

## Câmpuri noi în endpoint-uri existente

| Endpoint | Câmp nou | Descriere |
|---|---|---|
| Toate endpoint-urile de rezervări | `effectiveInstructor` | Instructorul efectiv (substitut dacă există înlocuire) |
| Toate endpoint-urile de rezervări | `substitution` | `null` sau `{ id, substituteInstructorId }` |
| `GET /api/exams/practice/:id` | `hint` pe fiecare întrebare | Indiciu bilingv sau `null` |
| `POST /api/exams/practice/:id/answers` | `hint` în răspuns | Afișat doar când răspuns greșit |
| `GET /api/exams/questions/:id` | `hint` | Câmpul brut JSON (pentru admin) |
