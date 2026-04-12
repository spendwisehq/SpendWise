import api from './axios';

const aiAPI = {
  categorize:      (data) => api.post('/ai/categorize', data),
  categorizeBatch: (data) => api.post('/ai/categorize-batch', data),

  getAnalysis:        (params = {}) => api.get('/ai/analysis', { params }),
  getInsights:        (params = {}) => api.get('/ai/insights', { params }),
  getRecommendations: (params = {}) => api.get('/ai/recommendations', { params }),
  getScore:           ()            => api.get('/ai/score'),

  chat:       (data) => api.post('/ai/chat', data),
  chatStream: (data) =>
    fetch(`${import.meta.env.VITE_API_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    }),
};

export default aiAPI;
