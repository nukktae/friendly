import { auth, googleProvider } from "@/src/config/firebase";
import { User } from '@/src/types';
import {
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

  static async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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

  static async signup(email: string, password: string, name?: string): Promise<void> {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Auth state will be updated by onAuthStateChanged listener
    } catch (error: any) {
      console.error("Error signing up:", error);
      
      // Provide more specific error messages
      if (error.code === 'auth/email-already-in-use') {
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
      if (Platform.OS === 'web' && signInWithPopup) {
        // Web implementation using Firebase popup
        await signInWithPopup(auth, googleProvider);
        // Auth state will be updated by onAuthStateChanged listener
      } else if ((Platform.OS === 'ios' || Platform.OS === 'android') && GoogleSignin && typeof GoogleSignin.signIn === 'function') {
        // Mobile implementation using Google Sign-In
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const googleCredential = GoogleAuthProvider.credential(userInfo.data?.idToken);
        await signInWithCredential(auth, googleCredential);
        // Auth state will be updated by onAuthStateChanged listener
      } else {
        throw new Error('Google sign-in is not supported on this platform. Please use email/password authentication.');
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
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
