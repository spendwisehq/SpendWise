import api from './axios';

const automationAPI = {
  getSMSStatus:      ()     => api.get('/automation/sms/status'),
  toggleSMSTracking: (data) => api.put('/automation/sms/toggle', data),
  parseSMS:          (data) => api.post('/automation/sms/parse', data),
  createFromSMS:     (data) => api.post('/automation/sms/create', data),

  uploadReceipt: (formData) =>
    api.post('/automation/ocr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createFromOCR: (data) => api.post('/automation/ocr/create', data),
};

export default automationAPI;
