import LoginScreen from '@/src/screens/auth/LoginScreen';
import React from 'react';
import { View } from 'react-native';

export default function LoginRoute() {
  return (
    <View style={{ flex: 1 }}>
      <LoginScreen />
    </View>
  );
}
