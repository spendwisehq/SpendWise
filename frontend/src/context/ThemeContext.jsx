// frontend/src/context/ThemeContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Read from localStorage on first render — same key as index.html script
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('sw_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    // Keep DOM attribute in sync with state
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('sw_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () =>
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};