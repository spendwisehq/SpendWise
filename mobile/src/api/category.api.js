// mobile/src/api/category.api.js
import api from './client';

const categoryAPI = {
  getAll: (params = {}) =>
    api.get('/categories', { params }),

  create: (data) =>
    api.post('/categories', data),

  update: (id, data) =>
    api.put(`/categories/${id}`, data),

  remove: (id) =>
    api.delete(`/categories/${id}`),
};

export default categoryAPI;
