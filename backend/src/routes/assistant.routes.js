const express = require('express');
const router = express.Router();

const assistantController = require('../controllers/assistant.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/chat', protect, assistantController.chatWithAssistant);

module.exports = router;