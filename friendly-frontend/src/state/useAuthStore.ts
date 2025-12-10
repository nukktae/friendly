/**
 * Authentication Store
 * 
 * This store manages authentication state.
 * Currently uses a simple hook pattern - can be migrated to Zustand/Jotai later.
 * 
 * Migration strategy:
 * 1. Keep AppContext working (backward compatibility)
 * 2. Gradually migrate components to use this store
 * 3. Eventually replace AppContext auth logic with this store
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '@/src/services/auth/authService';
import { User } from '@/src/types';
import { isWeb } from '@/src/lib/platform';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  authInitialized: boolean;
  isGoogleSignInAvailable: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: (platform?: 'web' | 'ios' | 'android') => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

export type AuthStore = AuthState & AuthActions;

/**
 * Authentication store hook
 * 
 * Usage:
 * ```tsx
 * const { isAuthenticated, user, login, logout } = useAuthStore();
 * ```
 */
export function useAuthStore(): AuthStore {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize auth state
  const initialize = useCallback(() => {
    // Configure Google Sign-In for mobile platforms
    AuthService.configureGoogleSignIn();
    
    // Check initial auth state synchronously to avoid race condition on refresh
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setIsAuthenticated(true);
      setUser({
        uid: currentUser.uid,
        email: currentUser.email || '',
        name: currentUser.displayName || undefined,
      });
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setAuthInitialized(true);
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    initialize();
    
    const unsubscribe = AuthService.onAuthStateChanged((user: User | null) => {
      if (user) {
        setIsAuthenticated(true);
        setUser(user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [initialize]);

  // Actions
  const login = useCallback(async (email: string, password: string) => {
    try {
      await AuthService.login(email, password);
      // Auth state will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    try {
      await AuthService.signup(email, password, name);
      // Auth state will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async (platform: 'web' | 'ios' | 'android' = isWeb() ? 'web' : 'ios') => {
    try {
      await AuthService.signInWithGoogle(platform);
      // Auth state will be updated by onAuthStateChanged listener
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('Starting logout process...');
      await AuthService.logout();
      console.log('Firebase logout successful');
      // Auth state will be updated by onAuthStateChanged listener
      console.log('Logout process completed');
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, []);

  return {
    // State
    isAuthenticated,
    user,
    authInitialized,
    isGoogleSignInAvailable: AuthService.isGoogleSignInAvailable(isWeb() ? 'web' : 'ios'),
    
    // Actions
    login,
    signup,
    signInWithGoogle,
    logout,
    initialize,
  };
}

