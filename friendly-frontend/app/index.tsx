import { useApp } from '@/src/context/AppContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isOnboardingComplete, loadUserProfile, user, authInitialized } = useApp();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Wait for component to mount before navigating
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load profile when authenticated and not on auth pages
  useEffect(() => {
    if (isAuthenticated && user?.uid && isMounted) {
      setProfileLoading(true);
      // Add a small delay to ensure profile is created (especially after Google Sign-In)
      const timer = setTimeout(async () => {
        try {
          await loadUserProfile();
          // Wait a bit for state to update
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          setProfileLoading(false);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!isAuthenticated) {
      setProfileLoading(false);
    }
  }, [isAuthenticated, user?.uid, loadUserProfile, isMounted]);

  // Handle navigation after mount AND auth initialization AND profile loading
  useEffect(() => {
    if (!isMounted || !authInitialized) return;
    
    // If authenticated, wait for profile to be loaded (or confirmed as not existing)
    if (isAuthenticated && profileLoading) {
      return; // Still loading profile
    }

    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      try {
        if (!isAuthenticated) {
          console.log('Index: Redirecting to login');
          router.replace('/auth/login' as any);
        } else if (!isOnboardingComplete) {
          console.log('Index: Redirecting to onboarding (onboardingComplete:', isOnboardingComplete, ')');
          router.replace('/onboarding');
        } else {
          console.log('Index: Redirecting to classes tab');
          router.replace('/(tabs)/explore');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isOnboardingComplete, isMounted, authInitialized, router, profileLoading]);

  // Show loading while determining where to navigate
  if (!isMounted || !authInitialized || (isAuthenticated && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6B7C32" />
      </View>
    );
  }

  // Return empty view while redirecting (navigation happens in useEffect)
  return <View style={{ flex: 1 }} />;
}
