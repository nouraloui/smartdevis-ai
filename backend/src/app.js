// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorMiddleware } = require('./middlewares/error.middleware');

// Routes existantes
const authRoutes = require('./routes/auth.routes');
const devisRoutes = require('./routes/devis.routes');
const projetRoutes = require('./routes/projet.routes');
const iaRoutes = require('./routes/ia.routes');
const rapportRoutes = require('./routes/rapport.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');
const iaNlpRoutes = require('./routes/ia-nlp.routes');
const assistantRoutes = require('./routes/assistant.routes');

// Nouvelle route n8n
const n8nAgentRoutes = require('./routes/n8n-agent.routes');


const app = express();

// ── Sécurité ──────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://smartdevis-frontend.onrender.com',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:51231',
  'http://127.0.0.1:51231'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS non autorisé : ${origin}`));
  },
  credentials: true
}));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);

// ── Middlewares globaux ───────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes existantes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/projets', projetRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/ia-nlp', iaNlpRoutes);
app.use('/api/rapports', rapportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/assistant', assistantRoutes);

// ── Nouvelle route Agent IA n8n ───────────────────────────────
app.use('/api/n8n-agent', n8nAgentRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SmartDevis Backend is running',
    environment: process.env.NODE_ENV
  });
});



// ── Route 404 ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route introuvable'
  });
});

// ── Gestion des erreurs ───────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;