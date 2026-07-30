# Notifications — Frontend Integration

In-app notification panel + real-time delivery over WebSocket. **Real OS/browser push (Web Push, FCM) is explicitly out of scope for this sprint** — see "Deferred: real push" below for what's needed later.

All REST routes are under `/api` and require `Authorization: Bearer <token>` (JWT) unless noted.

## REST endpoints

### `GET /api/notifications?page=&limit=&unreadOnly=`
Self-scoped — returns the caller's own notifications. `page` (default 1), `limit` (default 20), `unreadOnly` (`"true"`/omit).

```json
{
  "data": [
    {
      "id": 1, "userId": 883, "type": "LESSON_VIDEO", "title": "Videoclip recomandat",
      "body": "Instructorul tău ți-a recomandat un videoclip: ...",
      "data": "{\"reservationId\":38185,\"videoId\":2,\"youtubeUrl\":\"https://...\"}",
      "isRead": false, "readAt": null, "createdAt": "..."
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```
`type` is one of `LESSON_VIDEO`, `LESSON_REMINDER`, `EXAM_RESULT`, `EXAM_DOCUMENT`, `GENERAL`. `data` is a JSON-encoded string (not an object) — `JSON.parse` it client-side if present; it carries IDs for deep-linking (e.g. `reservationId`, `examId`) and varies by `type`.

### `GET /api/notifications/unread-count`
Self-scoped. `{ "count": 3 }` — poll this for a badge, or just track it from WS events (see below).

### `PATCH /api/notifications/:id/read`
Self-scoped — 404 if the notification doesn't belong to the caller.

### `PATCH /api/notifications/read-all`
Self-scoped. `{ "updated": 3 }`.

### `POST /api/notifications/document-ready`
Roles: **ADMIN, MANAGER**. Body: `{ "userId": 883, "message": "optional custom text" }`. Manually notifies a student that a document (e.g. practical exam paperwork) is ready for pickup — there's no automatic document-tracking system, so staff trigger this by hand.

## Real-time delivery (WebSocket)

The existing Socket.IO gateway (already used for reservation locking) now supports targeted delivery. After connecting with your JWT (same auth as before — `Authorization` header or `?token=` query param), **emit `register` once** with no payload:

```js
socket.emit('register');
```

This resolves your identity server-side and joins you to a personal room. From then on, any new notification for you arrives as:

```js
socket.on('notification:new', (notification) => { /* same shape as the REST list items above */ });
```

If you're ADMIN or MANAGER, `register` also joins you to a shared `role:staff` room (used by the chat feature, not by notifications today).

**Note:** if the client isn't connected/registered when a notification is created, it's simply not delivered live — use `GET /api/notifications` to catch up on reconnect. This isn't a substitute for the REST list, it's a supplement to it.

## Automatic triggers (no frontend action needed, just know when to expect them)

- **Video sent** (`LESSON_VIDEO`): fires when an instructor sends a recommended video after a lesson (see `docs/frontend/task2-recommended-videos.md`).
- **Exam result** (`EXAM_RESULT`): fires when a theory exam completes/fails/expires, and when a practical exam slot reservation is marked `PASSED`/`FAILED`/`ABSENT`.
- **Lesson reminders** (`LESSON_REMINDER`): a daily job (12:00 Chisinau time) checks every student; once they've completed 12+ lessons, it nudges them to book their next 15 lessons, repeating daily until they have 15 future lessons booked. **Heads-up on first deploy:** when this job first runs against the current student base, it will immediately notify a large number of existing students (verified ~578 students currently meet the "12+ completed, <15 booked" criteria) — expect a burst of notifications/WS events on day one, not a trickle.
- **Document ready** (`EXAM_DOCUMENT`): only via the manual `POST /notifications/document-ready` above.

## Deferred: real push (not built this sprint)

Real OS/browser push notifications (Web Push/FCM) were explicitly deferred — only in-app + WebSocket delivery exists today. When that work happens, expect (not live yet, no need to build against this):
- A `POST /api/notifications/push-subscribe` (or similar) endpoint for the frontend to register a browser push subscription (requires a VAPID public key from the backend and a service worker on the frontend).
- A `POST /api/notifications/push-unsubscribe` counterpart.
- No schema/endpoint exists for this yet — don't build against it until it ships.
