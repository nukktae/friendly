import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import { ENV } from '../../config/env';
import { ScheduleItem } from '../schedule/scheduleAIService';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Conditionally import GoogleSignin only for mobile platforms
let GoogleSignin: any = null;
// Avoid requiring native Google Sign-In to prevent TurboModule errors on web
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
const isExpoGo = Constants?.appOwnership === 'expo';
if (isNativePlatform && !isExpoGo) {
  try {
    const googleSigninModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSigninModule?.GoogleSignin || null;
  } catch (error) {
    console.log('GoogleSignin not available in this build');
    GoogleSignin = null;
  }
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface CalendarSyncSettings {
  enabled: boolean;
  syncDirection: 'import' | 'export' | 'both';
  calendarId: string;
  lastSyncTime?: Date;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  scope?: string;
}

export interface GoogleAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  scope?: string;
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private readonly SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
  private readonly TOKEN_STORAGE_KEY = 'google_calendar_tokens';
  private readonly GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
  private authInProgress = false;

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * Initialize Google Calendar service
   */
  async initialize(): Promise<boolean> {
    try {
      // Load stored tokens if available
      await this.loadStoredTokens();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
      return false;
    }
  }

  /**
   * Store authentication tokens securely
   */
  async storeTokens(tokens: StoredTokens): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  /**
   * Load stored authentication tokens
   */
  private async loadStoredTokens(): Promise<StoredTokens | null> {
    try {
      const storedTokens = await AsyncStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (storedTokens) {
        const tokens: StoredTokens = JSON.parse(storedTokens);
        return tokens;
      }
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
    return null;
  }

  /**
   * Clear stored authentication tokens
   */
  private async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if tokens are expired
   */
  private isTokenExpired(tokens: StoredTokens): boolean {
    if (!tokens.expiryDate) return false;
    return Date.now() >= tokens.expiryDate;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<StoredTokens | null> {
    try {
      const clientId = Platform.OS === 'web' ? ENV.GOOGLE_WEB_CLIENT_ID : ENV.GOOGLE_CLIENT_ID;
      
      const response = await fetch(this.GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const newTokens: StoredTokens = {
        accessToken: data.access_token,
        refreshToken: refreshToken, // Keep the same refresh token
        expiryDate: Date.now() + (data.expires_in * 1000),
        scope: data.scope,
      };

      await this.storeTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated with Google
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const storedTokens = await AsyncStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (!storedTokens) return false;

      const tokens: StoredTokens = JSON.parse(storedTokens);
      
      // Check if token is expired
      if (this.isTokenExpired(tokens)) {
        // Try to refresh if we have a refresh token
        if (tokens.refreshToken) {
          const newTokens = await this.refreshAccessToken(tokens.refreshToken);
          return newTokens !== null;
        }
        // No refresh token or refresh failed, need to re-authenticate
        await this.clearTokens();
        return false;
      }

      return !!tokens.accessToken;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  /**
   * Sign in to Google Calendar using direct redirect (web) or AuthSession (mobile)
   */
  async signIn(): Promise<boolean> {
    try {
      if (this.authInProgress) {
        console.log('OAuth sign-in already in progress; skipping new attempt');
        return false;
      }
      this.authInProgress = true;
      
      // Check platform for different handling
      if (Platform.OS === 'web') {
        // For web, use direct redirect to avoid popup issues
        console.log('Web platform detected, using direct redirect');
        return await this.signInWithDirectRedirect();
      }
      
      // Configure Google Sign-In (mobile only)
      if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
        GoogleSignin.configure({
          webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
          scopes: this.SCOPES,
        });
      }

      // Create auth request with proper redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'exp',
        path: 'auth',
      });

      const request = new AuthSession.AuthRequest({
        clientId: ENV.GOOGLE_CLIENT_ID,
        scopes: this.SCOPES,
        redirectUri: redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      console.log('OAuth redirect URI:', redirectUri);
      console.log('OAuth client ID:', ENV.GOOGLE_CLIENT_ID);
      console.log('Platform:', Platform.OS);

      // Start the auth session (mobile)
      const result = await request.promptAsync({
        authorizationEndpoint: this.GOOGLE_AUTH_ENDPOINT,
      });

      console.log('OAuth result:', result);

      if (result.type === 'success' && result.params.code) {
        console.log('OAuth success, exchanging code for tokens...');
        // Exchange authorization code for tokens
        const tokenResult = await this.exchangeCodeForTokens(result.params.code, redirectUri);
        
        if (tokenResult) {
          console.log('Token exchange successful, storing tokens');
          await this.storeTokens(tokenResult);
          return true;
        } else {
          console.log('Token exchange failed');
        }
      } else if (result.type === 'error') {
        console.error('OAuth error:', result.error);
        // Handle specific OAuth errors
        if (result.error?.code === 'popup_closed_by_user') {
          console.log('User closed the authentication popup');
        }
      } else if (result.type === 'cancel') {
        console.log('OAuth cancelled by user');
      } else {
        console.log('OAuth result type:', result.type);
      }

      return false;
    } catch (error) {
      console.error('Google Calendar sign-in failed:', error);
      
      // Handle COOP-specific errors
      if (error instanceof Error && error.message?.includes('Cross-Origin-Opener-Policy')) {
        console.log('COOP error detected, trying alternative authentication method...');
        return await this.signInWithAlternativeMethod();
      }
      
      return false;
    } finally {
      this.authInProgress = false;
    }
  }

  /**
   * Sign in using direct redirect for web platform with PKCE
   */
  private async signInWithDirectRedirect(): Promise<boolean> {
    try {
      const redirectUri = window.location.origin + '/auth';
      const clientId = ENV.GOOGLE_WEB_CLIENT_ID;
      
      console.log('OAuth redirect URI:', redirectUri);
      console.log('OAuth client ID:', clientId);
      
      // Generate PKCE code verifier and challenge
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      // Store code verifier for later use
      sessionStorage.setItem('google_calendar_code_verifier', codeVerifier);
      
      // Build the Google OAuth URL with PKCE
      const authUrl = new URL(this.GOOGLE_AUTH_ENDPOINT);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', this.SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', 'google_calendar_auth');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      
      console.log('Redirecting to Google OAuth with PKCE:', authUrl.toString());
      
      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
      
      // Return true to indicate the redirect was initiated
      // The actual result will be handled by the auth callback
      return true;
    } catch (error) {
      console.error('Direct redirect sign-in failed:', error);
      return false;
    }
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Alternative sign-in method to handle COOP issues
   */
  private async signInWithAlternativeMethod(): Promise<boolean> {
    try {
      // Check if we're on web platform
      if (Platform.OS === 'web') {
        console.log('Web platform detected, skipping GoogleSignin fallback');
        return false;
      }
      
      // Check if GoogleSignin is available
      if (!GoogleSignin || typeof GoogleSignin.signIn !== 'function') {
        console.log('GoogleSignin not available, skipping alternative sign-in method');
        return false;
      }
      
      // Use a different approach with GoogleSignin directly (mobile only)
      const result = await GoogleSignin.signIn();
      
      if (result.type === 'success') {
        // Get the access token from GoogleSignin
        const tokens = await GoogleSignin.getTokens();
        
        if (tokens.accessToken) {
          const storedTokens: StoredTokens = {
            accessToken: tokens.accessToken,
            refreshToken: undefined, // GoogleSignin doesn't provide refresh token in getTokens()
            expiryDate: Date.now() + (3600 * 1000), // 1 hour default
            scope: this.SCOPES.join(' '),
          };
          
          await this.storeTokens(storedTokens);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Alternative sign-in method failed:', error);
      return false;
    }
  }

  /**
   * Enhanced sign-in method with better error handling
   */
  async signInWithFallback(): Promise<boolean> {
    try {
      // Check platform for different handling
      if (Platform.OS === 'web') {
        // For web, use direct redirect method
        console.log('Web platform detected, using direct redirect method');
        return await this.signInWithDirectRedirect();
      }
      
      // For mobile, try the standard AuthSession method first
      const authSessionResult = await this.signIn();
      if (authSessionResult) {
        return true;
      }

      // If that fails, try the alternative method
      console.log('AuthSession failed, trying GoogleSignin directly...');
      return await this.signInWithAlternativeMethod();
    } catch (error) {
      console.error('All sign-in methods failed:', error);
      return false;
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<StoredTokens | null> {
    try {
      const clientId = Platform.OS === 'web' ? ENV.GOOGLE_WEB_CLIENT_ID : ENV.GOOGLE_CLIENT_ID;
      
      console.log('Exchanging code for tokens:', {
        code: code.substring(0, 20) + '...',
        redirectUri,
        clientId: clientId.substring(0, 20) + '...',
      });
      
      const response = await fetch(this.GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', response.status, errorText);
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiryDate: Date.now() + (data.expires_in * 1000),
        scope: data.scope,
      };
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      return null;
    }
  }

  /**
   * Sign out from Google Calendar
   */
  async signOut(): Promise<void> {
    try {
      // Clear stored tokens
      await this.clearTokens();
      
      // Sign out from Google Sign-In (mobile only)
      if (Platform.OS !== 'web' && GoogleSignin && typeof GoogleSignin.signOut === 'function') {
        try {
          await GoogleSignin.signOut();
        } catch (error) {
          // Google Sign-In sign out might fail if user wasn't signed in through it
          console.log('Google Sign-In sign out failed (user might not be signed in):', error);
        }
      }
    } catch (error) {
      console.error('Google Calendar sign-out failed:', error);
    }
  }

  /**
   * Fetch events from Google Calendar using direct HTTP calls
   */
  async fetchEvents(
    startDate: Date,
    endDate: Date,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent[]> {
    // Check if user is authenticated
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      throw new Error('Not authenticated with Google Calendar. Please sign in first.');
    }

    try {
      const tokens = await this.getValidTokens();
      if (!tokens) {
        throw new Error('No valid tokens available');
      }

      const url = `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
      const params = new URLSearchParams({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      });

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          console.log('Token expired, attempting refresh...');
          const storedTokens = await AsyncStorage.getItem(this.TOKEN_STORAGE_KEY);
          if (storedTokens) {
            const parsedTokens: StoredTokens = JSON.parse(storedTokens);
            if (parsedTokens.refreshToken) {
              const newTokens = await this.refreshAccessToken(parsedTokens.refreshToken);
              if (newTokens) {
                // Retry the request with new tokens
                return this.fetchEvents(startDate, endDate, calendarId);
              }
            }
          }
          throw new Error('Authentication failed. Please sign in again.');
        }
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      throw error;
    }
  }

  /**
   * Get valid tokens, refreshing if necessary
   */
  private async getValidTokens(): Promise<StoredTokens | null> {
    try {
      const storedTokens = await AsyncStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (!storedTokens) return null;

      const tokens: StoredTokens = JSON.parse(storedTokens);
      
      // Check if token is expired
      if (this.isTokenExpired(tokens)) {
        // Try to refresh if we have a refresh token
        if (tokens.refreshToken) {
          const newTokens = await this.refreshAccessToken(tokens.refreshToken);
          return newTokens;
        }
        // No refresh token or refresh failed
        return null;
      }

      return tokens;
    } catch (error) {
      console.error('Error getting valid tokens:', error);
      return null;
    }
  }

  /**
   * Convert Google Calendar events to app schedule format
   */
  convertEventsToSchedule(events: GoogleCalendarEvent[]): ScheduleItem[] {
    return events.map((event) => {
      const startDate = new Date(event.start.dateTime || event.start.date || '');
      const endDate = new Date(event.end.dateTime || event.end.date || '');
      
      // Determine the day of the week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = dayNames[startDate.getDay()];
      
      // Format time
      let timeString = '';
      if (event.start.dateTime && event.end.dateTime) {
        const startTimeStr = startDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        const endTimeStr = endDate ? new Date(endDate).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }) : 'TBD';
        timeString = `${startTimeStr} - ${endTimeStr}`;
      } else {
        timeString = 'All Day';
      }

      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        time: timeString,
        day: day,
        location: event.location || '',
        instructor: '',
        type: 'meeting' as const,
        confidence: 1.0, // Google Calendar events are 100% accurate
        startTime: event.start.dateTime || event.start.date || '',
        endTime: event.end.dateTime || event.end.date || '',
      };
    });
  }

  /**
   * Create a new event in Google Calendar using direct HTTP calls
   */
  async createEvent(event: ScheduleItem, calendarId: string = 'primary'): Promise<GoogleCalendarEvent> {
    const tokens = await this.getValidTokens();
    if (!tokens) {
      throw new Error('Not authenticated with Google Calendar. Please sign in first.');
    }

    try {
      const googleEvent = {
        summary: event.title,
        location: event.location,
        start: {
          dateTime: event.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'UTC',
        },
      };

      const url = `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event in Google Calendar using direct HTTP calls
   */
  async updateEvent(eventId: string, event: ScheduleItem, calendarId: string = 'primary'): Promise<GoogleCalendarEvent> {
    const tokens = await this.getValidTokens();
    if (!tokens) {
      throw new Error('Not authenticated with Google Calendar. Please sign in first.');
    }

    try {
      const googleEvent = {
        summary: event.title,
        location: event.location,
        start: {
          dateTime: event.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'UTC',
        },
      };

      const url = `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete an event from Google Calendar using direct HTTP calls
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    const tokens = await this.getValidTokens();
    if (!tokens) {
      throw new Error('Not authenticated with Google Calendar. Please sign in first.');
    }

    try {
      const url = `${this.CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Get list of available calendars using direct HTTP calls
   */
  async getCalendars(): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
    const tokens = await this.getValidTokens();
    if (!tokens) {
      throw new Error('Not authenticated with Google Calendar. Please sign in first.');
    }

    try {
      const url = `${this.CALENDAR_API_BASE}/users/me/calendarList`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch calendars: ${response.statusText}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw error;
    }
  }

  /**
   * Set up two-way sync between app and Google Calendar
   */
  async setupSync(settings: CalendarSyncSettings): Promise<void> {
    // Implementation for setting up sync
    console.log('Setting up Google Calendar sync:', settings);
  }

  /**
   * Sync events from Google Calendar to app
   */
  async syncFromGoogleCalendar(startDate: Date, endDate: Date): Promise<ScheduleItem[]> {
    const events = await this.fetchEvents(startDate, endDate);
    return this.convertEventsToSchedule(events);
  }

  /**
   * Sync events from app to Google Calendar
   */
  async syncToGoogleCalendar(scheduleItems: ScheduleItem[]): Promise<void> {
    for (const item of scheduleItems) {
      try {
        await this.createEvent(item);
      } catch (error) {
        console.error('Failed to sync item to Google Calendar:', item.title, error);
      }
    }
  }
}

export default GoogleCalendarService.getInstance();