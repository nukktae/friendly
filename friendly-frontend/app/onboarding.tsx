import { useApp } from '@/src/context/AppContext';
import OnboardingCompleteScreen from '@/src/screens/onboarding/OnboardingCompleteScreen';
import OnboardingScreen from '@/src/screens/onboarding/OnboardingScreen';
import { FirestoreService } from '@/src/services/firestore/firestoreService';
import { OnboardingData } from '@/src/types';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';

export default function OnboardingRoute() {
  const { user, setIsOnboardingComplete } = useApp();
  const [isComplete, setIsComplete] = useState(false);
  const [userName, setUserName] = useState('');

  const handleOnboardingComplete = async (data: OnboardingData) => {
    if (!user?.email || !user?.uid) {
      Alert.alert('Error', 'User information not found');
      return;
    }

    try {
      // Try to create user profile in Firestore
      try {
        await FirestoreService.createUserProfile(user.uid, user.email, data);
        console.log('User profile created successfully');
      } catch (profileError: any) {
        // Handle network errors gracefully - allow onboarding to complete even if backend is unavailable
        if (profileError?.message?.includes('Network request failed') || profileError?.message?.includes('Failed to fetch')) {
          console.log('Backend server not reachable. Onboarding will complete locally. Profile can be synced later when backend is available.');
          // Continue with onboarding completion even if backend is unavailable
        } else {
          // Re-throw other errors (validation, etc.)
          throw profileError;
        }
      }
      
      // Set completion state
      setUserName(data.fullName);
      setIsComplete(true);
      
      // Update global onboarding completion state
      setIsOnboardingComplete(true);
      
      console.log('Onboarding completed successfully');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      // Only show error alert for non-network errors
      if (!error?.message?.includes('Network request failed') && !error?.message?.includes('Failed to fetch')) {
        Alert.alert('Error', error.message || 'Failed to complete onboarding. Please try again.');
      } else {
        // For network errors, still complete onboarding locally
        setUserName(data.fullName);
        setIsComplete(true);
        setIsOnboardingComplete(true);
        console.log('Onboarding completed locally (backend unavailable)');
      }
    }
  };

  const handleGetStarted = () => {
    console.log('Get Started button clicked - navigating to dashboard');
    // Navigate to main app
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    // Go back to login/signup
    router.replace('/login');
  };

  if (isComplete) {
    return (
      <OnboardingCompleteScreen
        userName={userName}
        onGetStarted={handleGetStarted}
      />
    );
  }

  return (
    <OnboardingScreen
      onComplete={handleOnboardingComplete}
      onBack={handleBack}
    />
  );
}
