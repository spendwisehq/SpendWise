// frontend/src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authAPI from '../api/auth.api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate user from localStorage on mount (fast), then validate with server
  useEffect(() => {
    const savedUser = localStorage.getItem('spendwise_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('spendwise_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user: newUser } = response;
    // Token is set as httpOnly cookie by backend — not accessible in JS
    localStorage.setItem('spendwise_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (name, email, password, currency) => {
    const response = await authAPI.register({ name, email, password, currency, monthlyIncome: 0 });
    // Register returns { email, requiresVerification } — no user/token
    return response;
  }, []);

  const verifyOTP = useCallback(async (email, otp) => {
    const response = await authAPI.verifyOTP({ email, otp });
    const { user: newUser } = response;
    localStorage.setItem('spendwise_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('spendwise_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('spendwise_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      const freshUser = res.user;
      localStorage.setItem('spendwise_user', JSON.stringify(freshUser));
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
