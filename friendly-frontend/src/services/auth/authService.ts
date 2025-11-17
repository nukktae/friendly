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
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_BASE = ENV.API_BASE || 'http://localhost:4000';

// Conditionally import GoogleSignin only for mobile platforms
let GoogleSignin: any = null;
// Avoid requiring native Google Sign-In in Expo Go to prevent TurboModule errors
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

// Import signInWithPopup only for web
let signInWithPopup: any = null;
if (Platform.OS === 'web') {
    try {
        const { signInWithPopup: webSignInWithPopup } = require('firebase/auth');
        signInWithPopup = webSignInWithPopup;
    } catch {
        console.log('signInWithPopup not available');
    }
}

export class AuthService {
  static isGoogleSignInAvailable(): boolean {
    return Platform.OS === 'web' || (isNativePlatform && GoogleSignin && typeof GoogleSignin.signIn === 'function');
  }

  static configureGoogleSignIn(): void {
    if (isNativePlatform && GoogleSignin && typeof GoogleSignin.configure === 'function') {
      try {
        GoogleSignin.configure({
          webClientId: 'YOUR_WEB_CLIENT_ID', // This will be replaced with actual client ID
          iosClientId: 'YOUR_IOS_CLIENT_ID', // This will be replaced with actual client ID
          offlineAccess: true,
          hostedDomain: '',
          forceCodeForRefreshToken: true,
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
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken, // Use idToken for backend verification
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Sign out from Firebase if backend login fails
        await signOut(auth);
        throw new Error(error.error || 'Login failed');
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

  static async signInWithGoogle(): Promise<void> {
    try {
      let idToken: string | null = null;
      let userId: string | null = null;
      
      if (Platform.OS === 'web' && signInWithPopup) {
        // Web implementation using Firebase popup
        const result = await signInWithPopup(auth, googleProvider);
        idToken = await getIdToken(result.user);
        userId = result.user.uid;
      } else if ((Platform.OS === 'ios' || Platform.OS === 'android') && GoogleSignin && typeof GoogleSignin.signIn === 'function') {
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
