import { auth, googleProvider } from "@/src/config/firebase";
import { User } from '@/src/types';
import { ENV } from '@/src/config/env';
import {
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  getIdToken,
} from "firebase/auth";
import { getPlatform, isWeb } from '@/src/lib/platform';

const API_BASE = ENV.API_BASE || 'http://localhost:4000';

// Platform-specific imports should be handled by the UI layer
// Services accept platform information as parameters when needed
let GoogleSignin: any = null;
let signInWithPopup: any = null;

// These will be initialized by the UI layer if needed
export function setGoogleSignInModule(module: any): void {
  GoogleSignin = module;
}

export function setSignInWithPopup(fn: any): void {
  signInWithPopup = fn;
}

export class AuthService {
  static isGoogleSignInAvailable(platform: 'web' | 'ios' | 'android' = 'web'): boolean {
    return platform === 'web' || (GoogleSignin && typeof GoogleSignin.signIn === 'function');
  }

  static configureGoogleSignIn(config?: {
    webClientId?: string;
    iosClientId?: string;
    offlineAccess?: boolean;
    hostedDomain?: string;
    forceCodeForRefreshToken?: boolean;
  }): void {
    if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
      try {
        GoogleSignin.configure({
          webClientId: config?.webClientId || 'YOUR_WEB_CLIENT_ID',
          iosClientId: config?.iosClientId || 'YOUR_IOS_CLIENT_ID',
          offlineAccess: config?.offlineAccess ?? true,
          hostedDomain: config?.hostedDomain || '',
          forceCodeForRefreshToken: config?.forceCodeForRefreshToken ?? true,
        });
      } catch (error) {
        console.log('Failed to configure GoogleSignin:', error);
      }
    }
  }

  /**
   * Login with email/password using backend API
   * First signs in with Firebase, then verifies with backend
   */
  static async login(email: string, password: string): Promise<void> {
    try {
      // First, sign in with Firebase Auth to get the user and ID token
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get ID token for backend verification
      const idToken = await getIdToken(userCredential.user);
      
      // Call backend login endpoint with ID token
      let response: Response;
      try {
        response = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken, // Use idToken for backend verification
          }),
        });
      } catch (fetchError: any) {
        // Network error - backend might not be running
        console.warn('Backend login request failed (network error). Backend may be unavailable:', fetchError);
        // Continue with Firebase auth only - backend verification failed but Firebase auth succeeded
        // This allows the app to work even if backend is temporarily unavailable
        console.log('Continuing with Firebase authentication only. Backend features may be limited.');
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Backend login failed' }));
        const errorMessage = error.error || 'Backend login failed';
        
        // Only sign out if it's an authentication error (401), not server errors (500, etc.)
        if (response.status === 401) {
          console.warn('Backend authentication failed (401). Signing out from Firebase.');
          await signOut(auth);
          throw new Error(errorMessage || 'Invalid credentials');
        } else {
          // For other errors (500, 503, etc.), continue with Firebase auth
          console.warn(`Backend login failed with status ${response.status}. Continuing with Firebase auth:`, errorMessage);
          return;
        }
      }

      // Auth state will be updated by onAuthStateChanged listener
    } catch (error: any) {
      console.error("Error signing in:", error);
      
      // Provide more specific error messages
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials or sign up first.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please sign up first.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        // Network error - backend unavailable but Firebase auth succeeded
        console.warn('Backend unavailable, but Firebase authentication succeeded. Continuing with local auth.');
        // Don't throw - allow Firebase auth to proceed
        return;
      } else {
        throw new Error(error.message || 'Login failed. Please try again.');
      }
    }
  }

  /**
   * Signup with email/password using backend API
   * Backend creates the Firebase user and returns a custom token
   */
  static async signup(email: string, password: string, name?: string): Promise<void> {
    try {
      // Call backend signup endpoint - it creates the Firebase user
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: name || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Signup failed');
      }

      const data = await response.json();
      
      // Backend creates the user and returns a custom token
      // We need to sign in with Firebase using email/password to get the user
      // The backend has already created the user, so this will just authenticate
      try {
        await signInWithEmailAndPassword(auth, email, password);
      // Auth state will be updated by onAuthStateChanged listener
      } catch (firebaseError: any) {
        // If user already exists (which it should from backend), try to sign in
        if (firebaseError.code === 'auth/email-already-in-use') {
          // User was created by backend, just sign in
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw firebaseError;
        }
      }
    } catch (error: any) {
      console.error("Error signing up:", error);
      
      // Provide more specific error messages
      if (error.message?.includes('already exists') || error.message?.includes('email-already-in-use')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters long.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else {
        throw new Error(error.message || 'Sign up failed. Please try again.');
      }
    }
  }

  static async signInWithGoogle(platform: 'web' | 'ios' | 'android' = 'web'): Promise<void> {
    try {
      let idToken: string | null = null;
      let userId: string | null = null;
      
      if (platform === 'web' && signInWithPopup) {
        // Web implementation using Firebase popup
        const result = await signInWithPopup(auth, googleProvider);
        idToken = await getIdToken(result.user);
        userId = result.user.uid;
      } else if (platform !== 'web' && GoogleSignin && typeof GoogleSignin.signIn === 'function') {
        // Mobile implementation using Google Sign-In
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const googleCredential = GoogleAuthProvider.credential(userInfo.data?.idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        idToken = await getIdToken(userCredential.user);
        userId = userCredential.user.uid;
      } else {
        throw new Error('Google sign-in is not supported on this platform. Please use email/password authentication.');
      }

      // Call backend Google Sign-In endpoint to create/update profile
      if (idToken) {
        try {
          const response = await fetch(`${API_BASE}/api/auth/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.log('Backend Google sign-in failed, continuing with Firebase auth:', error);
            // Continue even if backend call fails - Firebase auth is already successful
          } else {
            // Backend successfully created/updated profile
            // Wait a bit to ensure profile is fully created before auth state change triggers profile loading
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.log('Backend Google sign-in error, continuing with Firebase auth:', error);
          // Continue even if backend call fails - Firebase auth is already successful
        }
      }

      // Auth state will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }

  /**
   * Logout - calls backend API and Firebase Auth
   */
  static async logout(): Promise<void> {
    try {
      // Get ID token before signing out
      let idToken: string | undefined;
      if (auth.currentUser) {
        try {
          idToken = await getIdToken(auth.currentUser);
        } catch (error) {
          console.log('Could not get ID token:', error);
        }
      }

      // Call backend signout endpoint
      try {
        const response = await fetch(`${API_BASE}/api/auth/signout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: idToken || undefined,
          }),
        });

        if (!response.ok) {
          console.log('Backend signout failed, continuing with Firebase signout');
        }
      } catch (error) {
        console.log('Backend signout error, continuing with Firebase signout:', error);
      }

      // Sign out from Firebase Auth
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }

  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || undefined,
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
}
