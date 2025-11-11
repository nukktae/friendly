# Postman Test Cases for Schedule Endpoints

This document provides sample requests and responses for testing the schedule endpoints in Postman.

## Base URL
```
http://localhost:4000/api/schedule
```
Or if running on a different host/port:
```
http://YOUR_HOST:YOUR_PORT/api/schedule
```

---

## 1. POST /api/schedule - Save a User's Schedule

### Request Details
- **Method:** `POST`
- **URL:** `http://localhost:4000/api/schedule`
- **Headers:**
  ```
  Content-Type: application/json
  ```

### Request Body (JSON)
```json
{
  "userId": "user123",
  "title": "Math Class",
  "date": "2024-01-15",
  "time": "10:00 AM",
  "description": "Algebra lesson on quadratic equations"
}
```

### Success Response (201 Created)
```json
{
  "success": true,
  "id": "schedule_1705320000000_abc123xyz",
  "message": "Schedule saved successfully"
}
```

### Error Responses

#### Missing Required Field (400 Bad Request)
```json
{
  "error": "userId is required"
}
```

```json
{
  "error": "title is required"
}
```

```json
{
  "error": "date is required"
}
```

```json
{
  "error": "time is required"
}
```

#### Server Error (500 Internal Server Error)
```json
{
  "error": "Failed to save schedule"
}
```

### Additional Test Cases

#### Test Case 1: Minimal Required Fields
```json
{
  "userId": "user456",
  "title": "Study Session",
  "date": "2024-02-20",
  "time": "2:00 PM"
}
```

#### Test Case 2: With Description
```json
{
  "userId": "user789",
  "title": "Team Meeting",
  "date": "2024-03-10",
  "time": "3:30 PM",
  "description": "Weekly team sync meeting to discuss project progress"
}
```

#### Test Case 3: Empty Description (Optional)
```json
{
  "userId": "user123",
  "title": "Gym Workout",
  "date": "2024-01-20",
  "time": "6:00 AM",
  "description": ""
}
```

---

## 2. GET /api/schedule/:userId - Retrieve All Schedules for a User

### Request Details
- **Method:** `GET`
- **URL:** `http://localhost:4000/api/schedule/user123`
- **Headers:** None required

### Success Response (200 OK)
```json
{
  "success": true,
  "schedules": [
    {
      "id": "schedule_1705320000000_abc123xyz",
      "userId": "user123",
      "title": "Math Class",
      "date": "2024-01-15",
      "time": "10:00 AM",
      "description": "Algebra lesson on quadratic equations",
      "isActive": true,
      "createdAt": {
        "_seconds": 1705320000,
        "_nanoseconds": 0
      },
      "updatedAt": {
        "_seconds": 1705320000,
        "_nanoseconds": 0
      }
    },
    {
      "id": "schedule_1705406400000_def456uvw",
      "userId": "user123",
      "title": "Study Session",
      "date": "2024-02-20",
      "time": "2:00 PM",
      "description": "",
      "isActive": true,
      "createdAt": {
        "_seconds": 1705406400,
        "_nanoseconds": 0
      },
      "updatedAt": {
        "_seconds": 1705406400,
        "_nanoseconds": 0
      }
    }
  ],
  "count": 2
}
```

### Empty Response (200 OK - No Schedules Found)
```json
{
  "success": true,
  "schedules": [],
  "count": 0
}
```

### Error Responses

#### Missing userId (400 Bad Request)
```json
{
  "error": "userId is required"
}
```

#### Server Error (500 Internal Server Error)
```json
{
  "error": "Failed to fetch schedules"
}
```

### Additional Test Cases

#### Test Case 1: User with Multiple Schedules
```
GET http://localhost:4000/api/schedule/user123
```

#### Test Case 2: User with No Schedules
```
GET http://localhost:4000/api/schedule/user999
```

#### Test Case 3: Different User ID
```
GET http://localhost:4000/api/schedule/user456
```

---

## Postman Collection Setup

### Environment Variables (Optional)
Create a Postman environment with:
- `base_url`: `http://localhost:4000`
- `test_user_id`: `user123`

### Collection Structure

1. **Save Schedule - Full Data**
   - Method: POST
   - URL: `{{base_url}}/api/schedule`
   - Body: Use the "With Description" example above

2. **Save Schedule - Minimal Data**
   - Method: POST
   - URL: `{{base_url}}/api/schedule`
   - Body: Use the "Minimal Required Fields" example above

3. **Save Schedule - Missing Field (Error Test)**
   - Method: POST
   - URL: `{{base_url}}/api/schedule`
   - Body: Remove `userId` field to test validation

4. **Get User Schedules**
   - Method: GET
   - URL: `{{base_url}}/api/schedule/{{test_user_id}}`

5. **Get User Schedules - Empty**
   - Method: GET
   - URL: `{{base_url}}/api/schedule/nonexistent_user`

---

## Testing Workflow

1. **First, save a schedule:**
   - Use POST `/api/schedule` with a test userId
   - Note the returned `id` (optional, not needed for GET)

2. **Then, retrieve schedules:**
   - Use GET `/api/schedule/:userId` with the same userId
   - Verify the schedule you just created appears in the response

3. **Test error cases:**
   - Try POST without required fields
   - Try GET with invalid userId format

---

## Notes

- All timestamps are returned as Firestore Timestamp objects with `_seconds` and `_nanoseconds`
- Schedules are ordered by `updatedAt` in descending order (newest first)
- The `isActive` field is automatically set to `true` for new schedules
- Date format should be `YYYY-MM-DD` (e.g., "2024-01-15")
- Time format is flexible (e.g., "10:00 AM", "2:00 PM", "14:00")

