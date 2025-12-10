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
        router.push('/' as any);
      }
    } catch (error) {
      router.push('/' as any);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <RequirementsDetailScreen onBack={handleBack} />
    </View>
  );
}

