# Authentication Endpoints - Quick Start

## ✅ Endpoints Available

The authentication endpoints are **already implemented** and ready to test:

- **POST** `/api/auth/signup` - Register a new user
- **POST** `/api/auth/login` - Login a user

---

## 🚀 Quick Test in Postman

### 1. Signup (POST)

**URL:** `http://localhost:4000/api/auth/signup`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "testuser@example.com",
  "password": "test123456",
  "name": "Test User"
}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "uid": "abc123xyz",
    "email": "testuser@example.com",
    "name": "Test User"
  },
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

---

### 2. Login (POST)

**URL:** `http://localhost:4000/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "testuser@example.com",
  "password": "test123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "uid": "abc123xyz",
    "email": "testuser@example.com",
    "name": "Test User",
    "profile": { ... }
  },
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "AEu4IL3..."
}
```

---

## 📋 Step-by-Step in Postman

### For Signup:

1. Open Postman
2. Create new request
3. Method: **POST**
4. URL: `http://localhost:4000/api/auth/signup`
5. Headers tab → Add: `Content-Type` = `application/json`
6. Body tab → Select **raw** → Select **JSON**
7. Paste the signup JSON body
8. Click **Send**

### For Login:

1. Create new request
2. Method: **POST**
3. URL: `http://localhost:4000/api/auth/login`
4. Headers tab → Add: `Content-Type` = `application/json`
5. Body tab → Select **raw** → Select **JSON**
6. Paste the login JSON body (use email/password from signup)
7. Click **Send**

---

## ✅ Testing Checklist

- [ ] Signup with new email works
- [ ] Signup returns user data and token
- [ ] Login with correct credentials works
- [ ] Login returns idToken and refreshToken
- [ ] Duplicate email signup returns error
- [ ] Wrong password login returns error

---

## 🔧 Common Issues

**"Email already in use"**
- Use a different email address

**"Login failed: INVALID_PASSWORD"**
- Check password is correct
- Make sure you signed up first

**"fetch is not a function"**
- Fixed! Server restarted with proper fetch support

---

## 📚 Full Documentation

See [POSTMAN_AUTH_GUIDE.md](./POSTMAN_AUTH_GUIDE.md) for complete documentation.

