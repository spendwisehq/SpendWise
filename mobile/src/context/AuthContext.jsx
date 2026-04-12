// mobile/src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authAPI from '../api/auth.api';
import { setTokens, clearTokens } from '../utils/tokenStorage';
import { setLogoutCallback } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate user from AsyncStorage on mount (async, unlike web's sync localStorage)
  useEffect(() => {
    (async () => {
      try {
        const savedUser = await AsyncStorage.getItem('spendwise_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch {
        await AsyncStorage.removeItem('spendwise_user');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Register logout callback so the API client 401 interceptor can force-logout
  useEffect(() => {
    setLogoutCallback(() => {
      setUser(null);
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user: newUser, accessToken, refreshToken } = response;
    // Store tokens in SecureStore (encrypted)
    await setTokens(accessToken, refreshToken);
    // Cache user profile in AsyncStorage (non-sensitive display data)
    await AsyncStorage.setItem('spendwise_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (name, email, password, currency) => {
    const response = await authAPI.register({ name, email, password, currency, monthlyIncome: 0 });
    return response;
  }, []);

  const verifyOTP = useCallback(async (email, otp) => {
    const response = await authAPI.verifyOTP({ email, otp });
    const { user: newUser, accessToken, refreshToken } = response;
    await setTokens(accessToken, refreshToken);
    await AsyncStorage.setItem('spendwise_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    await clearTokens();
    await AsyncStorage.removeItem('spendwise_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedUser };
      AsyncStorage.setItem('spendwise_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      const freshUser = res.user;
      await AsyncStorage.setItem('spendwise_user', JSON.stringify(freshUser));
      setUser(freshUser);
      return freshUser;
    } catch { return null; }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading,
      isAuthenticated: Boolean(user),
      login, register, verifyOTP, logout, updateUser, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
