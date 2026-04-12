import api from './axios';

const groupAPI = {
  getAll:  (params = {}) => api.get('/groups', { params }),
  getOne:  (id)          => api.get(`/groups/${id}`),
  create:  (data)        => api.post('/groups', data),
  update:  (id, data)    => api.put(`/groups/${id}`, data),
  remove:  (id)          => api.delete(`/groups/${id}`),

  addMember:    (id, data)     => api.post(`/groups/${id}/members`, data),
  removeMember: (id, memberId) => api.delete(`/groups/${id}/members/${memberId}`),

  createSplit:  (groupId, data)        => api.post(`/groups/${groupId}/splits`, data),
  getSplits:    (groupId, params = {}) => api.get(`/groups/${groupId}/splits`, { params }),
  getBalances:  (groupId)              => api.get(`/groups/${groupId}/balances`),
  getAnalytics: (groupId)              => api.get(`/groups/${groupId}/analytics`),
  settleSplit:  (groupId, splitId)     => api.put(`/groups/${groupId}/splits/${splitId}/settle`),
  settleAll:    (groupId)              => api.post(`/groups/${groupId}/settle-all`),
};

export default groupAPI;
