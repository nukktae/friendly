import { useApp } from '@/src/context/AppContext';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, isOnboardingComplete } = useApp();

  console.log('Index: isAuthenticated:', isAuthenticated, 'isOnboardingComplete:', isOnboardingComplete);

  // Redirect based on authentication and onboarding status
  if (!isAuthenticated) {
    console.log('Index: Redirecting to login');
    return <Redirect href="/login" />;
  } else if (!isOnboardingComplete) {
    console.log('Index: Redirecting to onboarding');
    return <Redirect href="/onboarding" />;
  } else {
    console.log('Index: Redirecting to tabs');
    return <Redirect href="/(tabs)" />;
  }
}
