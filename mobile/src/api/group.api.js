// mobile/src/api/group.api.js
import api from './client';

const groupAPI = {
  getAll:       ()           => api.get('/groups'),
  getOne:       (id)         => api.get(`/groups/${id}`),
  create:       (data)       => api.post('/groups', data),
  update:       (id, data)   => api.put(`/groups/${id}`, data),
  addMember:    (id, data)   => api.post(`/groups/${id}/members`, data),
  removeMember: (id, memId)  => api.delete(`/groups/${id}/members/${memId}`),
  addExpense:   (id, data)   => api.post(`/groups/${id}/expenses`, data),
  getBalances:  (id)         => api.get(`/groups/${id}/balances`),
  settle:       (id, data)   => api.post(`/groups/${id}/settle`, data),
};

export default groupAPI;
