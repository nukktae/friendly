import ScheduleScreen from '@/src/screens/schedule/ScheduleScreen';
import React from 'react';
import { View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScheduleScreen />
    </View>
  );
}
