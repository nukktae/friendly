/**
 * Theme Store
 * 
 * This store manages theme state (light/dark mode).
 * Currently uses a simple hook pattern - can be migrated to Zustand/Jotai later.
 * 
 * Migration strategy:
 * 1. Keep existing theme hooks working (backward compatibility)
 * 2. Gradually migrate components to use this store
 * 3. Eventually replace theme hooks with this store
 */

import { useState, useCallback, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  isSystemTheme: boolean;
}

interface ThemeActions {
  setTheme: (theme: 'light' | 'dark') => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export type ThemeStore = ThemeState & ThemeActions;

/**
 * Theme store hook
 * 
 * Usage:
 * ```tsx
 * const { theme, setTheme, toggleTheme } = useThemeStore();
 * ```
 */
export function useThemeStore(): ThemeStore {
  const systemColorScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [manualTheme, setManualTheme] = useState<'light' | 'dark'>('light');

  // Determine the actual theme based on mode
  const theme: 'light' | 'dark' = themeMode === 'system' 
    ? (systemColorScheme ?? 'light')
    : themeMode;

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setManualTheme(newTheme);
    setThemeModeState(newTheme);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    if (mode !== 'system') {
      setManualTheme(mode);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return {
    // State
    theme,
    themeMode,
    isSystemTheme: themeMode === 'system',
    
    // Actions
    setTheme,
    setThemeMode,
    toggleTheme,
  };
}

