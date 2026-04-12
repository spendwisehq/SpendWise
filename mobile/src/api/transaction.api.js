// mobile/src/api/transaction.api.js
import api from './client';

const transactionAPI = {
  create: (data) =>
    api.post('/transactions', data),

  getAll: (params = {}) =>
    api.get('/transactions', { params }),

  getOne: (id) =>
    api.get(`/transactions/${id}`),

  update: (id, data) =>
    api.put(`/transactions/${id}`, data),

  remove: (id) =>
    api.delete(`/transactions/${id}`),

  getSummary: (params = {}) =>
    api.get('/transactions/summary', { params }),

  getStats: () =>
    api.get('/transactions/stats'),
};

export default transactionAPI;
