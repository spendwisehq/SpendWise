// mobile/app/index.jsx — Entry redirect based on auth state
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import LoadingScreen from '../src/components/LoadingScreen';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
