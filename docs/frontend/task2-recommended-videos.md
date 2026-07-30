# Recommended Videos — Frontend Integration

Admin/manager-curated list of recommended YouTube videos; instructors send one to a student after each lesson.

All routes are under the global `/api` prefix and require `Authorization: Bearer <token>` (JWT).

## Endpoints

### `POST /api/recommended-videos`
Roles: **ADMIN, MANAGER**

Request body:
```json
{ "title": "Parcare paralelă - pas cu pas", "youtubeUrl": "https://www.youtube.com/watch?v=..." }
```
`youtubeUrl` must be a `youtube.com` or `youtu.be` link (400 if not). Returns the created video (201).

### `GET /api/recommended-videos?page=&limit=`
Roles: any authenticated user. `page` (default 1) and `limit` (default 50) are optional.

Response:
```json
{
  "data": [
    { "id": 1, "title": "...", "youtubeUrl": "...", "createdAt": "...", "updatedAt": "...", "_count": { "sends": 3 } }
  ],
  "meta": { "total": 12, "page": 1, "limit": 50, "totalPages": 1 }
}
```

### `GET /api/recommended-videos/:id`
Roles: any authenticated user. 404 if not found.

### `PUT /api/recommended-videos/:id`
Roles: **ADMIN, MANAGER**. Body: same shape as create, all fields optional.

### `DELETE /api/recommended-videos/:id`
Roles: **ADMIN, MANAGER**. Returns `400` if the video has already been sent to at least one student (`"Nu poți șterge acest videoclip: a fost deja trimis la N lecții."`) — reassigning/removing sent videos isn't supported, only videos with zero sends can be deleted.

### `GET /api/recommended-videos/pending-sends`
Roles: **INSTRUCTOR** (self-scoped — resolves the caller's own instructor profile from the JWT, no `:id` param).

Returns past, non-cancelled lessons taught by the calling instructor that don't have a video sent yet — this is the "obligation" list to show in the instructor's dashboard:
```json
[
  { "id": 38185, "startTime": "2026-07-29T16:30:00.000Z", "user": { "id": 883, "firstName": "Ana", "lastName": "Chiaburu" } }
]
```

### `POST /api/recommended-videos/send`
Roles: **INSTRUCTOR**

Request body:
```json
{ "reservationId": 38185, "videoId": 1 }
```
- `404` if the reservation doesn't belong to the caller, or the video doesn't exist
- `400` if the reservation is cancelled or hasn't happened yet
- `409` if a video was already sent for that reservation (one video per lesson, not resendable via this endpoint)

Returns the created send record on success:
```json
{
  "id": 1, "reservationId": 38185, "userId": 883, "instructorId": 18, "videoId": 1, "createdAt": "...",
  "video": { "id": 1, "title": "...", "youtubeUrl": "..." },
  "user": { "id": 883, "firstName": "Ana", "lastName": "Chiaburu" }
}
```

## Not yet wired up

Sending a video does **not** yet create a notification for the student — that hook is added in the notifications task (Task 1), which is next in this sprint. No frontend action needed for that; it'll just start showing up in the student's notification panel once that ships.
