# Postman Testing Guide - Schedule Endpoints

This guide will walk you through testing the schedule endpoints in Postman step-by-step.

## ✅ Prerequisites

1. **Backend server is running** (check with: `curl http://localhost:4000/health`)
2. **Postman installed** (download from [postman.com](https://www.postman.com/downloads/))

---

## 🚀 Quick Start

### Base URL
```
http://localhost:4000/api/schedule
```

---

## 📝 Test 1: Save a Schedule (POST)

### Step-by-Step:

1. **Open Postman** and create a new request

2. **Set the Method:**
   - Select `POST` from the dropdown

3. **Enter the URL:**
   ```
   http://localhost:4000/api/schedule
   ```

4. **Set Headers:**
   - Click on the **Headers** tab
   - Add a new header:
     - **Key:** `Content-Type`
     - **Value:** `application/json`

5. **Set Request Body:**
   - Click on the **Body** tab
   - Select **raw**
   - Select **JSON** from the dropdown (on the right)
   - Paste this JSON:
   ```json
   {
     "userId": "user123",
     "title": "Math Class",
     "date": "2024-01-15",
     "time": "10:00 AM",
     "description": "Algebra lesson on quadratic equations"
   }
   ```

6. **Send the Request:**
   - Click the blue **Send** button

7. **Expected Response (201 Created):**
   ```json
   {
     "success": true,
     "id": "schedule_1705320000000_abc123xyz",
     "message": "Schedule saved successfully"
   }
   ```
   - **Note the `id`** - you'll need it for testing GET requests

### Test Cases to Try:

#### ✅ Valid Request (Full Data)
```json
{
  "userId": "user123",
  "title": "Team Meeting",
  "date": "2024-03-10",
  "time": "3:30 PM",
  "description": "Weekly team sync meeting"
}
```

#### ✅ Valid Request (Minimal Data - No Description)
```json
{
  "userId": "user456",
  "title": "Study Session",
  "date": "2024-02-20",
  "time": "2:00 PM"
}
```

#### ❌ Missing userId (Should return 400 error)
```json
{
  "title": "Math Class",
  "date": "2024-01-15",
  "time": "10:00 AM"
}
```

#### ❌ Missing title (Should return 400 error)
```json
{
  "userId": "user123",
  "date": "2024-01-15",
  "time": "10:00 AM"
}
```

---

## 📖 Test 2: Get All Schedules for a User (GET)

### Step-by-Step:

1. **Create a new request** in Postman

2. **Set the Method:**
   - Select `GET` from the dropdown

3. **Enter the URL:**
   ```
   http://localhost:4000/api/schedule/user123
   ```
   - Replace `user123` with the `userId` you used in the POST request

4. **No Headers or Body needed** for GET requests

5. **Send the Request:**
   - Click the blue **Send** button

6. **Expected Response (200 OK):**
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
       }
     ],
     "count": 1
   }
   ```

### Test Cases to Try:

#### ✅ Get schedules for existing user
```
GET http://localhost:4000/api/schedule/user123
```

#### ✅ Get schedules for user with no schedules (should return empty array)
```
GET http://localhost:4000/api/schedule/user999
```

---

## 🔄 Complete Testing Workflow

### Step 1: Create a Schedule
1. Use **POST** `/api/schedule` with a test userId (e.g., "test_user_001")
2. Save the returned `id` from the response

### Step 2: Retrieve the Schedule
1. Use **GET** `/api/schedule/test_user_001`
2. Verify the schedule you just created appears in the response

### Step 3: Create Multiple Schedules
1. Create 2-3 more schedules with the same `userId`
2. Use **GET** again to see all schedules for that user
3. Verify they all appear in the list

### Step 4: Test Error Cases
1. Try POST without required fields (userId, title, date, time)
2. Verify you get appropriate error messages

---

## 📸 Postman Collection Setup (Optional)

### Create a Collection:

1. Click **New** → **Collection**
2. Name it: "Friendly Backend - Schedule API"
3. Add the two requests to this collection:
   - "Save Schedule (POST)"
   - "Get User Schedules (GET)"

### Use Environment Variables:

1. Click **Environments** → **+**
2. Create a new environment called "Local"
3. Add variables:
   - `base_url`: `http://localhost:4000`
   - `test_user_id`: `user123`
4. Update your requests to use: `{{base_url}}/api/schedule`
5. Use `{{test_user_id}}` in your requests

---

## 🧪 Testing Checklist

- [ ] POST request saves a schedule successfully
- [ ] POST request returns 201 status code
- [ ] POST request returns schedule ID
- [ ] GET request retrieves schedules for a user
- [ ] GET request returns 200 status code
- [ ] GET request returns empty array for user with no schedules
- [ ] POST without userId returns 400 error
- [ ] POST without title returns 400 error
- [ ] POST without date returns 400 error
- [ ] POST without time returns 400 error
- [ ] Multiple schedules can be saved for same user
- [ ] GET returns all schedules for a user

---

## 🐛 Troubleshooting

### "Couldn't connect to server"
- **Check:** Is the backend server running?
- **Fix:** Run `pm2 status` or `curl http://localhost:4000/health`

### "404 Not Found"
- **Check:** Is the URL correct? Should be `/api/schedule` not `/api/schedules`
- **Fix:** Verify the URL is exactly: `http://localhost:4000/api/schedule`

### "400 Bad Request"
- **Check:** Are all required fields present? (userId, title, date, time)
- **Fix:** Verify your JSON body has all required fields

### "500 Internal Server Error"
- **Check:** Check backend logs: `pm2 logs friendly-backend`
- **Fix:** Verify Firebase credentials are set in `.env` file

### Empty response or no schedules
- **Check:** Are you using the correct userId?
- **Fix:** Make sure the userId in GET matches the userId used in POST

---

## 📋 Sample Request Bodies

### Save Schedule - Full Example
```json
{
  "userId": "user123",
  "title": "Math Class",
  "date": "2024-01-15",
  "time": "10:00 AM",
  "description": "Algebra lesson on quadratic equations"
}
```

### Save Schedule - Minimal Example
```json
{
  "userId": "user456",
  "title": "Study Session",
  "date": "2024-02-20",
  "time": "2:00 PM"
}
```

### Save Schedule - Multiple Items
```json
{
  "userId": "user789",
  "title": "Team Meeting",
  "date": "2024-03-10",
  "time": "3:30 PM",
  "description": "Weekly team sync meeting to discuss project progress"
}
```

---

## 🎯 Quick Test Commands (cURL Alternative)

If you prefer command line, you can also test with cURL:

### Save Schedule:
```bash
curl -X POST http://localhost:4000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Math Class",
    "date": "2024-01-15",
    "time": "10:00 AM",
    "description": "Algebra lesson"
  }'
```

### Get Schedules:
```bash
curl http://localhost:4000/api/schedule/user123
```

---

## 📚 Additional Resources

- Full API documentation: See [POSTMAN_TEST_CASES.md](./POSTMAN_TEST_CASES.md)
- Backend setup: See [BACKEND_SETUP.md](./BACKEND_SETUP.md)

