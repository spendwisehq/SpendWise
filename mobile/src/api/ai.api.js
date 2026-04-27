// mobile/src/api/ai.api.js
import api from './client';

const aiAPI = {
  chat:       (data)        => api.post('/ai/chat',       data),
  analysis:   (params = {}) => api.get('/ai/analysis',    { params }),
  insights:   ()            => api.get('/ai/insights'),
  score:      ()            => api.get('/ai/score'),
  categorize: (data)        => api.post('/ai/categorize', data),
};

export default aiAPI;
