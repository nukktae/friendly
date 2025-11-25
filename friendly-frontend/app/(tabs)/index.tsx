import GPACalculatorScreen from '@/src/screens/gpa/GPACalculatorScreen';
import React from 'react';
import { View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <GPACalculatorScreen />
    </View>
  );
}
