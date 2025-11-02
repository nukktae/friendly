# Google Sign-In Setup Guide

## Prerequisites
- Google Cloud Console account
- Firebase project with Authentication enabled
- Expo development build (not Expo Go) - **Important**: Google Sign-In requires native code and won't work in Expo Go

## Step 1: Configure Google Cloud Console

### 1.1 Enable Google Sign-In API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to "APIs & Services" > "Library"
4. Search for "Google Sign-In API" and enable it

### 1.2 Create OAuth 2.0 Client IDs

#### For Web (already configured):
- Go to "APIs & Services" > "Credentials"
- Create OAuth 2.0 Client ID for "Web application"
- Add authorized redirect URIs:
  - `http://localhost:19006` (for development)
  - Your production domain

#### For Android:
1. Create OAuth 2.0 Client ID for "Android"
2. Package name: `com.yourcompany.mobileprogram` (update this in app.json)
3. SHA-1 certificate fingerprint:
   - For development: Run `expo credentials:manager` to get your SHA-1
   - For production: Use your production keystore SHA-1

#### For iOS:
1. Create OAuth 2.0 Client ID for "iOS"
2. Bundle ID: `com.yourcompany.mobileprogram` (update this in app.json)

### 1.3 Update Firebase Configuration
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Google sign-in
3. Add the client IDs you created above

## Step 2: Update App Configuration

### 2.1 Update app.json
```json
{
  "expo": {
    "name": "mobileprogram",
    "slug": "mobileprogram",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.mobileprogram"
    },
    "android": {
      "package": "com.yourcompany.mobileprogram",
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      }
    }
  }
}
```

### 2.2 Update AuthService Configuration
Replace the placeholder client IDs in `src/services/auth/authService.ts`:

```typescript
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess: true,
  hostedDomain: '',
  forceCodeForRefreshToken: true,
});
```

## Step 3: Build Development Build

Since Google Sign-In requires native code, you need to create a development build:

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Create development build
eas build --profile development --platform ios
eas build --profile development --platform android
```

## Step 4: Test Google Sign-In

1. Install the development build on your device
2. Test Google sign-in functionality
3. Verify authentication works on both platforms

## Troubleshooting

### Common Issues:
1. **"RNGoogleSignin could not be found" error**
   - This happens when running in Expo Go. Google Sign-In requires native code.
   - **Solution**: Create a development build using EAS Build (see Step 3)

2. **"Google sign-in is not supported on this platform"**
   - Make sure you're using a development build, not Expo Go
   - Verify client IDs are correctly configured

3. **"Invalid client" error**
   - Check that client IDs match between Google Cloud Console and your app
   - Verify package name/bundle ID matches

4. **SHA-1 fingerprint issues**
   - Run `expo credentials:manager` to get the correct SHA-1
   - Update Google Cloud Console with the correct fingerprint

### Getting SHA-1 Fingerprint:
```bash
# For development
expo credentials:manager

# For production (if using custom keystore)
keytool -list -v -keystore your-keystore.jks -alias your-key-alias
```

## Next Steps
1. Complete Google Cloud Console setup
2. Update client IDs in AuthService
3. Create development builds
4. Test on real devices
