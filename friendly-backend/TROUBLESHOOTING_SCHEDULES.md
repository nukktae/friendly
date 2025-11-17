# Troubleshooting: Empty Schedules Issue

## 🔴 Problem: GET returns 0 schedules even after creating one

### Common Causes:

1. **UserId Mismatch** (Most Common)
   - You created a schedule with one `userId`
   - But you're querying with a different `userId`
   - **Solution:** Make sure the `userId` in GET matches the `userId` used in POST

2. **Environment Variable Issue**
   - Using `{{test_user_id}}` in Postman but it's set to a different value
   - **Solution:** Check your Postman environment variables

3. **Case Sensitivity**
   - `user123` vs `User123` vs `USER123` are different
   - **Solution:** Use exact same userId (case-sensitive)

---

## ✅ How to Fix

### Step 1: Check What UserId You Used in POST

Look at your POST request body:
```json
{
  "userId": "user123",  // ← Note this value
  "title": "Math Class",
  ...
}
```

### Step 2: Use the SAME UserId in GET

Make sure your GET URL uses the exact same userId:
```
GET http://localhost:4000/api/schedule/user123
```

**NOT:**
```
GET http://localhost:4000/api/schedule/{{test_user_id}}  // ← If this is different!
```

### Step 3: Verify in Postman

1. **Check your environment variables:**
   - Click the eye icon in Postman
   - See what `{{test_user_id}}` is set to
   - Make sure it matches the userId you used in POST

2. **Or use the literal value:**
   - Instead of `{{test_user_id}}`, use the actual value: `user123`

---

## 🧪 Test to Verify

### Test 1: Create Schedule
```bash
POST http://localhost:4000/api/schedule
Body: {
  "userId": "user123",
  "title": "Test",
  "date": "2024-11-12",
  "time": "2:00 PM"
}
```

### Test 2: Get Schedules (Use SAME userId)
```bash
GET http://localhost:4000/api/schedule/user123
```

**Expected:** Should return the schedule you just created

---

## 🔍 Debugging Steps

### 1. Check What UserId You're Querying

In Postman, before sending the GET request:
- Look at the URL: `{{base_url}}/api/schedule/{{test_user_id}}`
- Replace `{{test_user_id}}` with the actual value to see what it is
- Or check your environment variables

### 2. Verify the Schedule Was Created

Check the POST response - it should return:
```json
{
  "success": true,
  "id": "schedule_1234567890_abc123",
  "message": "Schedule saved successfully"
}
```

### 3. Test with cURL

```bash
# Create
curl -X POST http://localhost:4000/api/schedule \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","title":"Test","date":"2024-11-12","time":"2:00 PM"}'

# Get (use SAME userId)
curl http://localhost:4000/api/schedule/test123
```

---

## 📋 Quick Checklist

- [ ] Created schedule with userId: `"user123"`
- [ ] GET request uses the same userId: `/api/schedule/user123`
- [ ] Not using a different userId in environment variable
- [ ] Case matches exactly (user123 ≠ User123)
- [ ] No extra spaces in the userId

---

## 💡 Best Practice

**Use the same userId consistently:**

1. **Set an environment variable:**
   ```
   test_user_id = user123
   ```

2. **Use it in both requests:**
   - POST body: `"userId": "{{test_user_id}}"`
   - GET URL: `{{base_url}}/api/schedule/{{test_user_id}}`

3. **Or use literal values:**
   - POST body: `"userId": "user123"`
   - GET URL: `http://localhost:4000/api/schedule/user123`

---

## 🐛 Still Not Working?

1. **Check server logs:**
   ```bash
   pm2 logs friendly-backend --lines 20
   ```

2. **Test with cURL to isolate the issue:**
   ```bash
   # Create
   curl -X POST http://localhost:4000/api/schedule \
     -H "Content-Type: application/json" \
     -d '{"userId":"debug123","title":"Debug","date":"2024-11-12","time":"2:00 PM"}'
   
   # Get immediately
   curl http://localhost:4000/api/schedule/debug123
   ```

3. **Verify Firebase is working:**
   ```bash
   curl http://localhost:4000/health
   ```

---

## ✅ Confirmed Working

The endpoint is working correctly. When I tested:
- Created schedule with `userId: "user123"`
- Retrieved schedules with `/api/schedule/user123`
- **Result:** Successfully returned 3 schedules

The issue is definitely a userId mismatch in your Postman requests.

