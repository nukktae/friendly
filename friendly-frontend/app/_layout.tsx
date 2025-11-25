import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import '../src/polyfills';

import TutorialOverlay from '@/src/components/tutorial/TutorialOverlay';
import { AppProvider, useApp } from '@/src/context/AppContext';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

function AppWithOverlay() {
  const { 
    isAuthenticated,
    showTutorial,
    currentTutorial,
    currentTutorialStep,
    nextTutorialStep,
    previousTutorialStep,
    skipTutorial,
    completeTutorial
  } = useApp();
  
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="class/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="assignment/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="assignment/create" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="record" options={{ headerShown: false }} />
        <Stack.Screen name="schedule-review" options={{ headerShown: false }} />
        
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
      
      {/* Global Tutorial Overlay */}
      <TutorialOverlay
        visible={showTutorial}
        steps={currentTutorial?.steps || []}
        currentStep={currentTutorialStep}
        onNext={nextTutorialStep}
        onPrevious={previousTutorialStep}
        onSkip={skipTutorial}
        onComplete={completeTutorial}
      />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppWithOverlay />
        <StatusBar style="dark" backgroundColor="#ffffff" />
      </ThemeProvider>
    </AppProvider>
  );
}
