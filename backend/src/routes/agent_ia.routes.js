// src/services/ia.service.js
const axios = require('axios');
const Devis = require('../models/devis.model'); // Ton modèle MySQL
const mongoose = require('mongoose'); // Pour MongoDB (ex: historique)

const askDevisAssistant = async (message) => {
    try {
        // 1. Extraction de données MySQL (Ex: derniers devis pour contexte)
        // On récupère les 5 derniers devis pour que l'IA sache de quoi on parle
        const recentDevis = await Devis.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
        
        // 2. Formatage du contexte pour l'IA
        const context = recentDevis.map(d => ({
            client: d.client_name,
            montant: d.total_ht,
            statut: d.status
        }));

        // 3. Appel au service IA (FastAPI sur le port 8000 selon ton .env)
        const response = await axios.post('http://localhost:8000/chat', {
            user_message: message,
            db_context: context
        });

        // 4. (Optionnel) Sauvegarder la conversation dans MongoDB
        // const ChatLog = mongoose.model('ChatLog');
        // await ChatLog.create({ message, response: response.data.reply });

        return { response: response.data.reply };
    } catch (error) {
        console.error("Erreur Data/IA Service:", error.message);
        throw error;
    }
};

module.exports = { askDevisAssistant };