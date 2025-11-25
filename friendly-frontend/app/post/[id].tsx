import PostDetailScreen from '@/src/screens/community/PostDetailScreen';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function PostDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleBack = () => {
    // Try to go back, if that fails navigate to community tab
    try {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/community');
      }
    } catch (error) {
      // Fallback to community tab if navigation fails
      router.push('/(tabs)/community');
    }
  };

  return (
    <PostDetailScreen
      postId={id || ''}
      onBack={handleBack}
    />
  );
}

