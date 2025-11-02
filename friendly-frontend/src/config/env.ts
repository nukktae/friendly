import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get API base URL with platform-specific defaults
const getApiBase = (): string => {
  // Check if explicitly configured
  if (Constants.expoConfig?.extra?.API_BASE) {
    return Constants.expoConfig.extra.API_BASE;
  }
  
  // Platform-specific defaults
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  } else if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return 'http://10.0.2.2:4000';
  } else {
    // iOS simulator and physical devices
    return 'http://localhost:4000';
  }
};

// Environment variables configuration
export const ENV = {
  API_BASE: getApiBase(),
  GOOGLE_CLIENT_ID: Constants.expoConfig?.extra?.GOOGLE_CLIENT_ID || '138346490852-f86gp9smc826j784lphcf5do6b09kbis.apps.googleusercontent.com',
  GOOGLE_WEB_CLIENT_ID: Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID || '138346490852-blj2odpblp3e29mv0vgtc8ekl5t9i2fn.apps.googleusercontent.com',
  GOOGLE_REDIRECT_URI: Constants.expoConfig?.extra?.GOOGLE_REDIRECT_URI || 'http://localhost:8081',
  GOOGLE_WEB_CLIENT_SECRET: Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_SECRET || undefined,
  FIREBASE_API_KEY: Constants.expoConfig?.extra?.FIREBASE_API_KEY || 'AIzaSyDWmjPrqBmd2sJXWBuYlC3GieTYzwiAWGI',
  FIREBASE_AUTH_DOMAIN: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN || 'friendly-34f75.firebaseapp.com',
  FIREBASE_PROJECT_ID: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID || 'friendly-34f75',
  FIREBASE_STORAGE_BUCKET: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET || 'friendly-34f75.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID || '411686453883',
  FIREBASE_APP_ID: Constants.expoConfig?.extra?.FIREBASE_APP_ID || '1:411686453883:web:1dfc5b794b28300f2e18de',
  FIREBASE_MEASUREMENT_ID: Constants.expoConfig?.extra?.FIREBASE_MEASUREMENT_ID || 'G-6EKT489GME',
  KOREAN_GOV_API_KEY: Constants.expoConfig?.extra?.KOREAN_GOV_API_KEY || '20b99b934fc597f4c8ac1d11e3d9a5159dc3c6f46a12bbe9699f4308c689e2cd',
};
