// frontend/src/api/axios.js

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  withCredentials: true, // send httpOnly cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
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

    // If 401 and we haven't already retried, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failing request IS the refresh endpoint
      if (originalRequest.url?.includes('/auth/refresh')) {
        localStorage.removeItem('spendwise_user');
        window.location.href = '/login';
        const err = new Error('Session expired. Please login again.');
        err.status = 401;
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh'); // refresh token sent via cookie automatically
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('spendwise_user');
        window.location.href = '/login';
        const err = new Error('Session expired. Please login again.');
        err.status = 401;
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Build a proper Error object instead of a plain object
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
