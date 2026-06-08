// src/services/ia.service.js
const axios = require('axios');

class IAService {
    // ... tes fonctions existantes

    async askDevisAssistant(message) {
        try {
            // 1. Utiliser POST car ton FastAPI attend un POST
            // 2. Utiliser l'URL définie dans ton .env (port 8000)
            // 3. Envoyer le bon nom de champ : "user_message"
            const response = await axios.post('http://localhost:8000/chat', {
                user_message: message,
                db_context: [] // Tu pourras injecter tes données MySQL ici plus tard
            });

            // On retourne directement la réponse pour que le controller reçoive { reply: "..." }
            return response.data; 
        } catch (error) {
            console.error(" Erreur de liaison Node -> Python:", error.message);
            throw error;
        }
    }
}

module.exports = new IAService();