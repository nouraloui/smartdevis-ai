const assistantService = require('../services/assistant.service');

const chatWithAssistant = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le message est obligatoire.'
      });
    }

    const result = await assistantService.askDevisAssistant(message);

    return res.status(200).json({
      success: true,
      response: result.response
    });
  } catch (error) {
    console.error('Erreur Assistant IA Controller :', error.message);

    return res.status(500).json({
      success: false,
      message: "Erreur lors de la communication avec l'assistant IA.",
      error: error.message
    });
  }
};

module.exports = {
  chatWithAssistant
};