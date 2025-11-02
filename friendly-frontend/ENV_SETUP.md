# Environment Variables Setup Guide (Expo Constants)

## ✅ Environment Variables Configured!

### **Files Created:**
- ✅ `src/config/env.ts` - Environment variables configuration using Expo Constants
- ✅ Updated `app.json` - Added environment variables to `extra` section
- ✅ Updated `babel.config.js` - Removed react-native-dotenv plugin
- ✅ Updated `.gitignore` - Added `.env` to prevent committing secrets
- ✅ Updated Google Calendar service - Now uses Expo Constants

### **How It Works:**
- Environment variables are stored in `app.json` under the `extra` section
- `src/config/env.ts` reads these variables using `expo-constants`
- This approach is more reliable with Expo and React Native

### **How to Use:**

1. **Edit `app.json`** to update your credentials:
   ```json
   "extra": {
     "GOOGLE_CLIENT_ID": "your_actual_client_id_here",
     "GOOGLE_REDIRECT_URI": "http://localhost:8081"
   }
   ```

2. **Restart your development server**:
   ```bash
   npm start
   # or
   expo start
   ```

3. **The Google Calendar service** will now automatically use your environment variables!

### **iOS OAuth Benefits:**
- ✅ **No client secret required** - iOS apps use PKCE (Proof Key for Code Exchange)
- ✅ **More secure** - No secret to store or leak
- ✅ **Simpler setup** - Only need Client ID and Redirect URI
- ✅ **Google recommended** - Best practice for mobile applications

### **Security Benefits:**
- ✅ **No hardcoded secrets** in your code
- ✅ **Environment-specific** configuration
- ✅ **Git-safe** - .env file is ignored
- ✅ **Easy deployment** - different values for dev/staging/prod

### **Next Steps:**
1. Add your actual Google OAuth credentials to `.env`
2. Restart your development server
3. Test the Google Calendar integration!

### **For Production:**
- Set environment variables in your hosting platform
- Use different values for production
- Never commit `.env` files to version control
