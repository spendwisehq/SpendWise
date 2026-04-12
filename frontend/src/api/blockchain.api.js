import api from './axios';

const blockchainAPI = {
  auditOne:        (transactionId) => api.post(`/blockchain/audit/${transactionId}`),
  auditAll:        ()              => api.post('/blockchain/audit-all'),

  verifyOne:       (transactionId) => api.get(`/blockchain/verify/${transactionId}`),
  verifyFullChain: ()              => api.get('/blockchain/verify-chain'),

  getTrail:  (params = {}) => api.get('/blockchain/trail', { params }),
  getStats:  ()            => api.get('/blockchain/stats'),
  getProof:  (transactionId) => api.get(`/blockchain/proof/${transactionId}`),
};

export default blockchainAPI;
