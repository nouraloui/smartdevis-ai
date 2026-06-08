// backend/src/controllers/n8n-agent.controller.js
const {
  sendMessageToN8n,
  checkN8nConfig,
} = require('../services/n8n-agent.service');

exports.askN8nAgent = async (req, res, next) => {
  try {
    const { message, sessionId, context } = req.body;

    if (!message || message.trim() === '') {
      const error = new Error('Le message est obligatoire');
      error.statusCode = 400;
      throw error;
    }

    const result = await sendMessageToN8n({
      message: message.trim(),
      sessionId,
      context,
    });

    res.status(200).json({
      success: true,
      answer: result.answer,
      raw: result.raw,
    });
  } catch (err) {
    next(err);
  }
};

exports.getN8nAgentStatus = async (req, res, next) => {
  try {
    const config = checkN8nConfig();

    res.status(200).json({
      success: true,
      service: 'SmartDevis n8n Agent',
      configured: config.configured,
      webhookUrl: config.webhookUrl,
      message: config.configured
        ? 'Agent n8n configuré correctement'
        : 'N8N_WEBHOOK_URL non configuré',
    });
  } catch (err) {
    next(err);
  }
};