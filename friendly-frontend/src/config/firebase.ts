import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWmjPrqBmd2sJXWBuYlC3GieTYzwiAWGI",
  authDomain: "friendly-34f75.firebaseapp.com",
  projectId: "friendly-34f75",
  storageBucket: "friendly-34f75.firebasestorage.app",
  messagingSenderId: "411686453883",
  appId: "1:411686453883:web:1dfc5b794b28300f2e18de",
  measurementId: "G-6EKT489GME"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with persistence on native, default on web
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      // Loaded dynamically to avoid type issues across Firebase versions
      persistence: (require('firebase/auth') as any).getReactNativePersistence(AsyncStorage),
    });

// Initialize Firestore
export const db = getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (only on web if supported and not in development)
let analytics = null;
if (typeof window !== 'undefined' && typeof document !== 'undefined' && process.env.NODE_ENV === 'production') {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    // Analytics not supported on this platform or blocked by ad blocker
    console.log('Analytics not available - may be blocked by ad blocker');
  }
} else {
  console.log('Analytics disabled in development mode');
}

// Suppress Google Analytics errors in development
if (process.env.NODE_ENV !== 'production') {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('googletagmanager')) {
      return; // Suppress Google Analytics errors
    }
    originalError.apply(console, args);
  };
}

export { analytics };

export default app;
