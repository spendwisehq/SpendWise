// backend/src/routes/challenge.routes.js
// Stage 7 — Financial Challenges

const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');

const {
  createChallenge,
  getChallenges,
  getChallenge,
  joinChallenge,
  leaveChallenge,
  refreshProgress,
  getLeaderboard,
  updateChallenge,
  deleteChallenge,
} = require('../controllers/challenge.controller');

// Collection routes
router.get('/',   protect, getChallenges);
router.post('/',  protect, createChallenge);

// Item routes
router.get('/:id',    protect, getChallenge);
router.put('/:id',    protect, updateChallenge);
router.delete('/:id', protect, deleteChallenge);

// Participant actions
router.post('/:id/join',       protect, joinChallenge);
router.delete('/:id/leave',    protect, leaveChallenge);
router.post('/:id/progress',   protect, refreshProgress);
router.get('/:id/leaderboard', protect, getLeaderboard);

module.exports = router;