import Constants from 'expo-constants';
import { isWeb } from '@/src/lib/platform';

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
        console.log(`[URLS] Detected Expo dev server IP from host URI: ${detectedIP}`);
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
    console.log(`[URLS] Constants.expoConfig?.extra?.API_BASE: ${Constants.expoConfig?.extra?.API_BASE || 'undefined'}`);
    console.log(`[URLS] Constants.manifest2?.extra?.expoConfig?.extra?.API_BASE: ${Constants.manifest2?.extra?.expoConfig?.extra?.API_BASE || 'undefined'}`);
    console.log(`[URLS] Configured API_BASE: ${configuredApiBase || 'undefined'}`);
    console.log(`[URLS] Detected dev server IP: ${devServerIP || 'undefined'}`);
  }
  
  // If we detected a dev server IP and no API_BASE is configured, use the detected IP
  // This ensures the backend is accessible on the same network as the Expo dev server
  // BUT: If API_BASE is explicitly configured, always use that instead (don't override)
  if (devServerIP && !isWeb() && !configuredApiBase) {
    const detectedApiBase = `http://${devServerIP}:4000`;
    console.log(`[URLS] No API_BASE configured, using detected dev server IP: ${detectedApiBase}`);
    return detectedApiBase;
  }
  
  // If both are set and different, warn but use configured (explicit config takes precedence)
  if (devServerIP && configuredApiBase && !isWeb()) {
    const detectedApiBase = `http://${devServerIP}:4000`;
    if (configuredApiBase !== detectedApiBase) {
      console.log(
        `[URLS] ℹ️  Expo dev server detected at ${devServerIP}, but using configured API_BASE: ${configuredApiBase}\n` +
        `[URLS] If backend is unreachable, ensure it's running at ${configuredApiBase}`
      );
    }
  }
  
  if (configuredApiBase) {
    // Validate that it's not localhost when using tunnel mode
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
    const isUsingTunnel = hostUri.includes('exp.direct');
    
    // Check if API_BASE is a local network IP (192.168.x.x, 172.x.x.x, 10.x.x.x, or localhost)
    const isLocalNetworkIP = configuredApiBase.includes('localhost') || 
                              /http:\/\/(192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|10\.)/.test(configuredApiBase);
    
    if (isUsingTunnel && isLocalNetworkIP) {
      console.warn(
        `[URLS] ⚠️  WARNING: You're using Expo tunnel mode, but API_BASE is set to a local network address: ${configuredApiBase}\n` +
        `[URLS] This backend won't be accessible from devices outside your local network.\n` +
        `[URLS] Solutions:\n` +
        `[URLS]   1. Use LAN mode instead: Stop and restart Expo without --tunnel flag\n` +
        `[URLS]   2. Tunnel your backend too: Use ngrok or similar to expose backend publicly\n` +
        `[URLS]   3. Test on same network: Ensure your device is on the same Wi-Fi as your computer`
      );
    }
    
    return configuredApiBase;
  }
  
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || '';
  const isUsingTunnel = hostUri.includes('exp.direct');
  
  // Platform-specific defaults
  if (isWeb()) {
    return 'http://localhost:4000';
  } else {
    // For native platforms, try to use detected IP first
    if (devServerIP) {
      return `http://${devServerIP}:4000`;
    }
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    // iOS simulator uses localhost
    // If using tunnel and no IP detected, warn user
    if (isUsingTunnel) {
      console.warn('[URLS] Using tunnel mode. Set API_BASE in app.json to your computer\'s local IP.');
    }
    // Default fallback - will need to be configured for physical devices
    return 'http://localhost:4000';
  }
};

// Get API base URL
export const API_BASE = getApiBase();

// Log API base URL in development for debugging
if (process.env.NODE_ENV !== 'production') {
  const hostUri = Constants.expoConfig?.hostUri || 'not available';
  const isUsingTunnel = hostUri.includes('exp.direct');
  
  console.log(`[URLS] API_BASE configured as: ${API_BASE}`);
  console.log(`[URLS] Platform: ${isWeb() ? 'web' : 'native'}`);
  console.log(`[URLS] Host URI: ${hostUri}`);
  
  if (isUsingTunnel && !Constants.expoConfig?.extra?.API_BASE) {
    console.warn(
      `[URLS] ⚠️  Using Expo tunnel mode. Backend at ${API_BASE} may not be accessible.\n` +
      `[URLS] 💡 Solution: Set API_BASE in app.json to your computer's local IP (e.g., "http://192.168.x.x:4000")`
    );
  }
}

