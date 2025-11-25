import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';

import { HapticTab } from '@/src/components/custom/haptic-tab';
import { useApp } from '@/src/context/AppContext';
import tutorialService from '@/src/services/tutorial/tutorialService';

export default function TabLayout() {
  const { startTutorial, loadUserProfile, user, isAuthenticated } = useApp();
  const tutorialStartedRef = useRef(false);

  // Load profile when user is authenticated and on tabs (not on auth pages)
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      // Add a small delay to ensure profile is created (especially after Google Sign-In)
      const timer = setTimeout(() => {
        loadUserProfile().then(() => {
          // If profile is still null after loading, retry once (profile might still be creating)
          // Check after a short delay if profile was loaded
          setTimeout(() => {
            // Retry loading profile if it's still not loaded
            loadUserProfile();
          }, 500);
        });
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.uid, loadUserProfile]);

  // Start dashboard tutorial only once when user first accesses the tabs
  // and only if the tutorial hasn't been completed
  useEffect(() => {
    // Prevent multiple calls
    if (tutorialStartedRef.current) return;
    
    const timer = setTimeout(async () => {
      try {
        // Get the tutorial service instance to ensure it's initialized
        const service = tutorialService.getInstance();
        
        // Wait a bit for AsyncStorage to load completed tutorials
        // The service loads tutorials in its constructor, so we wait for that
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Check if tutorial is already completed before starting
        const isCompleted = tutorialService.isTutorialCompleted('dashboard_tutorial');
        
        if (!isCompleted && !tutorialStartedRef.current) {
          tutorialStartedRef.current = true;
          startTutorial('dashboard');
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
        // If there's an error, don't start the tutorial
      }
    }, 1500); // Small delay to ensure UI is ready and AsyncStorage has loaded

    return () => clearTimeout(timer);
  }, [startTutorial]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000000', // Black for active tabs
        tabBarInactiveTintColor: '#9ca3af', // gray-400
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb', // gray-200
          borderTopWidth: 1,
        },
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size || 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size || 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'GPA',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size || 24} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            // Add tutorial targeting for GPA tab
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size || 24} color={color} />,
        }}
      />
    </Tabs>
  );
}
