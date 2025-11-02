# Screens

This directory contains all screen components for the application. Screens represent full-page views and are organized by feature.

## Structure

Each feature has its own subdirectory:

- **`/auth`** - Authentication screens (Login, Signup)
- **`/cart`** - Shopping cart and checkout flow
- **`/classes`** - Class browsing and details
- **`/community`** - Community features
- **`/onboarding`** - User onboarding flow
- **`/profile`** - User profile management
- **`/recording`** - Voice recording features
- **`/schedule`** - Schedule management
- **`/assignments`** - Assignment details and management

## Guidelines

### Screen Responsibilities
Screens should:
- Handle navigation logic
- Compose components
- Connect to context/services
- Pass data to child components
- Handle route parameters

Screens should NOT:
- Contain complex business logic (use services)
- Have inline styles (use StyleSheet)
- Duplicate code (extract to components)

### Example Screen Structure

```typescript
import SomeScreen from '@/src/screens/feature/SomeScreen';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

interface SomeScreenProps {
  someData: string;
  onAction: () => void;
}

export default function SomeScreen({ someData, onAction }: SomeScreenProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Screen content */}
    </View>
  );
}
```

## Import Usage

```typescript
// Use barrel exports for cleaner imports
import { LoginScreen, SignupScreen, CartScreen } from '@/src/screens';
```

