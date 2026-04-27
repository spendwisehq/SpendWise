// mobile/src/api/goal.api.js
import api from './client';

const goalAPI = {
  getAll:     ()          => api.get('/goals'),
  create:     (data)      => api.post('/goals', data),
  update:     (id, data)  => api.put(`/goals/${id}`, data),
  remove:     (id)        => api.delete(`/goals/${id}`),
  contribute: (id, data)  => api.post(`/goals/${id}/contribute`, data),
};

export default goalAPI;
