/**
 * Platform detection utility
 * Pure JavaScript - no React Native dependencies
 */

export type PlatformOS = 'web' | 'ios' | 'android';

/**
 * Detect the current platform
 * Returns 'web' if running in browser, otherwise tries to detect mobile platform
 */
export function getPlatform(): PlatformOS {
  // Check if running in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'web';
  }
  
  // For native platforms, we can't detect without React Native
  // Default to 'web' for service layer - platform-specific code should be in UI layer
  // Services should accept platform as a parameter if needed
  return 'web';
}

/**
 * Check if running on web platform
 */
export function isWeb(): boolean {
  return getPlatform() === 'web';
}

/**
 * Check if running on native platform (iOS or Android)
 */
export function isNative(): boolean {
  return !isWeb();
}

