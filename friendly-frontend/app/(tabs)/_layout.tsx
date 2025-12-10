import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/src/components/ui/haptic-tab';
import { useApp } from '@/src/context/AppContext';
import tutorialService from '@/src/services/tutorial/tutorialService';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
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
    console.log('[Tabs] Tutorial effect triggered, tutorialStartedRef.current:', tutorialStartedRef.current);
    
    const timer = setTimeout(async () => {
      try {
        console.log('[Tabs] ========== Starting tutorial check process ==========');
        // Wait for tutorial service to finish loading completed tutorials from storage
        console.log('[Tabs] Step 1: Waiting for tutorial service to load from storage...');
        await tutorialService.waitForLoad();
        console.log('[Tabs] Step 2: Tutorial service load complete');
        
        // Check if tutorial is already completed before starting
        console.log('[Tabs] Step 3: Checking if dashboard_tutorial is completed...');
        const isCompleted = tutorialService.isTutorialCompleted('dashboard_tutorial');
        console.log('[Tabs] Step 4: Dashboard tutorial completed status:', isCompleted);
        console.log('[Tabs] Step 5: tutorialStartedRef.current:', tutorialStartedRef.current);
        
        // Only prevent starting if already started in THIS session AND tutorial is not completed
        // If tutorial is completed, we should never start it regardless of ref
        if (isCompleted) {
          console.log('[Tabs] ❌ Dashboard tutorial already completed in storage, skipping');
          return;
        }
        
        // If not completed, check if we've already started it in this session
        if (tutorialStartedRef.current) {
          console.log('[Tabs] ❌ Tutorial already started in this session, skipping');
          return;
        }
        
        // Start the tutorial
        tutorialStartedRef.current = true;
        console.log('[Tabs] ✅ Starting dashboard tutorial (not completed and not started in session)');
        startTutorial('dashboard');
        console.log('[Tabs] ========== Tutorial check process complete ==========');
      } catch (error) {
        console.error('[Tabs] ❌ Error checking tutorial status:', error);
        // If there's an error, don't start the tutorial
      }
    }, 500); // Small delay to ensure UI is ready

    return () => {
      console.log('[Tabs] Tutorial effect cleanup');
      clearTimeout(timer);
    };
  }, [startTutorial]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#426b1f', // Deep green for active tabs
        tabBarInactiveTintColor: '#9ca3af', // gray-400
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb', // gray-200
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom - 8, 0),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
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
