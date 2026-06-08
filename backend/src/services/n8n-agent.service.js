const axios = require('axios');

const getN8nWebhookUrl = () => {
  return process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/devis-agent';
};

exports.sendMessageToN8n = async ({ message, sessionId, context }) => {

  const N8N_WEBHOOK_URL = getN8nWebhookUrl();

  console.log('🤖 URL n8n utilisée:', N8N_WEBHOOK_URL);

  if (!N8N_WEBHOOK_URL) {
    const error = new Error(
      'N8N_WEBHOOK_URL n’est pas défini dans le fichier .env'
    );
    error.statusCode = 500;
    throw error;
  }

  try {

    const response = await axios.post(
      N8N_WEBHOOK_URL,
      {
        message,
        sessionId: sessionId || 'smartdevis-session',
        context: context || {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 300000,
      }
    );

    const data = response.data;

    return {
      answer:
        data.answer ||
        data.output ||
        data.text ||
        data.response ||
        data.message ||
        'Aucune réponse reçue depuis l’agent IA.',

      raw: data,
    };

  } catch (err) {

    console.error('❌ Erreur appel n8n:', err.message);

    // n8n inaccessible
    if (err.code === 'ECONNREFUSED') {
      const error = new Error(
        'Impossible de se connecter à n8n. Vérifie que le conteneur n8n est lancé.'
      );

      error.statusCode = 503;
      throw error;
    }

    // timeout
    if (
      err.code === 'ETIMEDOUT' ||
      err.code === 'ECONNABORTED'
    ) {
      const error = new Error(
        'Le workflow n8n a pris trop de temps à répondre.'
      );

      error.statusCode = 504;
      throw error;
    }

    // erreur HTTP n8n
    if (err.response) {
      const error = new Error(
        `Erreur n8n ${err.response.status}: ${JSON.stringify(err.response.data)}`
      );

      error.statusCode = err.response.status;
      throw error;
    }

    // erreur générique
    const error = new Error(
      `Erreur lors de l’appel au workflow n8n: ${err.message}`
    );

    error.statusCode = 500;
    throw error;
  }
};

exports.checkN8nConfig = () => {

  const N8N_WEBHOOK_URL = getN8nWebhookUrl();

  return {
    configured: !!N8N_WEBHOOK_URL,
    webhookUrl: N8N_WEBHOOK_URL,
  };
};