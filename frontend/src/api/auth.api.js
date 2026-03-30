// frontend/src/api/auth.api.js

import api from './axios';

const authAPI = {
  register: (data) =>
    api.post('/auth/register', data),

  login: (data) =>
    api.post('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  getMe: () =>
    api.get('/auth/me'),

  updateProfile: (data) =>
    api.put('/auth/profile', data),

  changePassword: (data) =>
    api.put('/auth/change-password', data),

  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),
};

export default authAPI;