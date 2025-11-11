# Postman Testing Guide - Authentication Endpoints

This guide provides step-by-step instructions for testing the authentication endpoints (signup and login) in Postman.

## ✅ Existing Endpoints

The authentication endpoints are already implemented and available at:

- **POST** `/api/auth/signup` - Register a new user
- **POST** `/api/auth/login` - Authenticate a user

---

## 📝 Endpoint 1: Signup (POST)

### Endpoint Details
- **Method:** `POST`
- **URL:** `http://localhost:4000/api/auth/signup`
- **Headers:** `Content-Type: application/json`

### Request Body

#### Required Fields:
- `email` (string) - User's email address
- `password` (string) - User's password (minimum 6 characters)

#### Optional Fields:
- `name` (string) - User's display name

### Example Request Body:
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

### Success Response (201 Created):
```json
{
  "success": true,
  "user": {
    "uid": "abc123xyz456",
    "email": "john.doe@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Responses:

#### Missing Required Fields (400 Bad Request):
```json
{
  "error": "Email and password are required"
}
```

#### Email Already Exists (400 Bad Request):
```json
{
  "error": "Signup failed: The email address is already in use by another account."
}
```

#### Weak Password (400 Bad Request):
```json
{
  "error": "Signup failed: Password should be at least 6 characters"
}
```

---

## 🔐 Endpoint 2: Login (POST)

### Endpoint Details
- **Method:** `POST`
- **URL:** `http://localhost:4000/api/auth/login`
- **Headers:** `Content-Type: application/json`

### Login Methods

The login endpoint supports **two methods**:

#### Method 1: Email/Password Login (Recommended for Postman)

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "uid": "abc123xyz456",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "profile": {
      "email": "john.doe@example.com",
      "fullName": "John Doe",
      "onboardingCompleted": false,
      "enrolledClasses": []
    }
  },
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "AEu4IL3..."
}
```

#### Method 2: ID Token Login (For client-side Firebase Auth)

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "uid": "abc123xyz456",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "profile": { ... }
  }
}
```

### Error Responses:

#### Missing Credentials (400 Bad Request):
```json
{
  "error": "Either idToken or email/password is required"
}
```

#### Invalid Credentials (401 Unauthorized):
```json
{
  "error": "Login failed: INVALID_PASSWORD"
}
```

#### User Not Found (401 Unauthorized):
```json
{
  "error": "Login failed: EMAIL_NOT_FOUND"
}
```

---

## 🧪 Step-by-Step Postman Testing

### Test 1: Signup a New User

1. **Open Postman** and create a new request
2. **Set Method:** `POST`
3. **Enter URL:** `http://localhost:4000/api/auth/signup`
4. **Go to Headers tab:**
   - Add: `Content-Type` = `application/json`
5. **Go to Body tab:**
   - Select **raw**
   - Select **JSON** (dropdown on right)
   - Paste:
   ```json
   {
     "email": "testuser@example.com",
     "password": "test123456",
     "name": "Test User"
   }
   ```
6. **Click Send**
7. **Expected:** 201 status with user data and token

### Test 2: Login with Email/Password

1. **Create a new request**
2. **Set Method:** `POST`
3. **Enter URL:** `http://localhost:4000/api/auth/login`
4. **Set Headers:** `Content-Type: application/json`
5. **Set Body (raw JSON):**
   ```json
   {
     "email": "testuser@example.com",
     "password": "test123456"
   }
   ```
6. **Click Send**
7. **Expected:** 200 status with user data, idToken, and refreshToken

### Test 3: Test Error Cases

#### Invalid Email:
```json
{
  "email": "invalid-email",
  "password": "test123456"
}
```
**Expected:** 400 error

#### Wrong Password:
```json
{
  "email": "testuser@example.com",
  "password": "wrongpassword"
}
```
**Expected:** 401 error

#### Missing Fields:
```json
{
  "email": "testuser@example.com"
}
```
**Expected:** 400 error

---

## 📋 Complete Testing Workflow

### Step 1: Signup
1. Use **POST** `/api/auth/signup` with a new email
2. Save the returned `uid` and `token` from response

### Step 2: Login
1. Use **POST** `/api/auth/login` with the same email/password
2. Save the `idToken` from response (you can use this for authenticated requests)

### Step 3: Use Token
1. The `idToken` can be used in subsequent requests for authentication
2. Include it in headers: `Authorization: Bearer <idToken>`

---

## 🔑 Understanding the Tokens

### Custom Token (from Signup)
- Returned in the `token` field
- Can be exchanged for an ID token on the client side
- Used for initial authentication

### ID Token (from Login)
- Returned in the `idToken` field
- Can be used to verify the user's identity
- Include in `Authorization` header for protected routes

### Refresh Token (from Login)
- Returned in the `refreshToken` field
- Used to get new ID tokens when they expire
- Store securely on the client

---

## 📊 Postman Collection Setup

### Create Environment Variables:

1. Click **Environments** → **+**
2. Create environment: "Local Development"
3. Add variables:
   - `base_url`: `http://localhost:4000`
   - `test_email`: `testuser@example.com`
   - `test_password`: `test123456`
   - `auth_token`: (will be set after login)

### Use Variables in Requests:

- URL: `{{base_url}}/api/auth/login`
- Body: Use `{{test_email}}` and `{{test_password}}`

### Auto-save Token:

Create a **Test** script in the login request:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("auth_token", jsonData.idToken);
    pm.environment.set("user_uid", jsonData.user.uid);
}
```

---

## ✅ Testing Checklist

- [ ] Signup with valid email and password
- [ ] Signup returns 201 status
- [ ] Signup returns user data and token
- [ ] Login with correct credentials
- [ ] Login returns 200 status
- [ ] Login returns user data, idToken, and refreshToken
- [ ] Signup with duplicate email returns error
- [ ] Login with wrong password returns error
- [ ] Login with non-existent email returns error
- [ ] Missing required fields return 400 error

---

## 🐛 Troubleshooting

### "Email and password are required"
- **Fix:** Make sure both `email` and `password` are in the request body

### "The email address is already in use"
- **Fix:** Use a different email address, or delete the existing user first

### "INVALID_PASSWORD" or "EMAIL_NOT_FOUND"
- **Fix:** Verify the email and password are correct
- **Fix:** Make sure you've signed up the user first

### "Firebase Admin SDK not initialized"
- **Fix:** Check Firebase credentials in `.env` file
- **Fix:** Restart the server: `pm2 restart friendly-backend`

### Server not responding
- **Fix:** Check if server is running: `pm2 status`
- **Fix:** Test health endpoint: `curl http://localhost:4000/health`

---

## 📚 Additional Endpoints

The auth routes also include:

- **POST** `/api/auth/verify` - Verify an ID token
- **GET** `/api/auth/user/:uid` - Get user by UID
- **PATCH** `/api/auth/user/:uid` - Update user
- **DELETE** `/api/auth/user/:uid` - Delete user

See the code in `routes/auth.js` for details.

---

## 🎯 Quick Reference

### Signup:
```
POST http://localhost:4000/api/auth/signup
Body: { "email": "...", "password": "...", "name": "..." }
```

### Login:
```
POST http://localhost:4000/api/auth/login
Body: { "email": "...", "password": "..." }
```

---

## 📝 Sample Test Cases

### Test Case 1: Successful Signup
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User"
}
```

### Test Case 2: Signup Without Name
```json
{
  "email": "user2@example.com",
  "password": "password123"
}
```

### Test Case 3: Successful Login
```json
{
  "email": "newuser@example.com",
  "password": "password123"
}
```

### Test Case 4: Invalid Email Format
```json
{
  "email": "not-an-email",
  "password": "password123"
}
```

### Test Case 5: Weak Password
```json
{
  "email": "user3@example.com",
  "password": "123"
}
```

---

For more information, see the main [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md)

