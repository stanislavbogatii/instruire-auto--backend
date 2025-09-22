# Sistem de Management pentru Școala de Șoferi - Documentație API

## Descrierea Sistemului

Acesta este un sistem complet de management pentru școala de șoferi **Instruire Auto**, dezvoltat cu NestJS și TypeScript. Sistemul gestionează multiple aspecte ale unei școli de șoferi moderne:

### Funcționalități Principale:

#### 🏫 **Management Școală**
- **Utilizatori**: Studenți, instructori, manageri și administratori
- **Grupuri**: Organizarea studenților în grupuri cu instructori desemnați
- **Mașini**: Gestionarea parcului auto cu atribuire către instructori

#### 📅 **Sistem de Rezervări**
- **Programări**: Rezervări pentru lecții practice cu instructori
- **Confirmare**: Sistem de confirmare automată a rezervărilor
- **Istoricul**: Tracking complet al modificărilor și istoricului rezervărilor

#### 🎯 **Sistem de Examene și Practică**
- **Baza de întrebări**: 1008 întrebări de examen cu imagini
- **Bilete de practică**: 42 de bilete (B1-B42) pentru antrenament
- **Examene oficiale**: Sistem complet de examinare cu permisiuni
- **Progres tracking**: Urmărirea detaliată a progresului studenților

#### 🔐 **Sistem de Autentificare**
- **JWT Authentication**: Securitate avansată cu token-uri
- **Roluri multiple**: USER, INSTRUCTOR, MANAGER, ADMIN
- **Permisiuni granulare**: Control precis al accesului la funcționalități

---

## Structura API-ului

**Base URL**: `http://localhost:3000/api`
**Autentificare**: Bearer Token (JWT)

---

## 🔐 Autentificare (`/auth`)

### **POST /auth/signup**
**Descriere**: Înregistrare utilizator nou
```json
{
  "email": "student@email.com",
  "password": "parola123",
  "firstName": "Ion",
  "lastName": "Popescu",
  "phone": "0712345678"
}
```

### **POST /auth/signin**
**Descriere**: Autentificare utilizator
```json
{
  "email": "student@email.com",
  "password": "parola123"
}
```

### **POST /auth/refresh**
**Descriere**: Refresh token JWT

---

## 👥 Utilizatori (`/users`)

### **GET /users**
**Descriere**: Lista tuturor utilizatorilor (doar ADMIN/MANAGER)

### **GET /users/:id**
**Descriere**: Detalii utilizator specific

### **POST /users**
**Descriere**: Creare utilizator nou (doar ADMIN)
```json
{
  "email": "nou@email.com",
  "firstName": "Nume",
  "lastName": "Prenume",
  "phone": "0712345678",
  "role": "USER",
  "groupId": 1
}
```

### **PATCH /users/:id**
**Descriere**: Actualizare date utilizator

### **DELETE /users/:id**
**Descriere**: Ștergere utilizator (doar ADMIN)

### **GET /users/group/:groupId**
**Descriere**: Utilizatori dintr-un grup specific

---

## 🏎️ Mașini (`/cars`)

### **GET /cars**
**Descriere**: Lista toate mașinile

### **POST /cars**
**Descriere**: Adăugare mașină nouă (doar INSTRUCTOR/ADMIN)
```json
{
  "plateNumber": "B123ABC",
  "gearbox": "manual",
  "instructorId": 1
}
```

### **GET /cars/:id**
**Descriere**: Detalii mașină specifică

### **PATCH /cars/:id**
**Descriere**: Actualizare mașină

### **DELETE /cars/:id**
**Descriere**: Ștergere mașină (doar ADMIN)

---

## 📅 Rezervări (`/reservations`)

### **GET /reservations**
**Descriere**: Rezervările utilizatorului autentificat

### **POST /reservations**
**Descriere**: Creare rezervare nouă
```json
{
  "instructorId": 1,
  "startTime": "2025-09-22T10:00:00Z",
  "sector": "Sectorul 1",
  "gearbox": "manual",
  "privateMessage": "Prima lecție",
  "carId": 1
}
```

### **GET /reservations/instructor**
**Descriere**: Rezervările instructorului autentificat

### **GET /reservations/busy-reservation**
**Descriere**: Intervalele ocupate pentru instructorii disponibili

### **GET /reservations/busy-reservation/instructor/:instructor_id**
**Descriere**: Intervalele ocupate pentru un instructor specific

### **GET /reservations/all**
**Descriere**: Toate rezervările (doar MANAGER/ADMIN)

### **PATCH /reservations/:id**
**Descriere**: Modificare rezervare (confirmări, actualizări)

### **DELETE /reservations/:id**
**Descriere**: Anulare rezervare

### **GET /reservations/user/:userId**
**Descriere**: Rezervările unui utilizator specific

---

## 🎯 Examene și Practică (`/exams`)

### **Gestionarea Întrebărilor**

#### **GET /exams/questions**
**Descriere**: Lista toate întrebările de examen

#### **POST /exams/questions**
**Descriere**: Adăugare întrebare nouă (doar INSTRUCTOR/ADMIN)
```json
{
  "text": "Care este viteza maximă în localitate?",
  "image": "path/to/image.jpg",
  "answers": ["30 km/h", "50 km/h", "70 km/h", "90 km/h"],
  "correctAnswer": 1
}
```

#### **GET /exams/questions/:id**
**Descriere**: Detalii întrebare specifică

#### **PUT /exams/questions/:id**
**Descriere**: Actualizare întrebare

#### **DELETE /exams/questions/:id**
**Descriere**: Ștergere întrebare

### **Gestionarea Biletelor**

#### **GET /exams/tickets**
**Descriere**: Lista toate biletele de practică/examen

#### **POST /exams/tickets**
**Descriere**: Creare bilet nou
```json
{
  "name": "Biletul B43",
  "questionIds": [1, 5, 10, 15, 20]
}
```

#### **GET /exams/tickets/:id**
**Descriere**: Detalii bilet specific

#### **GET /exams/tickets/:id/questions**
**Descriere**: Întrebările din biletul specific

#### **PUT /exams/tickets/:id**
**Descriere**: Actualizare bilet

#### **DELETE /exams/tickets/:id**
**Descriere**: Ștergere bilet

### **Sistem de Practică** 🏃‍♂️

#### **POST /exams/practice**
**Descriere**: Începere/reluare sesiune de practică
```json
{
  "ticketId": 1
}
```

#### **GET /exams/practice/:id**
**Descriere**: Detalii sesiune de practică

#### **POST /exams/practice/:id/answers**
**Descriere**: Răspundere la întrebare în practică
```json
{
  "questionId": 1,
  "selectedAnswer": 2
}
```

#### **GET /exams/practice/history/my**
**Descriere**: Istoricul practicii personale
- **Query params**: `page=1&limit=10`

#### **GET /exams/practice/ticket/:ticketId**
**Descriere**: Sesiunile de practică pentru un bilet specific

### **Examene Oficiale**

#### **POST /exams/permissions/student**
**Descriere**: Acordare permisiune de examen (doar INSTRUCTOR)
```json
{
  "userId": 1,
  "validUntil": "2025-12-31T23:59:59Z",
  "maxAttempts": 3
}
```

#### **POST /exams/permissions/students/bulk**
**Descriere**: Acordare permisiuni multiple

#### **POST /exams**
**Descriere**: Începere examen oficial
```json
{
  "ticketIds": [1, 2, 3]
}
```

#### **GET /exams/:id**
**Descriere**: Detalii examen

#### **POST /exams/:id/answers**
**Descriere**: Răspuns la întrebare în examen
```json
{
  "questionId": 1,
  "selectedAnswer": 2
}
```

#### **GET /exams/history/student**
**Descriere**: Istoricul examenelor studentului

#### **GET /exams/history/instructor**
**Descriere**: Istoricul examenelor instructorului

#### **GET /exams/permissions/my-status**
**Descriere**: Statusul permisiunilor de examen

#### **POST /exams/reactivate**
**Descriere**: Reactivare student pentru examen

---

## 👨‍🏫 Instructori (`/instructors`)

### **GET /instructors**
**Descriere**: Lista tuturor instructorilor

### **POST /instructors**
**Descriere**: Adăugare instructor nou (doar ADMIN)

### **GET /instructors/:id**
**Descriere**: Detalii instructor specific

### **PATCH /instructors/:id**
**Descriere**: Actualizare instructor

### **DELETE /instructors/:id**
**Descriere**: Ștergere instructor (soft delete)

---

## 👥 Grupuri (`/groups`)

### **GET /groups**
**Descriere**: Lista tuturor grupurilor

### **POST /groups**
**Descriere**: Creare grup nou

### **GET /groups/:id**
**Descriere**: Detalii grup specific

### **PATCH /groups/:id**
**Descriere**: Actualizare grup

### **DELETE /groups/:id**
**Descriere**: Ștergere grup

---

## 🔔 Notificări (`/notifications`)

### **GET /notifications**
**Descriere**: Notificările utilizatorului

### **POST /notifications/mark-read/:id**
**Descriere**: Marcarea notificării ca citită

---

## 💾 Backup (`/backup`)

### **POST /backup/create**
**Descriere**: Creare backup baza de date (doar ADMIN)

### **GET /backup/list**
**Descriere**: Lista backup-urilor disponibile

### **POST /backup/restore**
**Descriere**: Restaurare din backup

---

## 📊 Statusuri și Enum-uri

### **Roluri Utilizatori**
- `USER` - Student obișnuit
- `INSTRUCTOR` - Instructor auto
- `MANAGER` - Manager școală
- `ADMIN` - Administrator sistem

### **Status Practică**
- `NOT_STARTED` - Neîncepută
- `IN_PROGRESS` - În progres
- `COMPLETED` - Finalizată
- `PASSED` - Promovată
- `FAILED` - Nepromovată

### **Status Examen**
- `IN_PROGRESS` - În desfășurare
- `COMPLETED` - Finalizat cu succes
- `FAILED` - Eșuat
- `EXPIRED` - Expirat

---

## 🔧 Configurare și Utilizare

### **1. Autentificare**
```javascript
// Login
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@email.com', password: 'parola' })
});

const { access_token } = await response.json();
```

### **2. Utilizare Token**
```javascript
// Pentru toate request-urile ulterioare
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

### **3. Începere Practică**
```javascript
// Start practică pentru biletul B1
const practice = await fetch('/api/exams/practice', {
  method: 'POST',
  headers,
  body: JSON.stringify({ ticketId: 1 })
});
```

### **4. Răspuns la Întrebare**
```javascript
// Răspunde la întrebarea 1 cu varianta 2
await fetch(`/api/exams/practice/${practiceId}/answers`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ questionId: 1, selectedAnswer: 2 })
});
```

---

## 🎯 Fluxuri de Utilizare Tipice

### **Pentru Studenți:**
1. **Înregistrare** → `/auth/signup`
2. **Autentificare** → `/auth/signin`
3. **Rezervare lecție** → `/reservations` (POST)
4. **Practică bilete** → `/exams/practice` (POST)
5. **Răspuns întrebări** → `/exams/practice/:id/answers` (POST)
6. **Verificare progres** → `/exams/practice/history/my`

### **Pentru Instructori:**
1. **Autentificare** → `/auth/signin`
2. **Vezi rezervări** → `/reservations/instructor`
3. **Confirmă rezervări** → `/reservations/:id` (PATCH)
4. **Acordă permisiuni examen** → `/exams/permissions/student` (POST)
5. **Monitorizare studenți** → `/exams/history/instructor`

### **Pentru Administratori:**
1. **Gestionare utilizatori** → `/users/*`
2. **Gestionare mașini** → `/cars/*`
3. **Gestionare întrebări** → `/exams/questions/*`
4. **Backup sistem** → `/backup/*`

---

## 📱 Integrare Frontend

Sistemul este gândit pentru integrare cu aplicații frontend moderne (React, Vue, Angular). Toate endpoint-urile returnează JSON și respectă standardele REST API.

**Exemplu React Hook:**
```javascript
const usePractice = (ticketId) => {
  const [practice, setPractice] = useState(null);
  
  const startPractice = async () => {
    const response = await fetch('/api/exams/practice', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ticketId })
    });
    const data = await response.json();
    setPractice(data);
  };
  
  return { practice, startPractice };
};
```

---

## 🔒 Securitate

- **JWT Authentication**: Toate endpoint-urile protejate necesită token valid
- **Roluri și Permisiuni**: Acces granular bazat pe rolul utilizatorului  
- **Validare Input**: Toate datele sunt validate cu DTO-uri TypeScript
- **Rate Limiting**: Protecție împotriva spam-ului și atacurilor
- **CORS**: Configurare pentru domenii autorizate

---

## 📈 Monitoring și Logs

Sistemul include:
- **Logging complet** al acțiunilor utilizatorilor
- **Istoric rezervări** cu tracking al modificărilor
- **Progres practică** cu statistici detaliate
- **Backup automat** al bazei de date

---

Această documentație acoperă toate funcționalitățile sistemului de management pentru școala de șoferi. Pentru întrebări suplimentare sau personalizări, contactați echipa de dezvoltare.