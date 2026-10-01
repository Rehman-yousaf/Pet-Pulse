import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile } from '@/src/services/userService';
import type { ThemePreference } from '@/src/services/userService';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  grey: string;
  white: string;
  card: string;
  error: string;
  border: string;
  tabActive: string;
  tabInactive: string;
}

const LIGHT_COLORS: ThemeColors = {
  primary: '#FF7A00',
  secondary: '#EA580C',
  background: '#F5F6F8',
  text: '#111827',
  grey: '#374151',
  white: '#FFFFFF',
  card: '#FFFFFF',
  error: '#DC2626',
  border: '#E4E6EB',
  tabActive: '#FF7A00',
  tabInactive: '#A0A4A8',
};

const DARK_COLORS: ThemeColors = {
  primary: '#FF7A00',
  secondary: '#EA580C',
  background: '#111827',
  text: '#F9FAFB',
  grey: '#9CA3AF',
  white: '#1F2937',
  card: '#1F2937',
  error: '#DC2626',
  border: '#374151',
  tabActive: '#FF7A00',
  tabInactive: '#A0A4A8',
};

interface ThemeContextType {
  currentTheme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  colors: ThemeColors;
  colorScheme: 'light' | 'dark';
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const systemScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  const colorScheme: 'light' | 'dark' = useMemo(() => {
    if (currentTheme === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return currentTheme;
  }, [currentTheme, systemScheme]);

  const colors = useMemo(
    () => (colorScheme === 'dark' ? DARK_COLORS : LIGHT_COLORS),
    [colorScheme]
  );

  useEffect(() => {
    if (!user?.uid) {
      setCurrentTheme('system');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (!cancelled && profile?.preferences?.theme) {
          setCurrentTheme(profile.preferences.theme);
        }
      } catch (e) {
        if (!cancelled) console.error('ThemeProvider: could not load theme', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const setTheme = useCallback(
    (theme: ThemePreference) => {
      setCurrentTheme(theme);
      if (user?.uid) {
        updateUserProfile(user.uid, { preferences: { theme } }).catch((e) =>
          console.warn('ThemeProvider: could not persist theme', e)
        );
      }
    },
    [user?.uid]
  );

  const value: ThemeContextType = useMemo(
    () => ({
      currentTheme,
      setTheme,
      colors,
      colorScheme,
      isLoading,
    }),
    [currentTheme, setTheme, colors, colorScheme, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
