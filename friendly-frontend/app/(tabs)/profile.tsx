import ProfileScreen from '@/src/screens/profile/ProfileScreen';
import { router, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useApp } from '@/src/context/AppContext';
import { View, ActivityIndicator } from 'react-native';

export default function ProfileTab() {
  const routerInstance = useRouter();
  const { isAuthenticated } = useApp();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for router to be ready
    setIsReady(true);
  }, []);

  useEffect(() => {
    // Handle authentication redirect at route level, not in component
    if (isReady && !isAuthenticated) {
      // Use a small delay to ensure router is ready
      const timer = setTimeout(() => {
        try {
          if (routerInstance && routerInstance.replace) {
            routerInstance.replace('/login');
          }
        } catch (error) {
          console.warn('Navigation error in ProfileTab:', error);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isReady, isAuthenticated, routerInstance]);

  const handleBack = () => {
    router.push('/');
  };

  // Show loading or nothing while checking auth
  if (!isReady || !isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#0F3F2E" />
      </View>
    );
  }

  return (
    <ProfileScreen
      onBack={handleBack}
    />
  );
}
