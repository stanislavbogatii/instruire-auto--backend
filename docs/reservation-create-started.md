## Eveniment WebSocket `reservation:create:started`

Acest eveniment informează toți clienții când un utilizator începe completarea formularului de rezervare și partajează datele introduse până în acel moment.

### Pași de utilizare
1. Frontend-ul emite `reservation:create:started` către server cu payload-ul compatibil cu `CreateReservationsDto`.
2. Gateway-ul redistribuie evenimentul către toți clienții împreună cu informațiile despre utilizatorul care a inițiat procesul (`startedBy`).

### Exemplu de emitere
```ts
socket.emit('reservation:create:started', {
  instructorId: 5,
  instructorsGroupId: 2,
  reservations: [
    {
      startTime: '2025-07-20T10:00:00Z',
      sector: 'Botanica',
      gearbox: 'Manual',
      privateMessage: 'Vreau să încep de la școală',
      color: '#FF5733',
      isFavorite: false,
      isImportant: true,
    },
  ],
});
```

### Exemplu de ascultare
```ts
socket.on('reservation:create:started', ({ reservationDraft, startedBy }) => {
  console.log('Date introduse:', reservationDraft);
  console.log('Utilizator:', startedBy.name ?? startedBy.email);
});
```

### Structura `startedBy`
- `id`: ID-ul utilizatorului.
- `email`: adresa de email.
- `role`: rolul în aplicație.
- `name`: nume complet (dacă există).
