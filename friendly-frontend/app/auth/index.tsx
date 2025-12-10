import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ENV } from '@/src/config/env';
import GoogleCalendarService from '@/src/services/calendar/googleCalendarService';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const calendarService = GoogleCalendarService;

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback received with params:', params);
        console.log('Auth callback URL:', window.location.href);
        
        // Check if we have the authorization code
        if (params.code && typeof params.code === 'string') {
          console.log('Processing authorization code:', params.code.substring(0, 20) + '...');
          
          try {
            // Use PKCE flow for web OAuth (no client secret needed)
            console.log('Processing authorization code with PKCE...');
            
            const redirectUri = window.location.origin + '/auth';
            const codeVerifier = sessionStorage.getItem('google_calendar_code_verifier');
            
            if (!codeVerifier) {
              console.error('Code verifier not found in session storage');
              router.replace('/auth/login' as any);
              return;
            }
            
            console.log('Using client ID:', ENV.GOOGLE_WEB_CLIENT_ID);
            console.log('Using redirect URI:', redirectUri);
            
            // Exchange code for tokens using PKCE. If a web client secret is provided (dev), include it.
            const form = new URLSearchParams({
              client_id: ENV.GOOGLE_WEB_CLIENT_ID,
              code: params.code,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
              code_verifier: codeVerifier,
            });
            if (ENV.GOOGLE_WEB_CLIENT_SECRET) {
              form.set('client_secret', ENV.GOOGLE_WEB_CLIENT_SECRET as unknown as string);
            }

            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: form,
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Token exchange failed:', response.status, errorText);
              throw new Error(`Token exchange failed: ${response.statusText}`);
            }

            const tokenData = await response.json();
            console.log('Token exchange successful');
            
            // Store tokens manually
            const tokens = {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiryDate: Date.now() + (tokenData.expires_in * 1000),
              scope: tokenData.scope,
            };
            
            // Store tokens in AsyncStorage
            await calendarService.storeTokens(tokens);
            
            // Clean up session storage
            sessionStorage.removeItem('google_calendar_code_verifier');
            
            console.log('Authentication successful! Starting calendar sync...');
            console.log('Note: Calendar sync uses the Google account you just signed in with, which can be different from your app login account.');
            
            // Import events from the next 30 days
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 30);
            
            // Sync directly from Google Calendar
            const syncedItems = await calendarService.syncFromGoogleCalendar(startDate, endDate);
            console.log('Synced items:', syncedItems.length);
            
            if (syncedItems.length === 0) {
              console.log('No events found in Google Calendar for the selected account');
            } else {
              console.log('Successfully synced', syncedItems.length, 'events from Google Calendar');
            }
            
            // Navigate back to the classes screen
            router.replace('/(tabs)/explore');
            
          } catch (tokenError) {
            console.error('Error processing authorization code:', tokenError);
            router.replace('/login');
          }
        } else {
          console.log('No authorization code found, redirecting to login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        router.replace('/login');
      }
    };

    handleAuthCallback();
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Completing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
});
