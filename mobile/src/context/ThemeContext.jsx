// mobile/src/context/ThemeContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../theme/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark'); // default until AsyncStorage loads

  // Hydrate saved theme preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('sw_theme');
        if (saved === 'light' || saved === 'dark') {
          setTheme(saved);
        }
      } catch {}
    })();
  }, []);

  // Persist theme changes
  useEffect(() => {
    AsyncStorage.setItem('sw_theme', theme).catch(() => {});
  }, [theme]);

  const toggleTheme = () =>
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const colors = getThemeColors(theme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
