const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Define Routes
router.post('/start', sessionController.startSession);
router.post('/:id/interview', sessionController.updateInterview);
router.post('/:id/game', sessionController.updateGame);
router.post('/:id/emotion', sessionController.updateEmotion);
router.post('/:id/complete', sessionController.completeSession);
router.get('/user/:userId/sessions', sessionController.getUserSessions);

module.exports = router;
