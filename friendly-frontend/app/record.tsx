import RecordScreen from '@/src/screens/recording/RecordScreen';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function RecordRoute() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleSave = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <RecordScreen onBack={handleBack} onSave={handleSave} />
    </View>
  );
}
