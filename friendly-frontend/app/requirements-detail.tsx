import RequirementsDetailScreen from '@/src/screens/gpa/RequirementsDetailScreen';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function RequirementsDetailRoute() {
  const router = useRouter();

  const handleBack = () => {
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/index');
      }
    } catch (error) {
      router.push('/(tabs)/index');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <RequirementsDetailScreen onBack={handleBack} />
    </View>
  );
}

