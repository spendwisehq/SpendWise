// mobile/src/api/friend.api.js
import api from './client';

const friendAPI = {
  getAll: ()       => api.get('/friend'),
  add:    (data)   => api.post('/friend', data),
  remove: (id)     => api.delete(`/friend/${id}`),
};

export default friendAPI;
