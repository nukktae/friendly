# Cross-Origin-Opener-Policy (COOP) Error Fix

## Problem Description
You were encountering this error:
```
cb=gapi.loaded_0?le=scs:195 Cross-Origin-Opener-Policy policy would block the window.close call.
```

This error occurs when Google OAuth tries to close a popup window that was opened with different origin policies, preventing the authentication flow from completing properly.

## Root Cause
The COOP error happens because:
1. **Browser Security Policy**: Modern browsers enforce Cross-Origin-Opener-Policy to prevent malicious websites from manipulating windows from different origins
2. **OAuth Popup Handling**: The Google OAuth flow opens a popup window, but the security policy blocks the `window.close()` call when the authentication completes
3. **Expo AuthSession Limitations**: The standard `expo-auth-session` doesn't handle COOP issues gracefully

## Solution Implemented

### 1. Enhanced OAuth Configuration
Updated the `signIn()` method in `GoogleCalendarService` with:
- `useProxy: true` - Uses Expo's proxy to avoid COOP issues
- `showInRecents: false` - Prevents popup window issues
- Better error handling for OAuth-specific errors

### 2. Fallback Authentication Method
Added `signInWithAlternativeMethod()` that:
- Uses `@react-native-google-signin/google-signin` directly as a fallback
- Handles cases where AuthSession fails due to COOP
- Provides seamless token management

### 3. Robust Error Handling
Created `signInWithFallback()` method that:
- Tries the standard AuthSession method first
- Automatically falls back to GoogleSignin if COOP error occurs
- Provides comprehensive error logging

### 4. Updated App Configuration
Modified `app.json` to include:
- `bundler: "metro"` for better web compatibility
- Proper web configuration for OAuth flows

## Code Changes Made

### GoogleCalendarService.ts
```typescript
// Enhanced signIn method with COOP handling
async signIn(): Promise<boolean> {
  // ... existing code ...
  const result = await request.promptAsync({
    authorizationEndpoint: this.GOOGLE_AUTH_ENDPOINT,
    useProxy: true, // Use Expo's proxy to avoid COOP issues
    showInRecents: false, // Prevent popup window issues
  });
  // ... error handling for COOP ...
}

// New fallback method
async signInWithFallback(): Promise<boolean> {
  // Tries AuthSession first, then GoogleSignin as fallback
}
```

### ScheduleScreen.tsx
```typescript
// Updated to use fallback method
const signedIn = await calendarService.signInWithFallback();
```

## Testing the Fix

### 1. Clear Browser Cache
Before testing, clear your browser cache and cookies to ensure no stale OAuth state.

### 2. Test Authentication Flow
1. Open your app
2. Navigate to the schedule screen
3. Click "Import from Google Calendar"
4. The authentication should now work without COOP errors

### 3. Expected Behavior
- **Success Case**: OAuth popup opens → User signs in → Popup closes → App receives tokens
- **COOP Error Case**: AuthSession fails → Automatically tries GoogleSignin → Success

## Additional Troubleshooting

### If COOP Error Still Occurs
1. **Check Browser Console**: Look for any remaining COOP-related errors
2. **Try Different Browser**: Test in Chrome, Firefox, and Safari
3. **Disable Browser Extensions**: Some extensions can interfere with OAuth flows
4. **Check Network**: Ensure no corporate firewalls are blocking OAuth requests

### Google Cloud Console Configuration
Ensure your OAuth client has these redirect URIs:
- `exp://localhost:8081/--/auth`
- `exp://[YOUR_IP]:8081/--/auth`
- `http://localhost:8081`

### Environment Variables
Verify your environment configuration in `src/config/env.ts`:
```typescript
export const ENV = {
  GOOGLE_CLIENT_ID: 'your-client-id',
  GOOGLE_WEB_CLIENT_ID: 'your-web-client-id',
  // ... other config
};
```

## Prevention Tips

### 1. Use HTTPS in Production
Always use HTTPS for OAuth flows in production to avoid security issues.

### 2. Regular Token Refresh
The service now handles token refresh automatically, but monitor token expiry.

### 3. Error Monitoring
Add error monitoring to track OAuth failures and COOP issues in production.

## Alternative Solutions (If Needed)

### 1. Server-Side OAuth
For production apps, consider implementing server-side OAuth flow to avoid browser security restrictions.

### 2. Native OAuth
Use platform-specific OAuth implementations (iOS/Android) instead of web-based flows.

### 3. Custom OAuth Provider
Implement a custom OAuth provider that handles COOP issues more gracefully.

## Support
If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Verify your Google Cloud Console OAuth configuration
3. Test with different browsers and devices
4. Consider implementing server-side OAuth for production use

The implemented solution should resolve the COOP error while maintaining a smooth user experience.
