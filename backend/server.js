// backend/server.js
const path = require('path');
const fs = require('fs');

// Charge automatiquement le bon fichier .env
const envFile =
  process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '../.env')
    : path.resolve(__dirname, '.env.development');

if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
  console.log(`✅ Fichier env chargé : ${envFile}`);
} else {
  require('dotenv').config();
  console.log('⚠️ Aucun fichier env spécifique trouvé, chargement dotenv par défaut');
}

const app = require('./src/app');
const { connectMongo } = require('./src/config/db.mongo');
const { connectMySQL } = require('./src/config/db.mysql');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectMongo();
    await connectMySQL();

    app.listen(PORT, () => {
      console.log(`✅ SmartDevis Backend running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ MongoDB URI: ${process.env.MONGO_URI}`);
      console.log(`🤖 n8n Agent URL: ${process.env.N8N_WEBHOOK_URL || 'Non configuré'}`);
    });
  } catch (err) {
    console.error('❌ Erreur démarrage serveur:', err.message);
    process.exit(1);
  }
}

startServer();