// mobile/app/_layout.jsx — Root layout: providers, splash screen, navigation
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AuthProvider } from '../src/context/AuthContext';
import { toastConfig } from '../src/components/ToastConfig';

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  useEffect(() => {
    // Hide splash after a short delay to let providers initialize
    const timer = setTimeout(() => SplashScreen.hideAsync(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="groups" options={{ presentation: 'card' }} />
            <Stack.Screen name="goals" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings" options={{ presentation: 'card' }} />
          </Stack>
          <Toast config={toastConfig} position="top" topOffset={60} />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
