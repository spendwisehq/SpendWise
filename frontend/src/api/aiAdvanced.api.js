import api from './axios';

const aiAdvancedAPI = {
  predictBudget:       (params = {}) => api.get('/ai/advanced/predict-budget', { params }),
  detectAnomalies:     (params = {}) => api.get('/ai/advanced/anomalies', { params }),
  detectSubscriptions: (params = {}) => api.get('/ai/advanced/subscriptions', { params }),
  listSubscriptions:   ()            => api.get('/ai/advanced/subscriptions/list'),
  getForecast:         (params = {}) => api.get('/ai/advanced/forecast', { params }),
  getScoreHistory:     (params = {}) => api.get('/ai/advanced/score-history', { params }),
};

export default aiAdvancedAPI;
