import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';

import { HapticTab } from '@/src/components/custom/haptic-tab';
import { useApp } from '@/src/context/AppContext';

export default function TabLayout() {
  const { startTutorial } = useApp();

  // Start dashboard tutorial when user first accesses the tabs
  useEffect(() => {
    const timer = setTimeout(() => {
      startTutorial('dashboard');
    }, 1000); // Small delay to ensure UI is ready

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
        name="index"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size || 24} color={color} />,
        }}
        listeners={{
          tabPress: () => {
            // Add tutorial targeting for schedule tab
          },
        }}
      />
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size || 24} color={color} />,
        }}
      />
    </Tabs>
  );
}
