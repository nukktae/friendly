import { useApp } from '@/src/context/AppContext';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isOnboardingComplete, loadUserProfile, user } = useApp();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Wait for component to mount before navigating
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load profile when authenticated and not on auth pages
  useEffect(() => {
    if (isAuthenticated && user?.uid && isMounted) {
      // Add a small delay to ensure profile is created (especially after Google Sign-In)
      const timer = setTimeout(() => {
        loadUserProfile().then(() => {
          // Retry loading profile after a delay if it's still not loaded
          setTimeout(() => {
            loadUserProfile();
          }, 500);
        });
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.uid, loadUserProfile, isMounted]);

  // Handle navigation after mount
  useEffect(() => {
    if (!isMounted) return;

    // Small delay to ensure router is ready
    const timer = setTimeout(() => {
      try {
  if (!isAuthenticated) {
    console.log('Index: Redirecting to login');
          router.replace('/login');
  } else if (!isOnboardingComplete) {
    console.log('Index: Redirecting to onboarding');
          router.replace('/onboarding');
  } else {
    console.log('Index: Redirecting to tabs');
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isOnboardingComplete, isMounted, router]);

  // Show loading while determining where to navigate
  if (!isMounted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6B7C32" />
      </View>
    );
  }

  // Return empty view while redirecting (navigation happens in useEffect)
  return <View style={{ flex: 1 }} />;
}
