const axios = require('axios');
const { buildAllDevisData } = require('../controllers/devis.controller');

const IA_SERVICE_URL = process.env.IA_SERVICE_URL || 'http://localhost:8000';

const normalizeText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'string') {
    return (
      Number(
        value
          .replace(/\s/g, '')
          .replace(',', '.')
          .replace('%', '')
      ) || 0
    );
  }

  return Number(value) || 0;
};

const extractObjectId = (message) => {
  const match = String(message || '').match(/[a-fA-F0-9]{24}/);
  return match ? match[0] : null;
};

const extractSection = (message) => {
  const text = normalizeText(message);
  const match = text.match(/section\s*([a-d])/i);

  if (match) {
    return match[1].toUpperCase();
  }

  return null;
};

const detectIntent = (message) => {
  const text = normalizeText(message);

  if (
    text.includes('point faible') ||
    text.includes('points faibles') ||
    text.includes('faiblesse') ||
    text.includes('risque') ||
    text.includes('probleme') ||
    text.includes('problème') ||
    text.includes('anomalie')
  ) {
    return 'weakness';
  }

  if (
    text.includes('ameliorer') ||
    text.includes('améliorer') ||
    text.includes('optimiser') ||
    text.includes('optimisation') ||
    text.includes('propose') ||
    text.includes('recommande') ||
    text.includes('suggestion')
  ) {
    return 'optimization';
  }

  if (
    text.includes('marge') ||
    text.includes('rentabilite') ||
    text.includes('rentabilité') ||
    text.includes('rentable')
  ) {
    return 'margin';
  }

  if (
    text.includes('decision') ||
    text.includes('décision') ||
    text.includes('valider') ||
    text.includes('refuser') ||
    text.includes('reviser') ||
    text.includes('réviser')
  ) {
    return 'decision';
  }

  if (
    text.includes('compare') ||
    text.includes('comparaison') ||
    text.includes('section')
  ) {
    return 'comparison';
  }

  if (
    text.includes('dernier') ||
    text.includes('analyse') ||
    text.includes('resume') ||
    text.includes('résumé') ||
    text.includes('devis')
  ) {
    return 'analysis';
  }

  return 'general';
};

const normalizeLineForAI = (line) => {
  return {
    id: String(line._id || line.id || ''),
    _id: String(line._id || line.id || ''),

    source: line.source || 'devis',

    section: line.section || '-',
    designation: line.designation || '-',
    categorie: line.categorie || '-',
    sousCategorie: line.sousCategorie || '-',
    unite: line.unite || '-',

    quantite: toNumber(line.quantite),

    puContratFcfaArrondi: toNumber(line.puContratFcfaArrondi),
    puContratFcfaExact: toNumber(line.puContratFcfaExact),

    montantFcfa: toNumber(line.montantFcfa),
    montantEur: toNumber(line.montantEur),

    quantiteSite: toNumber(line.quantiteSite),
    puSiteEur: toNumber(line.puSiteEur),

    prixRevientEur: toNumber(line.prixRevientEur),
    margeBruteEur: toNumber(line.margeBruteEur),

    fraisGestionEur: toNumber(line.fraisGestionEur),
    tauxFg: toNumber(line.tauxFg),

    margeNetteEur: toNumber(line.margeNetteEur),
    margeNettePct: toNumber(line.margeNettePct),

    statut: line.statut || 'brouillon',

    createdAt: line.createdAt || null,
    updatedAt: line.updatedAt || null
  };
};

const filterContext = (allDevis, metadata) => {
  let result = allDevis.map(normalizeLineForAI);

  if (metadata.id) {
    result = result.filter((d) => {
      return d.id === metadata.id || d._id === metadata.id;
    });
  }

  if (metadata.section) {
    result = result.filter((d) => d.section === metadata.section);
  }

  if (metadata.intent === 'weakness') {
    result = result.sort((a, b) => {
      return a.margeNettePct - b.margeNettePct;
    });
  }

  if (metadata.intent === 'optimization') {
    result = result.sort((a, b) => {
      return a.margeNettePct - b.margeNettePct;
    });
  }

  if (metadata.intent === 'margin') {
    result = result.sort((a, b) => {
      return b.montantFcfa - a.montantFcfa;
    });
  }

  if (!metadata.id && !metadata.section) {
    result = result.filter((d) => {
      return d.quantite > 0 || d.montantFcfa > 0 || d.montantEur > 0;
    });
  }

  return result.slice(0, 50);
};

const askDevisAssistant = async (message) => {
  try {
    const metadata = {
      id: extractObjectId(message),
      section: extractSection(message),
      intent: detectIntent(message)
    };

    const allDevis = await buildAllDevisData();
    const dbContext = filterContext(allDevis, metadata);

    if (metadata.id && dbContext.length === 0) {
      return {
        response: `Je n'ai trouvé aucun devis avec l'ID ${metadata.id}. Vérifiez que l'ID existe dans la liste des devis.`
      };
    }

    const response = await axios.post(
      `${IA_SERVICE_URL}/chat`,
      {
        user_message: message,
        db_context: dbContext,
        metadata
      },
      {
        timeout: 20000
      }
    );

    return {
      response:
        response.data?.reply ||
        "Je n'ai pas pu générer une réponse claire."
    };
  } catch (error) {
    console.error('Erreur Assistant Service :', error.message);

    return {
      response:
        "Désolé, je n'arrive pas à analyser les devis pour le moment. Vérifiez que le backend et le service IA sont bien lancés."
    };
  }
};

module.exports = {
  askDevisAssistant
};