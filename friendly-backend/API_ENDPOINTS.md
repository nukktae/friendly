# Friendly API Endpoints

Complete list of all API endpoints from the Friendly backend.

**Base URL:** `http://localhost:4000` (development)

---

## Authentication (`/api/auth`)

### POST `/api/auth/signup`
Create a new user account
- **Body:** `{ email, password, name? }`
- **Response:** `{ success: true, user: { uid, email, name }, token }`

### POST `/api/auth/login`
Login with Firebase ID token or email/password
- **Body:** `{ idToken }` OR `{ email, password }`
- **Response:** `{ success: true, user: { uid, email, name, profile }, idToken?, refreshToken? }`

### POST `/api/auth/verify`
Verify Firebase ID token
- **Body:** `{ idToken }`
- **Response:** `{ success: true, user: { uid, email, name, profile } }`

### POST `/api/auth/google`
Sign in with Google
- **Body:** `{ idToken }` - Google ID token from client-side Firebase Auth
- **Response:** `{ success: true, user: { uid, email, name, profile } }`

### POST `/api/auth/signout`
Sign out user (revoke token)
- **Body:** `{ idToken? }` (optional)
- **Response:** `{ success: true, message: 'Signed out successfully' }`

### GET `/api/auth/user/:uid`
Get user by UID
- **Response:** `{ success: true, user }`

### PATCH `/api/auth/user/:uid`
Update user account
- **Body:** `{ email?, password?, displayName? }`
- **Response:** `{ success: true, user }`

### DELETE `/api/auth/user/:uid`
Delete user account
- **Response:** `{ success: true, message: 'User deleted successfully' }`

---

## Community (`/api/community`)

### GET `/api/community/verify/:userId`
Check if user is school verified
- **Response:** `{ success: true, schoolVerified: boolean, university?: string }`

### POST `/api/community/verify-school-email`
Verify school email and mark user as verified
- **Body:** `{ userId, schoolEmail, university? }`
- **Response:** `{ success: true, message, schoolVerified: true, schoolEmail, university }`

### POST `/api/community/posts`
Create a new community post (requires school verification)
- **Content-Type:** `multipart/form-data` (with image) OR `application/json` (text only)
- **Body:** `{ userId, content, category?, image? }`
- **Response:** `{ success: true, postId, post, message }`

### GET `/api/community/posts`
List community posts with optional filters
- **Query params:** `category?`, `university?`, `userId?`, `limit?`
- **Response:** `{ success: true, posts: [], count: number }`

### GET `/api/community/posts/:postId`
Get a specific post by ID
- **Response:** `{ success: true, post }`

### PATCH `/api/community/posts/:postId`
Update a post (only by author, requires school verification)
- **Content-Type:** `multipart/form-data` (with image) OR `application/json` (text only)
- **Body:** `{ userId, content?, category?, image?, removeImage? }`
- **Response:** `{ success: true, postId, post, message }`

### DELETE `/api/community/posts/:postId`
Delete a post (only by author, requires school verification)
- **Query params:** `userId`
- **Response:** `{ success: true, postId, message }`

### POST `/api/community/posts/:postId/like`
Toggle like on a post (requires school verification)
- **Body:** `{ userId }`
- **Response:** `{ success: true, postId, liked: boolean, likeCount: number }`

### POST `/api/community/posts/:postId/comments`
Add a comment to a post (requires school verification)
- **Body:** `{ userId, content }`
- **Response:** `{ success: true, postId, comment, message }`

---

## Schedule (`/api/schedule`)

### POST `/api/schedule/:userId/analyze-image`
Upload schedule image and analyze it with AI
- **Content-Type:** `multipart/form-data`
- **Body:** `{ image: File }`
- **Response:** `{ success: true, scheduleId, userId, items: [], count: number, message }`

### POST `/api/schedule`
Save a user's schedule to the database
- **Body:** `{ userId, title, date, time, description? }`
- **Response:** `{ success: true, id: scheduleId, message }`

### POST `/api/schedule/schedule/:scheduleId/confirm`
Confirm and save schedule - creates lectures from schedule items
- **Body:** `{ userId }`
- **Response:** `{ success: true, scheduleId, userId, lecturesCreated: [], count: number, message }`

### GET `/api/schedule/schedule/:scheduleId`
Get a specific schedule by scheduleId
- **Query params:** `userId`
- **Response:** `{ success: true, schedule }`

### PATCH `/api/schedule/schedule/:scheduleId`
Update schedule items (add, edit, delete)
- **Body:** `{ userId, add?, edit?, delete? }`
- **Response:** `{ success: true, scheduleId, userId, items: [], count: number, message }`

### DELETE `/api/schedule/schedule/:scheduleId`
Delete a schedule
- **Query params:** `userId`
- **Response:** `{ success: true, scheduleId, message }`

### GET `/api/schedule/:userId`
Retrieve all saved schedules for a user
- **Response:** `{ success: true, schedules: [], count: number }`

### GET `/api/schedule/id/:id` (Legacy)
Get a schedule by id and userId
- **Query params:** `userId`
- **Response:** Schedule object

### GET `/api/schedule/list/all` (Legacy)
List schedules for a user (query param version)
- **Query params:** `userId`
- **Response:** Array of schedule items

---

## Users (`/api/users`)

### POST `/api/users/:uid/profile`
Create/merge user profile
- **Body:** Profile data object
- **Response:** `{ success: true, message: 'Profile created successfully', profile }`

### GET `/api/users/:uid/profile`
Get profile
- **Response:** `{ success: true, profile }`

### PATCH `/api/users/:uid/profile`
Update profile
- **Body:** Profile update object
- **Response:** `{ success: true, message: 'Profile updated successfully', profile }`

### POST `/api/users/:uid/profile/nickname`
Add/Update nickname
- **Body:** `{ nickname: string }`
- **Response:** `{ success: true, message: 'Nickname updated successfully', profile }`

### POST `/api/users/:uid/profile/picture`
Upload profile picture
- **Content-Type:** `multipart/form-data`
- **Body:** `{ picture: File }`
- **Response:** `{ success: true, message: 'Profile picture uploaded successfully', profile, profilePictureUrl, pictureUrl }`

### GET `/api/users/:uid/profile/picture`
Get profile picture
- **Response:** Image file

### GET `/api/users`
List users (admin)
- **Response:** `{ success: true, users: [], count: number }`

---

## Calendar (`/api/calendar`)

### GET `/api/calendar/events`
Fetch Google Calendar events
- **Headers:** `Authorization: Bearer <access_token>`
- **Query params:** `calendarId?` (default: 'primary'), `timeMin?`, `timeMax?`
- **Response:** Array of calendar events

### POST `/api/calendar/events`
Create Google Calendar event
- **Headers:** `Authorization: Bearer <access_token>`
- **Body:** `{ calendarId?` (default: 'primary'), `event: { ... } }`
- **Response:** Created event object

### PUT `/api/calendar/events/:eventId`
Update Google Calendar event
- **Headers:** `Authorization: Bearer <access_token>`
- **Body:** `{ calendarId?` (default: 'primary'), `event: { ... } }`
- **Response:** Updated event object

### DELETE `/api/calendar/events/:eventId`
Delete Google Calendar event
- **Headers:** `Authorization: Bearer <access_token>`
- **Query params:** `calendarId?` (default: 'primary')
- **Response:** 204 No Content

### GET `/api/calendar/calendars`
List Google Calendars
- **Headers:** `Authorization: Bearer <access_token>`
- **Response:** Array of calendar objects

### POST `/api/calendar/sync-to-schedule`
Sync Google Calendar events and create a schedule
- **Body:** `{ userId, accessToken, calendarId?, timeMin?, timeMax? }`
- **Response:** `{ success: true, scheduleId?, itemsCreated: number, message? }`

### POST `/api/calendar/disconnect`
Disconnect/unsync Google Calendar
- **Body:** `{ userId, deleteSchedules?: boolean }`
- **Response:** `{ success: true, message }`

---

## Lectures (`/api/lectures`)

### POST `/api/lectures`
Create a new lecture (simple creation without starting recording)
- **Body:** `{ userId, title, day?, time?, place?, description?, tags? }`
- **Response:** `{ success: true, lectureId, lecture, message }`

### POST `/api/lectures/:lectureId/start-transcribing`
Start transcribing an existing lecture
- **Body:** `{ userId }`
- **Response:** `{ success: true, lectureId, message }`

### POST `/api/lectures/:lectureId/transcribe-chunk`
Live transcription of audio chunk (every 10-30 sec during recording)
- **Content-Type:** `multipart/form-data`
- **Body:** `{ audio: File, userId }`
- **Response:** `{ success: true, transcript: string, liveTranscript: string }`

### POST `/api/lectures/:lectureId/transcribe`
Transcribe audio file OR accept direct transcript text
- **Content-Type:** `multipart/form-data` (audio file) OR `application/json` (direct transcript)
- **Body:** `{ userId, audio?: File, transcript?: string, duration? }`
- **Response:** `{ success: true, transcriptionId, transcript, message }`

### POST `/api/lectures/transcription/:transcriptionId/summary`
Generate AI summary from transcript using transcription ID
- **Response:** `{ success: true, transcriptionId, lectureId, summary }`

### POST `/api/lectures/transcription/:transcriptionId/checklist`
Generate AI checklist from transcript using transcription ID
- **Response:** `{ success: true, transcriptionId, lectureId, actionItems: [] }`

### GET `/api/lectures/:lectureId/transcripts`
Get all transcripts for a lecture
- **Query params:** `userId`
- **Response:** `{ success: true, lectureId, transcripts: [], count: number }`

### DELETE `/api/lectures/:lectureId/transcript`
Delete transcript for a lecture
- **Query params:** `userId, transcriptionId?`
- **Response:** `{ success: true, lectureId, message }`

### PATCH `/api/lectures/:lectureId`
Update/edit a lecture
- **Body:** `{ userId, title?, day?, time?, place?, description?, tags?, status?, ...otherFields }`
- **Response:** `{ success: true, lectureId, lecture, message }`

### GET `/api/lectures/:lectureId`
Get lecture details
- **Query params:** `userId`
- **Response:** `{ success: true, lecture }`

### PATCH `/api/lectures/transcription/:transcriptionId/checklist/:itemId/toggle`
Toggle checklist item (check/uncheck)
- **Response:** `{ success: true, transcriptionId, lectureId, item }`

### PATCH `/api/lectures/transcription/:transcriptionId/checklist`
Update checklist items (add, edit, delete)
- **Body:** `{ add?, edit?, delete?, toggle? }`
- **Response:** `{ success: true, transcriptionId, lectureId, actionItems: [] }`

### POST `/api/lectures/chat`
Global chatbot (can answer about any lecture)
- **Body:** `{ userId, question }`
- **Response:** `{ success: true, chatId, answer, lecturesReferenced: [] }`

### GET `/api/lectures/chat/history`
Get chat history for a user
- **Query params:** `userId, limit?` (default: 50)
- **Response:** `{ success: true, chatHistory: [], count: number }`

### DELETE `/api/lectures/chat/:chatId`
Delete a specific chat message
- **Query params:** `userId`
- **Response:** `{ success: true, message }`

### DELETE `/api/lectures/chat/history/all`
Delete all chat history for a user
- **Query params:** `userId`
- **Response:** `{ success: true, message, deletedCount: number }`

### GET `/api/lectures`
Get all lectures with optional filters
- **Query params:** `userId` (required), `status?`, `limit?`, `offset?`
- **Response:** `{ success: true, lectures: [], count: number, total: number, limit?, offset? }`

### GET `/api/lectures/user/:userId`
List all lectures for a user (with optional query filters)
- **Query params:** `status?`, `limit?`, `offset?`
- **Response:** `{ success: true, lectures: [], count: number, total: number, limit?, offset? }`

### GET `/api/lectures/transcription/:transcriptionId/transcript`
Get transcript by transcription ID
- **Query params:** `userId`
- **Response:** `{ success: true, transcriptionId, lectureId, transcript }`

### GET `/api/lectures/transcription/:transcriptionId/summary`
Get summary by transcription ID
- **Query params:** `userId`
- **Response:** `{ success: true, transcriptionId, lectureId, summary }`

### GET `/api/lectures/transcription/:transcriptionId/checklist`
Get checklist by transcription ID
- **Query params:** `userId`
- **Response:** `{ success: true, transcriptionId, lectureId, actionItems: [] }`

### DELETE `/api/lectures/:lectureId`
Delete a lecture
- **Query params:** `userId`
- **Response:** `{ success: true, message }`

---

## Notes

- All endpoints return JSON responses unless otherwise specified
- Authentication: Most endpoints require `userId` in body or query params
- School verification: Community endpoints require school-verified users
- File uploads: Use `multipart/form-data` for image/audio uploads
- Google Calendar endpoints require `Authorization: Bearer <access_token>` header
- Base URL can be configured via environment variables

---

## Postman Collection

A Postman collection is available at:
- `friendly-backend/Lecture_API.postman_collection.json`

This collection includes examples for all lecture-related endpoints.

