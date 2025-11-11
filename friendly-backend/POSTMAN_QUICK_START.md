# Postman Quick Start - Schedule Endpoints

## 🎯 Quick Reference

### Base URL
```
http://localhost:4000/api/schedule
```

---

## 📤 POST Request - Save a Schedule

**Method:** `POST`  
**URL:** `http://localhost:4000/api/schedule`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "userId": "user123",
  "title": "Math Class",
  "date": "2024-01-15",
  "time": "10:00 AM",
  "description": "Algebra lesson"
}
```

**Expected Response:**
```json
{
  "success": true,
  "id": "schedule_1234567890_abc123",
  "message": "Schedule saved successfully"
}
```

---

## 📥 GET Request - Get All Schedules

**Method:** `GET`  
**URL:** `http://localhost:4000/api/schedule/user123`

(Replace `user123` with your actual userId)

**Expected Response:**
```json
{
  "success": true,
  "schedules": [
    {
      "id": "schedule_1234567890_abc123",
      "userId": "user123",
      "title": "Math Class",
      "date": "2024-01-15",
      "time": "10:00 AM",
      "description": "Algebra lesson",
      "isActive": true,
      "createdAt": {...},
      "updatedAt": {...}
    }
  ],
  "count": 1
}
```

---

## 📋 Step-by-Step in Postman

### For POST Request:

1. Open Postman
2. Click **New** → **HTTP Request**
3. Select **POST** from dropdown
4. Enter URL: `http://localhost:4000/api/schedule`
5. Go to **Headers** tab
   - Add: `Content-Type` = `application/json`
6. Go to **Body** tab
   - Select **raw**
   - Select **JSON** (dropdown on right)
   - Paste the JSON body above
7. Click **Send**

### For GET Request:

1. Create new request
2. Select **GET** from dropdown
3. Enter URL: `http://localhost:4000/api/schedule/user123`
4. Click **Send**

---

## ✅ Test Checklist

1. ✅ Server is running (`curl http://localhost:4000/health`)
2. ✅ POST request saves schedule
3. ✅ GET request retrieves schedules
4. ✅ Error handling works (missing fields)

---

## 🔧 Troubleshooting

**Error: "Cannot read properties of null (reading 'firestore')"**
- Firebase credentials not configured
- Check `.env` file has `FIREBASE_SERVICE_ACCOUNT_JSON`
- See Firebase setup documentation

**Error: "Couldn't connect to server"**
- Server not running
- Run: `pm2 status` to check
- Start: `pm2 start ecosystem.config.js`

---

For detailed instructions, see [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md)

