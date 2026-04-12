// frontend/src/App.jsx

import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider }  from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
// ⚠️ CSS imported ONCE here — nowhere else
import './styles/global.css';

const Login        = React.lazy(() => import('./pages/Login'));
const Register     = React.lazy(() => import('./pages/Register'));
const Dashboard    = React.lazy(() => import('./pages/Dashboard'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const Analytics    = React.lazy(() => import('./pages/Analytics'));
const Groups       = React.lazy(() => import('./pages/Groups'));
const Friends      = React.lazy(() => import('./pages/Friends'));
const Goals        = React.lazy(() => import('./pages/Goals'));
const AIAssistant  = React.lazy(() => import('./pages/AIAssistant'));
const Settings     = React.lazy(() => import('./pages/Settings'));
const NotFound     = React.lazy(() => import('./pages/NotFound'));
const AppLayout      = React.lazy(() => import('./components/layout/AppLayout'));
const ProtectedRoute = React.lazy(() => import('./components/common/ProtectedRoute'));

const LoadingScreen = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'var(--color-bg)',
    flexDirection: 'column', gap: '12px',
  }}>
    <div style={{
      width: 24, height: 24,
      border: '2.5px solid var(--color-border)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const App = () => {
  useEffect(() => {
    document.title = 'SpendWise — AI Finance';
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                },
                success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
                error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
              }}
            />
            <Routes>
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/"             element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard"    element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                  <Route path="/transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
                  <Route path="/analytics"    element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                  <Route path="/groups"       element={<ErrorBoundary><Groups /></ErrorBoundary>} />
                  <Route path="/friends"      element={<ErrorBoundary><Friends /></ErrorBoundary>} />
                  <Route path="/goals"        element={<ErrorBoundary><Goals /></ErrorBoundary>} />
                  <Route path="/ai-assistant" element={<ErrorBoundary><AIAssistant /></ErrorBoundary>} />
                  <Route path="/settings"     element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;