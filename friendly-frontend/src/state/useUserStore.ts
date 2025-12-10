/**
 * User Store
 * 
 * This store manages user profile state.
 * Currently uses a simple hook pattern - can be migrated to Zustand/Jotai later.
 * 
 * Migration strategy:
 * 1. Keep AppContext working (backward compatibility)
 * 2. Gradually migrate components to use this store
 * 3. Eventually replace AppContext user profile logic with this store
 */

import { useState, useCallback } from 'react';
import { FirestoreService } from '@/src/services/firestore/firestoreService';
import { UserProfile } from '@/src/types';

interface UserState {
  userProfile: UserProfile | null;
  isOnboardingComplete: boolean;
  isLoading: boolean;
}

interface UserActions {
  loadUserProfile: (uid: string) => Promise<void>;
  setUserProfile: (profile: UserProfile | null) => void;
  setIsOnboardingComplete: (completed: boolean) => void;
  clearUserProfile: () => void;
}

export type UserStore = UserState & UserActions;

/**
 * User store hook
 * 
 * Usage:
 * ```tsx
 * const { userProfile, isOnboardingComplete, loadUserProfile } = useUserStore();
 * ```
 */
export function useUserStore(): UserStore {
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [isOnboardingComplete, setIsOnboardingCompleteState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadUserProfile = useCallback(async (uid: string) => {
    if (!uid) return;
    
    setIsLoading(true);
    try {
      const profile = await FirestoreService.getUserProfile(uid);
      if (profile) {
        setUserProfileState(profile);
        setIsOnboardingCompleteState(profile.onboardingCompleted);
      } else {
        // Profile doesn't exist yet - this is normal for new users
        setUserProfileState(null);
        setIsOnboardingCompleteState(false);
      }
    } catch (error: any) {
      // FirestoreService now returns null instead of throwing for 404s
      // Only log unexpected errors
      if (!error?.message?.includes('Network request failed') && 
          !error?.message?.includes('Failed to fetch') &&
          !error?.message?.includes('not found') &&
          !error?.message?.includes('404')) {
        console.error('Error loading user profile:', error);
      }
      setUserProfileState(null);
      setIsOnboardingCompleteState(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setUserProfile = useCallback((profile: UserProfile | null) => {
    setUserProfileState(profile);
    if (profile) {
      setIsOnboardingCompleteState(profile.onboardingCompleted);
    } else {
      setIsOnboardingCompleteState(false);
    }
  }, []);

  const setIsOnboardingComplete = useCallback((completed: boolean) => {
    setIsOnboardingCompleteState(completed);
    if (userProfile) {
      setUserProfileState({
        ...userProfile,
        onboardingCompleted: completed,
      });
    }
  }, [userProfile]);

  const clearUserProfile = useCallback(() => {
    setUserProfileState(null);
    setIsOnboardingCompleteState(false);
  }, []);

  return {
    // State
    userProfile,
    isOnboardingComplete,
    isLoading,
    
    // Actions
    loadUserProfile,
    setUserProfile,
    setIsOnboardingComplete,
    clearUserProfile,
  };
}

