/**
 * State Management Stores
 * 
 * This directory contains state management stores that can gradually replace
 * React Context for better performance and simpler state management.
 * 
 * Current stores:
 * - useAuthStore: Authentication state (login, logout, user)
 * - useUserStore: User profile state (profile, onboarding)
 * - useThemeStore: Theme state (light/dark mode)
 * 
 * Migration strategy:
 * 1. Keep existing Context working (backward compatibility)
 * 2. Gradually migrate components to use stores
 * 3. Eventually replace Context with stores
 */

export { useAuthStore } from './useAuthStore';
export type { AuthStore } from './useAuthStore';

export { useUserStore } from './useUserStore';
export type { UserStore } from './useUserStore';

export { useThemeStore } from './useThemeStore';
export type { ThemeStore } from './useThemeStore';

