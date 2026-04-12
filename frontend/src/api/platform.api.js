import api from './axios';

const platformAPI = {
  getDashboard: ()           => api.get('/platform/dashboard'),
  getTiers:     ()           => api.get('/platform/tiers'),

  listKeys:  ()              => api.get('/platform/keys'),
  createKey: (data)          => api.post('/platform/keys', data),
  revokeKey: (id)            => api.delete(`/platform/keys/${id}`),
  getUsage:  (id, params={}) => api.get(`/platform/keys/${id}/usage`, { params }),
};

export default platformAPI;
