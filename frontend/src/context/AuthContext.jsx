// frontend/src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authAPI from '../api/auth.api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('spendwise_token');
    const savedUser  = localStorage.getItem('spendwise_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('spendwise_token');
        localStorage.removeItem('spendwise_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await authAPI.login({ email, password });
    // Defensive: works whether backend returns { data: { user, accessToken } }
    // or flat { user, accessToken } — handles both shapes
    const payload     = response?.data ?? response;
    const newUser     = payload?.user;
    const accessToken = payload?.accessToken;
    if (!newUser || !accessToken) {
      throw new Error('Invalid response from server. Please try again.');
    }
    localStorage.setItem('spendwise_token', accessToken);
    localStorage.setItem('spendwise_user', JSON.stringify(newUser));
    setToken(accessToken);
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (name, email, password, currency, monthlyIncome) => {
    const response = await authAPI.register({ name, email, password, currency, monthlyIncome });
    const payload     = response?.data ?? response;
    const newUser     = payload?.user;
    const accessToken = payload?.accessToken;
    if (!newUser || !accessToken) {
      throw new Error('Registration failed. Please try again.');
    }
    localStorage.setItem('spendwise_token', accessToken);
    localStorage.setItem('spendwise_user', JSON.stringify(newUser));
    setToken(accessToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('spendwise_token');
    localStorage.removeItem('spendwise_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('spendwise_user', JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      isAuthenticated: Boolean(token && user),
      login, register, logout, updateUser,
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