import RecordScreen from '@/src/screens/recording/RecordScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function RecordRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const lectureId = params.lectureId as string | undefined;

  const handleBack = () => {
    // Try to go back, if that fails navigate to explore tab
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/explore');
      }
    } catch (error) {
      // Fallback to explore tab if navigation fails
      router.push('/(tabs)/explore');
    }
  };

  const handleSave = () => {
    // Try to go back, if that fails navigate to explore tab
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/explore');
      }
    } catch (error) {
      // Fallback to explore tab if navigation fails
      router.push('/(tabs)/explore');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <RecordScreen lectureId={lectureId} onBack={handleBack} onSave={handleSave} />
    </View>
  );
}
