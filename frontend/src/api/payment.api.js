import api from './axios';

const paymentAPI = {
  createOrder:  (data)        => api.post('/payments/order', data),
  verify:       (data)        => api.post('/payments/verify', data),
  getHistory:   (params = {}) => api.get('/payments/history', { params }),
  budgetCheck:  (params = {}) => api.get('/payments/budget-check', { params }),
  getStats:     ()            => api.get('/payments/stats'),
};

export default paymentAPI;
