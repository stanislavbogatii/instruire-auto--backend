# Ghid Frontend — Repartizare automată a instructorilor (13 iulie 2026)

## Ce s-a schimbat

Sistemul de programare a lecțiilor practice nu mai depinde de `Group` / `instructorsGroupId`.
Studentul alege acum niște **criterii**, iar backend-ul alege automat instructorul (instructorii)
eligibili și creează rezervările. Fluxul vechi (`POST /reservations` cu `instructorsGroupId` sau
`instructorId`) **rămâne funcțional** (nu a fost șters), dar pentru noul flux de programare
folosiți endpoint-urile noi de mai jos.

## Sector nou: Buiucani

`Buiucani` este acum un sector valid peste tot unde exista deja `Botanica` / `Ciocana`:
instructori, `InstructorsGroup`, `InstructorSectorSchedule`, rezervări, filtre. Nu există un enum
strict în backend — `sector` rămâne un `string` liber (ca și până acum), deci frontend-ul trebuie
doar să adauge `"Buiucani"` în lista de opțiuni afișate studentului (select/radio).

**Regulă de repartizare (identică pentru Ciocana și Buiucani):**
- Primele **7 lecții** (lecțiile obligatorii de poligon) → instructor eligibil din **Botanica**.
- Lecțiile rămase → instructor(i) eligibil(i) din sectorul ales de student.
- Dacă studentul alege **Botanica**, toate lecțiile merg la instructori din Botanica (nu se aplică regula de poligon).

## Endpoint-uri noi

Toate sunt sub `/api/reservations`, protejate cu JWT (`Authorization: Bearer <token>`), la fel ca restul rutelor din acest modul.

### 1. `GET /reservations/eligible-instructors?sector=&gearbox=`

Returnează instructorii eligibili pentru un sector + tip de cutie. Pentru Ciocana/Buiucani, include separat și pool-ul de instructori din Botanica (pentru cele 7 lecții obligatorii).

```json
{
  "sector": "Ciocana",
  "gearbox": "Manual",
  "requiresPoligon": true,
  "poligonSector": "Botanica",
  "mandatoryPoligonLessons": 7,
  "sectorInstructors": [ { "id": 5, "firstName": "...", "sector": "Ciocana", ... } ],
  "poligonInstructors": [ { "id": 3, "firstName": "...", "sector": "Botanica", ... } ]
}
```

Folosiți acest endpoint pentru a afișa studentului dacă există instructori disponibili înainte de a construi calendarul de disponibilitate.

### 2. `GET /reservations/availability?sector=&gearbox=&startDate=&endDate=&instructorMode=`

Generează disponibilitatea (zi + oră) **exclusiv** pe baza instructorilor eligibili, ținând cont de rezervările existente **și** de blocările instructorilor (`InstructorBlackout`). `startDate`/`endDate` sunt opționale (implicit: azi → +3 luni).

- `instructorMode=MULTIPLE` (implicit) — contează câți instructori din pool sunt liberi la fiecare slot.
- `instructorMode=SINGLE` — disponibilitate **doar** pentru instructorul sticky/preferat (același pe care îl va folosi `auto-assign` SINGLE pentru userul autentificat). Counts vor fi `0` sau `1`.

```json
{
  "sector": "Ciocana",
  "gearbox": "Manual",
  "requiresPoligon": true,
  "poligonSector": "Botanica",
  "instructorMode": "SINGLE",
  "singleSectorInstructor": { "id": 5, "firstName": "...", "lastName": "...", "sector": "Ciocana" },
  "singlePoligonInstructor": { "id": 3, "firstName": "...", "lastName": "...", "sector": "Botanica" },
  "days": [
    {
      "date": "2026-07-14",
      "slots": [
        { "time": "07:00", "poligonFreeInstructors": 1, "sectorFreeInstructors": 0 },
        { "time": "08:30", "poligonFreeInstructors": 0, "sectorFreeInstructors": 1 }
      ]
    }
  ]
}
```

- `poligonFreeInstructors` — câți instructori din Botanica sunt liberi la acel slot (relevant doar cât timp studentul nu a terminat cele 7 lecții obligatorii; `0` peste tot dacă sectorul ales e Botanica).
- `sectorFreeInstructors` — câți instructori din sectorul ales sunt liberi la acel slot.
- Un slot cu `0` la câmpul relevant pentru etapa curentă a studentului trebuie afișat ca indisponibil / dezactivat.

### 3. `POST /reservations/auto-assign`

Creează rezervările pe baza criteriilor studentului. Body:

```json
{
  "sector": "Ciocana",
  "gearbox": "Manual",
  "instructorMode": "SINGLE",
  "startTimes": [
    "2026-07-14T07:00:00Z",
    "2026-07-16T07:00:00Z"
  ],
  "privateMessage": "optional",
  "color": "#FF5733"
}
```

- `instructorMode`: `"SINGLE"` (toate lecțiile la un singur instructor eligibil) sau `"MULTIPLE"` (lecțiile sunt distribuite round-robin între toți instructorii eligibili).
- `startTimes` **trebuie trimis în ordine cronologică** — regula celor 7 lecții de poligon se aplică primelor intrări din array, nu după dată.
- Backend-ul decide automat, pentru fiecare `startTime`, dacă lecția e de poligon (Botanica) sau de sector, în funcție de câte lecții de poligon a mai avut deja studentul (nu doar în acest request, ci istoric — verifică rezervările existente cu `sector = 'Botanica'`).
- Răspuns: `201` cu lista rezervărilor create (același format ca la `POST /reservations`).
- La conflict (instructor ocupat / blocat, sau lipsă instructori eligibili) → `400 Bad Request` cu array `reservationErrors` (index, startTime, sector, message) — identic ca la fluxul vechi, deci puteți reutiliza codul existent de afișare a erorilor.

### 4. `POST /reservations/auto-assign/for-user`

Identic cu cel de mai sus, plus câmp `userId`, restricționat la roluri `ADMIN` / `MANAGER` / `INSTRUCTOR` (folosit din Admin Panel pentru a programa un student).

## Pachetul de lecții (15 / 30)

Backend-ul **nu** limitează și nu validează numărul de lecții per pachet — primește pur și simplu `startTimes` (un array). Frontend-ul este responsabil să genereze 15 sau 30 de `startTime`-uri (în funcție de pachetul ales de student) înainte de a apela `auto-assign`, de exemplu selectând sloturi libere din răspunsul de la `/reservations/availability`.

## Blocările instructorilor (Blackouts)

- Endpoint-urile de blocări (`/instructors/blackouts...`) rămân neschimbate ca rute, dar **câmpurile `type`, `startDateTime`, `endDateTime`, `repeatEveryDays` au fost eliminate din request/response** (vezi secțiunea următoare).
- Blocările sunt acum verificate automat de backend atât în `auto-assign`, cât și în `availability` — un instructor blocat la o oră nu mai poate fi selectat, nici manual (rezervare directă), nici automat.

## Eliminarea blocărilor de tip "Repeat"

Blocările `REPEAT` **nu mai sunt suportate**. Toate blocările sunt acum de tip "single" (o singură dată/oră).

Modificări necesare în frontend:
- **Eliminați din formularul de blocări** orice opțiune de tip "Repeat" / "recurent" (ex: dropdown Type, câmpurile Start/End date, "repeat every X days").
- La creare blocare (`POST /instructors/blackouts`), trimiteți doar:
  ```json
  { "blackouts": [ { "instructorId": 5, "dateTime": "2026-07-20T10:00:00Z" } ] }
  ```
- La update (`PATCH /instructors/blackouts/:id`), trimiteți doar:
  ```json
  { "dateTime": "2026-07-20T10:00:00Z" }
  ```
- Răspunsurile de la `GET /instructors/blackouts` și `GET /instructors/blackouts/:instructorId` nu mai conțin `type`, `startDateTime`, `endDateTime`, `repeatEveryDays` — eliminați orice referință la aceste câmpuri din UI (tabele, badge-uri "recurent", etc).
- Dacă frontend-ul avea logică de expandare a blocărilor repetate (generare de instanțe multiple dintr-o blocare recurentă), aceasta trebuie eliminată — nu mai există blocări recurente de generat.

## Rezumat modificări necesare în frontend

| Zonă | Acțiune |
|---|---|
| Selector sector | Adăugați opțiunea **Buiucani** peste tot unde apare Botanica/Ciocana |
| Formular blocări instructor | Eliminați câmpurile Type/Repeat/Start-End date |
| Listare blocări | Eliminați coloanele/badge-urile legate de tip recurent |
| Flux programare student | Înlocuiți logica bazată pe grupă cu apeluri către `eligible-instructors` → `availability` → `auto-assign` |
| Calendar disponibilitate | Folosiți `poligonFreeInstructors` / `sectorFreeInstructors` din `/reservations/availability` pentru a activa/dezactiva sloturi |
| Admin Panel — programare student | Folosiți `POST /reservations/auto-assign/for-user` |
| Rapoarte/dashboard-uri cu sector | Verificați orice listă hardcodată de sectoare (`['Botanica', 'Ciocana']`) și adăugați `'Buiucani'` |

## Ce NU s-a schimbat

- Fluxul vechi de rezervare directă (`POST /reservations`, `POST /reservations/for-user` cu `instructorId` / `instructorsGroupId`) rămâne funcțional neschimbat, pentru compatibilitate cu ecrane existente (ex: Admin Panel care rezervă manual pe un instructor anume).
- Modelul `Group` / `InstructorsGroup` nu a fost șters — doar noul flux de auto-repartizare nu se mai bazează pe el.
- Structura răspunsului la crearea rezervărilor (`Reservation` cu `instructor`, `user`, etc.) e identică indiferent de endpoint folosit.
