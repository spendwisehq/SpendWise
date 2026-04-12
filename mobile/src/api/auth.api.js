// mobile/src/api/auth.api.js
import api from './client';

const authAPI = {
  register:       (data) => api.post('/auth/register',       data).then(r => r.data),
  verifyOTP:      (data) => api.post('/auth/verify-otp',     data).then(r => r.data),
  resendOTP:      (data) => api.post('/auth/resend-otp',     data).then(r => r.data),
  login:          (data) => api.post('/auth/login',          data).then(r => r.data),
  logout:         ()     => api.post('/auth/logout'),
  refresh:        (data) => api.post('/auth/refresh',        data),  // sends refreshToken in body
  getMe:          ()     => api.get('/auth/me').then(r => r.data),
  updateProfile:  (data) => api.put('/auth/profile',         data).then(r => r.data),
  changePassword: (data) => api.put('/auth/change-password', data).then(r => r.data),
};

export default authAPI;
