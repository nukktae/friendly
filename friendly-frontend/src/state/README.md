# State Management Stores

This directory contains state management stores that provide a foundation for migrating away from React Context to a more scalable state management solution.

## Current Stores

### `useAuthStore`
Manages authentication state:
- `isAuthenticated`: boolean
- `user`: User | null
- `authInitialized`: boolean
- `isGoogleSignInAvailable`: boolean
- Actions: `login()`, `signup()`, `signInWithGoogle()`, `logout()`, `initialize()`

### `useUserStore`
Manages user profile state:
- `userProfile`: UserProfile | null
- `isOnboardingComplete`: boolean
- `isLoading`: boolean
- Actions: `loadUserProfile()`, `setUserProfile()`, `setIsOnboardingComplete()`, `clearUserProfile()`

### `useThemeStore`
Manages theme state:
- `theme`: 'light' | 'dark'
- `themeMode`: 'light' | 'dark' | 'system'
- `isSystemTheme`: boolean
- Actions: `setTheme()`, `setThemeMode()`, `toggleTheme()`

## Usage

### Basic Example

```tsx
import { useAuthStore, useUserStore } from '@/src/state';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuthStore();
  const { userProfile, loadUserProfile } = useUserStore();
  
  useEffect(() => {
    if (user?.uid) {
      loadUserProfile(user.uid);
    }
  }, [user, loadUserProfile]);
  
  // Use the state...
}
```

### Migration Strategy

**Phase 1: Foundation (Current)**
- ✅ Stores created and ready to use
- ✅ AppContext still works (backward compatibility)
- ✅ No breaking changes

**Phase 2: Gradual Migration**
- Start using stores in new components
- Migrate auth-related components first
- Keep AppContext for non-migrated components

**Phase 3: Full Migration**
- Replace AppContext with stores
- Remove Context providers
- Use Zustand/Jotai if needed for better performance

## Migration Example

### Before (AppContext)
```tsx
import { useApp } from '@/src/context/AppContext';

function LoginScreen() {
  const { login, signInWithGoogle } = useApp();
  // ...
}
```

### After (Store)
```tsx
import { useAuthStore } from '@/src/state';

function LoginScreen() {
  const { login, signInWithGoogle } = useAuthStore();
  // ...
}
```

## Future Enhancements

When ready, these stores can be migrated to:
- **Zustand**: Lightweight, performant state management
- **Jotai**: Atomic state management
- **Redux Toolkit**: If more complex state is needed

The current implementation uses a simple hook pattern that's compatible with any of these libraries.

