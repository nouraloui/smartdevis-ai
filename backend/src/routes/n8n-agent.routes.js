// backend/src/routes/n8n-agent.routes.js
const express = require('express');
const router = express.Router();

const {
  askN8nAgent,
  getN8nAgentStatus,
} = require('../controllers/n8n-agent.controller');

router.get('/status', getN8nAgentStatus);

router.post('/ask', askN8nAgent);

module.exports = router;