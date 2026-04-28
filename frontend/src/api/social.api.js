// frontend/src/api/social.api.js
// Stage 7 — Household & Challenge API calls

import api from './axios';

// ══════════════════════════════════════════════
//  HOUSEHOLD
// ══════════════════════════════════════════════

export const householdAPI = {
  /** Create household and invite a partner by email */
  create: (data) => api.post('/household', data),

  /** Accept an invite using the token */
  accept: (inviteToken) => api.post('/household/accept', { inviteToken }),

  /** Get the current user's household */
  get: () => api.get('/household'),

  /** Get combined spending dashboard */
  dashboard: (months = 1) => api.get(`/household/dashboard?months=${months}`),

  /** Update the shared budget */
  updateBudget: (data) => api.put('/household/budget', data),

  /** Unlink / dissolve the household */
  unlink: () => api.delete('/household'),
};

// ══════════════════════════════════════════════
//  CHALLENGES
// ══════════════════════════════════════════════

export const challengeAPI = {
  /** List challenges — params: { status, type, page, limit } */
  list: (params = {}) => api.get('/challenges', { params }),

  /** Get a single challenge */
  get: (id) => api.get(`/challenges/${id}`),

  /** Create a new challenge */
  create: (data) => api.post('/challenges', data),

  /** Update a challenge (creator only) */
  update: (id, data) => api.put(`/challenges/${id}`, data),

  /** Delete / cancel a challenge (creator only) */
  delete: (id) => api.delete(`/challenges/${id}`),

  /** Join a challenge */
  join: (id) => api.post(`/challenges/${id}/join`),

  /** Leave a challenge */
  leave: (id) => api.delete(`/challenges/${id}/leave`),

  /** Refresh my progress from transaction data */
  refreshProgress: (id) => api.post(`/challenges/${id}/progress`),

  /** Get the leaderboard for a challenge */
  leaderboard: (id) => api.get(`/challenges/${id}/leaderboard`),
};