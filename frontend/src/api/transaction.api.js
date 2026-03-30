// frontend/src/api/transaction.api.js

import api from './axios';

const transactionAPI = {
  // Create
  create: (data) =>
    api.post('/transactions', data),

  // List with filters
  getAll: (params = {}) =>
    api.get('/transactions', { params }),

  // Single
  getOne: (id) =>
    api.get(`/transactions/${id}`),

  // Update
  update: (id, data) =>
    api.put(`/transactions/${id}`, data),

  // Delete
  remove: (id) =>
    api.delete(`/transactions/${id}`),

  // Summary (charts)
  getSummary: (params = {}) =>
    api.get('/transactions/summary', { params }),

  // Dashboard stats
  getStats: () =>
    api.get('/transactions/stats'),
};

export default transactionAPI;