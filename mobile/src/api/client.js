// mobile/src/api/client.js
// Axios instance adapted for React Native — Bearer tokens via SecureStore

import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In dev, use your machine's LAN IP (not localhost — the device can't reach it).
// Find it with: ifconfig | grep "inet " | grep -v 127.0.0.1
const BASE_URL = __DEV__
  ? 'http://192.168.1.33:5000/api'   // ← Update this to your LAN IP - I have done it
  : 'https://api.spendwise.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Logout callback ────────────────────────────────────────────────────────────
// AuthContext registers a callback so the interceptor can force-logout
// without creating a circular import with navigation/context.
let _logoutCallback = null;
export const setLogoutCallback = (fn) => { _logoutCallback = fn; };

const forceLogout = async () => {
  await clearTokens();
  await AsyncStorage.removeItem('spendwise_user');
  if (_logoutCallback) _logoutCallback();
};

// ── Request interceptor — attach Bearer token ─────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Refresh token queue ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

// ── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failing request IS the refresh endpoint
      if (originalRequest.url?.includes('/auth/refresh')) {
        await forceLogout();
        const err = new Error('Session expired. Please login again.');
        err.status = 401;
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        // Send refresh token in body (backend supports req.body?.refreshToken)
        const response = await api.post('/auth/refresh', { refreshToken });
        // Store new tokens from response body
        await setTokens(response.data.accessToken, response.data.refreshToken);
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        await forceLogout();
        const err = new Error('Session expired. Please login again.');
        err.status = 401;
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    const err = new Error(message);
    err.status = error.response?.status;
    return Promise.reject(err);
  }
);

export default api;
