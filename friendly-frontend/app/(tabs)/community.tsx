import CommunityScreen from '@/src/screens/community/CommunityScreen';
import { router } from 'expo-router';
import React from 'react';

export default function CommunityTab() {
  const handleBack = () => {
    router.push('/');
  };

  return (
    <CommunityScreen
      title="Community"
      onBack={handleBack}
    />
  );
}
