import ProfileScreen from '@/src/screens/profile/ProfileScreen';
import { router } from 'expo-router';
import React from 'react';

export default function ProfileTab() {
  const handleBack = () => {
    router.push('/');
  };

  return (
    <ProfileScreen
      onBack={handleBack}
    />
  );
}
