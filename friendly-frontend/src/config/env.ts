import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get API base URL with platform-specific defaults
const getApiBase = (): string => {
  // First, try to get the dev server IP from Expo Constants
  // This works for physical devices connected to the same network
  const getDevServerIP = (): string | null => {
    // Check hostUri which contains the dev server address
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    
    // Check if we're using Expo tunnel (exp.direct)
    const isUsingTunnel = hostUri?.includes('exp.direct') || hostUri?.includes('.exp.direct');
    
    if (hostUri && !isUsingTunnel) {
      // Extract IP from URLs like "192.168.219.101:8081" or "exp://192.168.219.101:8081" or "172.30.1.60:8081"
      const match = hostUri.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1]) {
        const detectedIP = match[1];
        console.log(`[ENV] Detected Expo dev server IP from host URI: ${detectedIP}`);
        return detectedIP;
      }
    }
    
    return null;
  };
  
  const devServerIP = getDevServerIP();
  
  // Check if explicitly configured in app.json extra section
  const configuredApiBase = Constants.expoConfig?.extra?.API_BASE || 
                             Constants.manifest2?.extra?.expoConfig?.extra?.API_BASE;
  
  // Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ENV] Constants.expoConfig?.extra?.API_BASE: ${Constants.expoConfig?.extra?.API_BASE || 'undefined'}`);
    console.log(`[ENV] Constants.manifest2?.extra?.expoConfig?.extra?.API_BASE: ${Constants.manifest2?.extra?.expoConfig?.extra?.API_BASE || 'undefined'}`);
    console.log(`[ENV] Configured API_BASE: ${configuredApiBase || 'undefined'}`);
    console.log(`[ENV] Detected dev server IP: ${devServerIP || 'undefined'}`);
  }
  
  // If we detected a dev server IP and it's different from configured API_BASE, use the detected IP
  // This ensures the backend is accessible on the same network as the Expo dev server
  if (devServerIP && Platform.OS !== 'web') {
    const detectedApiBase = `http://${devServerIP}:4000`;
    
    if (configuredApiBase && configuredApiBase !== detectedApiBase) {
      console.warn(
        `[ENV] ⚠️  API_BASE is configured as ${configuredApiBase} but Expo dev server is at ${devServerIP}.\n` +
        `[ENV] Using detected IP ${detectedApiBase} to match Expo dev server.\n` +
        `[ENV] Update app.config.ts if you want to use a different backend IP.`
      );
    }
    
    return detectedApiBase;
  }
  
  if (configuredApiBase) {
    // Validate that it's not localhost when using tunnel mode
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
    const isUsingTunnel = hostUri.includes('exp.direct');
    
    if (isUsingTunnel && configuredApiBase.includes('localhost')) {
      console.warn(
        `[ENV] ⚠️  API_BASE is set to ${configuredApiBase} but you're using Expo tunnel mode.\n` +
        `[ENV] localhost won't work with tunnel mode. Please update app.json to use your computer's local IP.\n` +
        `[ENV] Example: "http://192.168.x.x:4000" (find your IP with: ifconfig | grep "inet " | grep -v 127.0.0.1)`
      );
    }
    
    return configuredApiBase;
  }
  
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
  const isUsingTunnel = hostUri.includes('exp.direct');
  
  // Platform-specific defaults
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  } else if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    // Physical devices use the dev server IP
    if (devServerIP) {
      return `http://${devServerIP}:4000`;
    }
    // If using tunnel and no IP detected, fallback to emulator IP (won't work on physical device)
    if (isUsingTunnel) {
      console.warn('[ENV] Using tunnel mode on Android. Set API_BASE in app.json to your computer\'s local IP.');
    }
    return 'http://10.0.2.2:4000';
  } else {
    // iOS simulator uses localhost, physical devices use dev server IP
    if (devServerIP) {
      return `http://${devServerIP}:4000`;
    }
    // If using tunnel and no IP detected, localhost won't work on physical device
    if (isUsingTunnel) {
      console.warn('[ENV] Using tunnel mode on iOS. Set API_BASE in app.json to your computer\'s local IP (e.g., "http://192.168.x.x:4000").');
    }
    return 'http://localhost:4000';
  }
};

// Get API base URL
const apiBase = getApiBase();

// Log API base URL in development for debugging
if (process.env.NODE_ENV !== 'production') {
  const hostUri = Constants.expoConfig?.hostUri || 'not available';
  const isUsingTunnel = hostUri.includes('exp.direct');
  
  console.log(`[ENV] API_BASE configured as: ${apiBase}`);
  console.log(`[ENV] Platform: ${Platform.OS}`);
  console.log(`[ENV] Host URI: ${hostUri}`);
  
  if (isUsingTunnel && !Constants.expoConfig?.extra?.API_BASE) {
    console.warn(
      `[ENV] ⚠️  Using Expo tunnel mode. Backend at ${apiBase} may not be accessible.\n` +
      `[ENV] 💡 Solution: Set API_BASE in app.json to your computer's local IP (e.g., "http://192.168.x.x:4000")`
    );
  }
}

// Environment variables configuration
export const ENV = {
  API_BASE: apiBase,
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
