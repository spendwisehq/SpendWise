import api from './axios';

const notificationAPI = {
  subscribe:   (data) => api.post('/notifications/subscribe', data),
  unsubscribe: ()     => api.delete('/notifications/unsubscribe'),

  getBudgetAlerts:  () => api.get('/notifications/budget-alerts'),
  getWeeklySummary: () => api.get('/notifications/weekly-summary'),
  getAnomalyAlerts: () => api.get('/notifications/anomaly-alerts'),

  setBudget: (data)        => api.post('/notifications/budget', data),
  getBudget: (params = {}) => api.get('/notifications/budget', { params }),
};

export default notificationAPI;
