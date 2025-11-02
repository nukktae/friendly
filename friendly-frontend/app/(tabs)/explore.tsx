import ClassesListScreen from '@/src/screens/classes/ClassesListScreen';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function ClassesScreen() {
  const handleBack = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <ClassesListScreen
        title="Classes"
        onBack={handleBack}
      />
    </View>
  );
}