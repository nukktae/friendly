# Firebase Setup Guide

This guide will help you configure Firebase credentials for the backend server.

## 🔴 Current Error

If you're seeing this error:
```
"Cannot read properties of null (reading 'firestore')"
```

It means Firebase Admin SDK is not initialized. Follow the steps below to fix it.

---

## 📋 Step-by-Step Setup

### Step 1: Get Firebase Service Account Key

1. **Go to Firebase Console:**
   - Visit: https://console.firebase.google.com/
   - Select your project (or create a new one)

2. **Navigate to Service Accounts:**
   - Click the **⚙️ Settings** icon (gear icon) in the left sidebar
   - Click **Project Settings**
   - Go to the **Service Accounts** tab

3. **Generate New Private Key:**
   - Click **Generate new private key** button
   - A warning dialog will appear - click **Generate key**
   - A JSON file will be downloaded (e.g., `friendly-34f75-firebase-adminsdk-xxxxx.json`)

### Step 2: Add Credentials to Backend

You have **two options**:

#### Option A: Using the Setup Script (Recommended)

1. **Save the downloaded JSON file** somewhere accessible (e.g., in the `friendly-backend` folder)

2. **Run the setup script:**
   ```bash
   cd friendly-backend
   node setup-firebase-credentials.js path/to/your-service-account-key.json
   ```

   Example:
   ```bash
   node setup-firebase-credentials.js ~/Downloads/friendly-34f75-firebase-adminsdk-xxxxx.json
   ```

3. **Restart the server:**
   ```bash
   pm2 restart friendly-backend
   ```

#### Option B: Manual Setup

1. **Open the downloaded JSON file** in a text editor

2. **Copy the entire JSON content** (it should look like this):
   ```json
   {
     "type": "service_account",
     "project_id": "friendly-34f75",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "...",
     "token_uri": "...",
     ...
   }
   ```

3. **Minify the JSON** (remove all newlines and extra spaces):
   - Use an online tool: https://www.jsonformatter.org/json-minify
   - Or use this command: `cat service-account.json | jq -c`

4. **Open `.env` file** in the `friendly-backend` folder

5. **Update the line:**
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON=
   ```
   
   To:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"friendly-34f75",...}'
   ```
   
   **Important:** 
   - Wrap the entire JSON in single quotes `'...'`
   - Escape any single quotes inside the JSON with `\'`
   - The entire JSON should be on one line

6. **Save the `.env` file**

7. **Restart the server:**
   ```bash
   pm2 restart friendly-backend
   ```

### Step 3: Verify Setup

1. **Check server logs:**
   ```bash
   pm2 logs friendly-backend --lines 20
   ```

2. **Look for this message:**
   ```
   ✅ Firebase Admin SDK initialized successfully
   ```

3. **Test the endpoint:**
   ```bash
   curl http://localhost:4000/health
   ```

4. **Test schedule endpoint:**
   ```bash
   curl -X POST http://localhost:4000/api/schedule \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test_user",
       "title": "Test Schedule",
       "date": "2024-11-11",
       "time": "2:00 PM",
       "description": "Testing Firebase"
     }'
   ```

   You should get a success response instead of the Firebase error.

---

## 🔧 Troubleshooting

### Error: "Failed to initialize Firebase Admin SDK"

**Possible causes:**
1. **Invalid JSON format** - Make sure the JSON is properly minified and escaped
2. **Missing quotes** - The JSON should be wrapped in single quotes in `.env`
3. **Extra newlines** - The JSON must be on a single line

**Fix:**
- Use the setup script: `node setup-firebase-credentials.js <path-to-json>`
- Or double-check your `.env` file format

### Error: "Cannot read properties of null (reading 'firestore')"

**Cause:** Firebase Admin SDK not initialized

**Fix:**
1. Check `.env` file has `FIREBASE_SERVICE_ACCOUNT_JSON` set
2. Verify the JSON is valid
3. Restart the server: `pm2 restart friendly-backend`
4. Check logs: `pm2 logs friendly-backend`

### Error: "Permission denied" or "Invalid credentials"

**Cause:** Service account key doesn't have proper permissions

**Fix:**
1. Make sure you downloaded the key from the correct Firebase project
2. Verify the project ID matches in the JSON
3. Regenerate a new key if needed

### Server not picking up .env changes

**Fix:**
```bash
# Restart PM2 to reload environment variables
pm2 restart friendly-backend

# Or stop and start again
pm2 stop friendly-backend
pm2 start ecosystem.config.js
```

---

## 🔒 Security Notes

1. **Never commit the service account key** to Git
   - The `.gitignore` file already excludes `.env`
   - Never commit the downloaded JSON file

2. **Keep the key secure**
   - Don't share it publicly
   - Don't commit it to version control
   - Rotate keys periodically

3. **Use environment variables**
   - Always use `.env` file for credentials
   - Never hardcode credentials in code

---

## ✅ Quick Checklist

- [ ] Downloaded Firebase service account JSON key
- [ ] Added `FIREBASE_SERVICE_ACCOUNT_JSON` to `.env` file
- [ ] JSON is properly formatted (single line, wrapped in quotes)
- [ ] Restarted the server (`pm2 restart friendly-backend`)
- [ ] Verified in logs: "✅ Firebase Admin SDK initialized successfully"
- [ ] Tested the endpoint and got success response

---

## 📚 Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Service Account Setup](https://firebase.google.com/docs/admin/setup#initialize-sdk)
- [Firebase Console](https://console.firebase.google.com/)

---

## 🆘 Still Having Issues?

1. **Check server logs:**
   ```bash
   pm2 logs friendly-backend --lines 50
   ```

2. **Verify .env file:**
   ```bash
   cat .env | grep FIREBASE_SERVICE_ACCOUNT_JSON
   ```
   (Don't share the output publicly - it contains sensitive data)

3. **Test Firebase connection:**
   ```bash
   node -e "require('dotenv').config(); const admin = require('firebase-admin'); const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); admin.initializeApp({credential: admin.credential.cert(creds)}); console.log('✅ Firebase initialized');"
   ```

