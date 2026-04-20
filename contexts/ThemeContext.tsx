import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIGHT = {
  mode: 'light' as const,
  bg: '#F5F5F5',
  card: '#FFF',
  cardBorder: '#E0E0E0',
  text: '#333',
  textSecondary: '#666',
  textMuted: '#999',
  accent: '#2DAFE3',
  accentLight: '#E0F7FA',
  headerBg: '#FFF',
  tabBar: '#FFF',
  tabBorder: '#E0E0E0',
  inputBg: '#FFF',
  inputBorder: '#DDD',
  overlay: 'rgba(0,0,0,0.45)',
  modalBg: '#FFF',
  divider: '#F0F0F0',
};

const DARK = {
  mode: 'dark' as const,
  bg: '#121212',
  card: '#1E1E1E',
  cardBorder: '#2C2C2C',
  text: '#ECECEC',
  textSecondary: '#AAAAAA',
  textMuted: '#777',
  accent: '#2DAFE3',
  accentLight: '#1A2E3A',
  headerBg: '#1A1A1A',
  tabBar: '#1A1A1A',
  tabBorder: '#2C2C2C',
  inputBg: '#252525',
  inputBorder: '#3A3A3A',
  overlay: 'rgba(0,0,0,0.7)',
  modalBg: '#1E1E1E',
  divider: '#2C2C2C',
};

export type Theme = typeof LIGHT;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LIGHT,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then(val => {
      if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem('theme_mode', next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
