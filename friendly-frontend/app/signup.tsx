import SignupScreen from '@/src/screens/auth/SignupScreen';
import React from 'react';
import { View } from 'react-native';

export default function SignupRoute() {
  return (
    <View style={{ flex: 1 }}>
      <SignupScreen />
    </View>
  );
}
