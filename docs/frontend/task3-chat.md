# Student ↔ Manager Chat — Frontend Integration

One conversation thread per student, visible to any ADMIN/MANAGER. **Student never sees which specific manager (or whether it was an admin vs. a manager) replied — only the generic label `"MANAGER"`.** Staff see the real name of whoever sent each message.

All routes are under `/api`, require `Authorization: Bearer <token>`, and are guarded — no route in this module is public.

## Student endpoints (self-scoped)

### `GET /api/chat/my-conversation`
Gets (or lazily creates, on first call) the caller's own conversation with its full message history, **masked**.

```json
{
  "id": 1, "createdAt": "...", "updatedAt": "...",
  "messages": [
    { "id": 1, "conversationId": 1, "body": "...", "createdAt": "...", "senderRole": "STUDENT" },
    { "id": 2, "conversationId": 1, "body": "...", "createdAt": "...", "senderRole": "MANAGER" }
  ]
}
```
Note what's absent: no `senderId`, no sender name, ever, on a `"MANAGER"` message — by design, not an oversight.

### `POST /api/chat/my-conversation/messages`
Body: `{ "body": "message text" }` (max 2000 chars). Auto-creates the conversation on first send. Returns the created message in the same masked shape as above.

## Staff endpoints (ADMIN, MANAGER)

### `GET /api/chat/conversations`
All conversations, each with student info and a preview of the last message — **unmasked**.
```json
[
  {
    "id": 1,
    "student": { "id": 883, "firstName": "Ana", "lastName": "Chiaburu", "email": "..." },
    "createdAt": "...", "updatedAt": "...",
    "lastMessage": { "id": 2, "conversationId": 1, "body": "...", "createdAt": "...", "senderRole": "MANAGER", "senderId": 71, "senderName": "Gabriela Lesnicu" }
  }
]
```

### `GET /api/chat/conversations/:id`
Full message list for one conversation, unmasked (same message shape as `lastMessage` above, for every message). 404 if the conversation doesn't exist.

**`senderName` fallback:** if the account that sent a message is later deleted, `senderId` becomes `null` but the message itself is preserved (not deleted) — `senderName` falls back to `"Student șters"` / `"Manager șters"` ("deleted student/manager") instead of erroring or omitting the field. Always render `senderName` as-is; don't assume `senderId` is non-null.

### `POST /api/chat/conversations/:id/messages`
Body: `{ "body": "message text" }`. Sends as the calling staff member (their real `id`/role captured on the message). Returns the unmasked message shape.

## Real-time delivery (WebSocket)

Reuses the same gateway/rooms as notifications (`docs/frontend/task1-notifications.md`) — connect with your JWT, then:
```js
socket.emit('register');
```
Then listen for:
```js
socket.on('chat:message', (message) => { /* ... */ });
```
- **Students** receive this in their personal room, already in the masked shape (same as the REST endpoints above) — one event per new message, whichever side sent it.
- **ADMIN/MANAGER** sockets are auto-joined to a shared `role:staff` room on `register` and receive the unmasked shape for every message across every conversation (not just ones they're actively viewing) — filter/route client-side by `conversationId`.

Same caveat as notifications: if not connected/registered, you won't get the live event — use the REST endpoints to catch up on load/reconnect.
