# Google Calendar Integration Setup Guide

## Overview
This guide will help you set up Google Calendar integration for your mobile app. The integration allows users to sync their Google Calendar events directly into the app's schedule.

## Prerequisites
- Google Cloud Console account
- Firebase project (already configured)
- Mobile app with Google Calendar integration

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in app information
   - Add scopes: `https://www.googleapis.com/auth/calendar.readonly`
4. Create OAuth client:
   - Application type: "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8080` (for development)
     - Your production domain
5. Download the credentials JSON file

## Step 3: Configure the App

1. Update `src/services/calendar/googleCalendarService.ts`:
   ```typescript
   this.oauth2Client = new google.auth.OAuth2(
     'YOUR_CLIENT_ID', // From OAuth credentials
     'YOUR_CLIENT_SECRET', // From OAuth credentials
     'YOUR_REDIRECT_URI' // Your redirect URI
   );
   ```

2. Replace the placeholder values with your actual OAuth credentials

## Step 4: Handle OAuth Flow

The current implementation requires manual OAuth handling. For production, you'll need to:

1. Implement proper OAuth callback handling
2. Store access tokens securely
3. Handle token refresh
4. Implement proper error handling

## Step 5: Test the Integration

1. Run the app
2. Click "Import from Google Calendar"
3. Complete the OAuth flow
4. Verify events are synced correctly

## Current Status

✅ **Implemented:**
- Google Calendar API integration
- OAuth 2.0 authentication setup
- Event fetching and conversion
- Direct sync (no review modal)
- Error handling

⚠️ **Requires Setup:**
- OAuth credentials configuration
- Production OAuth flow implementation
- Token storage and refresh

## Next Steps

1. Configure OAuth credentials
2. Test with real Google Calendar data
3. Implement production OAuth flow
4. Add two-way sync capabilities
5. Implement automatic sync scheduling

## Troubleshooting

**Common Issues:**
- "Not authenticated" error: OAuth credentials not configured
- "Permission denied": OAuth scopes not properly set
- "Network error": Check internet connection and API quotas

**Debug Steps:**
1. Check console logs for detailed error messages
2. Verify OAuth credentials are correct
3. Ensure Google Calendar API is enabled
4. Check OAuth consent screen configuration
