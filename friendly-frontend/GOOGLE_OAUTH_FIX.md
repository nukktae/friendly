# Google OAuth 400 Error Fix Guide

## Problem
You're getting "Error 400: invalid_request" when trying to sign in to Google Calendar. This is caused by OAuth configuration mismatches.

## Root Causes
1. **Redirect URI Mismatch**: The redirect URI in your Google Cloud Console doesn't match what the app is sending
2. **Client ID Type**: Using a web client ID instead of an Android/iOS client ID
3. **Missing Authorized Redirect URIs**: Google Cloud Console doesn't have the correct redirect URIs configured

## Solution Steps

### Step 1: Check Current Redirect URI
The app now generates a redirect URI like: `exp://192.168.1.100:8081/--/auth`
- Check the console logs to see the exact redirect URI being used
- Copy this URI for Step 3

### Step 2: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to "APIs & Services" > "Credentials"

### Step 3: Update OAuth 2.0 Client ID
1. Find your OAuth 2.0 Client ID (the one starting with `138346490852-...`)
2. Click "Edit" (pencil icon)
3. In "Authorized redirect URIs", add:
   - `exp://10.222.125.243:8081/--/auth` (replace with actual IP from logs)
   - `exp://localhost:8081/--/auth`
   - `http://localhost:8081` (for web testing)

### Step 4: Alternative - Create New OAuth Client
If the above doesn't work, create a new OAuth client:

1. Click "Create Credentials" > "OAuth 2.0 Client IDs"
2. Choose "Web application"
3. Add these redirect URIs:
   - `exp://192.168.1.100:8081/--/auth`
   - `exp://localhost:8081/--/auth`
   - `http://localhost:8081`
4. Copy the new Client ID
5. Update `src/config/env.ts` with the new Client ID

### Step 5: Update Environment Configuration
If you created a new client, update the environment:

```typescript
// In src/config/env.ts
export const ENV = {
  GOOGLE_CLIENT_ID: 'YOUR_NEW_CLIENT_ID_HERE',
  // ... rest of config
};
```

### Step 6: Test the Fix
1. Restart your Expo development server
2. Try the Google Calendar sign-in again
3. Check console logs for the redirect URI being used
4. Ensure it matches what you configured in Google Cloud Console

## Debugging Tips

### Check Console Logs
The app now logs:
- `OAuth redirect URI: exp://...`
- `OAuth client ID: 593936036661-...`

### Common Redirect URI Formats
- **Expo Development**: `exp://192.168.1.100:8081/--/auth`
- **Expo Web**: `http://localhost:8081`
- **Production**: `yourapp://auth`

### Verify OAuth Consent Screen
1. Go to "OAuth consent screen" in Google Cloud Console
2. Ensure it's configured with:
   - App name
   - User support email
   - Developer contact information
   - Scopes: `https://www.googleapis.com/auth/calendar.readonly`

## Expected Behavior After Fix
1. Click "Import from Google Calendar"
2. Browser opens with Google sign-in page
3. After successful sign-in, redirects back to app
4. Console shows "Google Calendar sign-in successful"
5. Calendar events are fetched and displayed

## If Still Not Working
1. Check Google Cloud Console for any error details
2. Verify the Google Calendar API is enabled
3. Ensure the OAuth consent screen is properly configured
4. Try creating a completely new OAuth client with fresh credentials
