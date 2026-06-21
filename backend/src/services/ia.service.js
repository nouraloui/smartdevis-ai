const axios = require('axios');

const IA_SERVICE_URL = process.env.IA_SERVICE_URL || 'http://localhost:8000';

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/* =========================================================
   MODULE 1 - DÉTECTION D'ANOMALIE
========================================================= */

exports.detectAnomaly = async (data) => {
  const pu = toNumber(data.pu_fcfa);
  const quantite = toNumber(data.quantite, 1);
  const montant = toNumber(data.montant_fcfa, pu * quantite);

  const payload = {
    pu_fcfa: pu,
    quantite,
    montant_fcfa: montant,
    prix_revient_fcfa: toNumber(data.prix_revient_fcfa),
    frais_gestion_pct: toNumber(data.frais_gestion_pct, 5),
    marge_nette_pct: toNumber(data.marge_nette_pct),
    code_categorie: toNumber(data.code_categorie || data.categorie_code, 1),
    categorie_code: toNumber(data.categorie_code || data.code_categorie, 1),
    code_projet: data.code_projet || 'ALL'
  };

  try {
    const response = await axios.post(`${IA_SERVICE_URL}/detect-anomaly`, payload);

    const iaResult = response.data || {};

    /*
      RÈGLE MÉTIER SMARTDEVIS
      Même si le modèle IA dit "normal",
      on force une anomalie si le PU dépasse le seuil métier.
    */
    const seuilPu = 10000000;

    if (pu > seuilPu) {
      return {
        ...iaResult,
        anomalie: true,
        message: 'PU FCFA anormalement élevé selon la règle métier.',
        score: iaResult.score ?? 0.0021,
        score_ia_brut: iaResult.score ?? 0.0021,
        score_metier: 100,
        source: 'IA + règle métier',
        seuil_pu_fcfa: seuilPu,
        pu_fcfa: pu
      };
    }

    return {
      ...iaResult,
      anomalie: Boolean(iaResult.anomalie),
      message:
        iaResult.message ||
        `PU FCFA normal selon les références ${payload.code_projet}.`,
      score: iaResult.score ?? 0,
      score_ia_brut: iaResult.score ?? 0,
      score_metier: 0,
      source: iaResult.source || 'IA'
    };
  } catch (err) {
    console.error('Erreur IA detect-anomaly:', err.response?.data || err.message);
    throw err;
  }
};

/* =========================================================
   MODULE 2 - SCORE DE RISQUE
========================================================= */

exports.riskScore = async (data) => {
  const pu = toNumber(data.pu_fcfa);
  const quantite = toNumber(data.quantite, 1);
  const montant = toNumber(data.montant_fcfa, pu * quantite);

  const prixRevient = toNumber(data.prix_revient_fcfa);
  const fraisGestionPct = toNumber(data.frais_gestion_pct, 0);
  const margeNettePct = toNumber(data.marge_nette_pct);
  const categorieCode = toNumber(data.categorie_code || data.code_categorie, 1);
  const codeProjet = data.code_projet || 'ALL';

  let score = 0;
  const causes = [];
  const recommandations = [];

  /*
    MODULE 2 - SCORE DE RISQUE DYNAMIQUE

    Le score combine :
    - le prix unitaire,
    - le ratio prix de revient / montant,
    - la marge nette,
    - les frais de gestion,
    - la catégorie,
    - le projet.

    La logique est décisionnelle :
    une ligne peut ne pas être une anomalie technique,
    mais rester risquée si la marge est faible ou si les coûts sont élevés.
  */

  /*
    1) Risque lié au prix unitaire
  */
  if (pu > 10000000) {
    score += 35;
    causes.push('PU FCFA supérieur au seuil métier de 10 000 000 FCFA.');
    recommandations.push('Vérifier la justification du prix unitaire.');
  } else if (pu >= 7000000) {
    score += 15;
    causes.push('PU FCFA relativement élevé par rapport aux références du projet.');
    recommandations.push('Comparer ce PU avec les postes similaires du projet.');
  }

  /*
    2) Risque lié au prix de revient
    On compare le prix de revient au montant total.
  */
  let ratioRevient = 0;

  if (montant > 0 && prixRevient > 0) {
    ratioRevient = (prixRevient / montant) * 100;

    if (ratioRevient >= 90) {
      score += 30;
      causes.push(`Le prix de revient est élevé : ${ratioRevient.toFixed(2)}% du montant.`);
      recommandations.push('Contrôler les coûts directs du poste.');
    } else if (ratioRevient >= 75) {
      score += 20;
      causes.push(`Le prix de revient est important : ${ratioRevient.toFixed(2)}% du montant.`);
      recommandations.push('Vérifier la cohérence du prix de revient.');
    } else if (ratioRevient >= 60) {
      causes.push(`Le prix de revient représente ${ratioRevient.toFixed(2)}% du montant.`);
      recommandations.push('Surveiller les coûts directs du poste.');
    }
  }

  /*
    3) Risque lié à la marge nette
  */
  if (margeNettePct <= 0) {
    score += 25;
    causes.push('Marge nette nulle ou négative.');
    recommandations.push('Corriger le PU contrat ou réduire les coûts.');
  } else if (margeNettePct < 5) {
    score += 25;
    causes.push('Marge nette très faible.');
    recommandations.push('Revoir le PU contrat ou le prix de revient.');
  } else if (margeNettePct < 10) {
    score += 20;
    causes.push('Marge nette très faible.');
    recommandations.push('Revoir le PU contrat ou le prix de revient.');
  } else if (margeNettePct < 25) {
    score += 10;
    causes.push('Marge correcte mais inférieure au seuil de confort de 25%.');
    recommandations.push('Suivre les coûts site et frais de gestion.');
  }

  /*
    4) Frais de gestion
    Les frais de gestion sont analysés comme facteur de vigilance.
    On ne les ajoute pas toujours au score, sinon le cas normal devient trop pénalisé.
  */
  if (fraisGestionPct >= 20) {
    causes.push('Frais de gestion à surveiller.');
    recommandations.push(`Vérifier que le taux FG reste cohérent avec ${codeProjet}.`);
  } else if (fraisGestionPct >= 10) {
    causes.push('Frais de gestion modérés.');
    recommandations.push('Surveiller l’impact des frais de gestion sur la marge.');
  }

  /*
    5) Catégorie sensible
    Règle légère et adaptable selon ton dataset.
  */
  if (categorieCode >= 8) {
    score += 10;
    causes.push('Catégorie potentiellement sensible dans l’analyse du devis.');
    recommandations.push('Contrôler les références historiques de cette catégorie.');
  }

  /*
    Sécurité du score
  */
  score = Math.min(score, 100);

  /*
    Niveau et décision
  */
  let niveau = 'Faible';
  let decision = 'Validable';

  if (score >= 70) {
    niveau = 'Élevé';
    decision = 'À revoir avant validation';
  } else if (score >= 40) {
    niveau = 'Moyen';
    decision = 'Valider avec prudence';
  }

  if (causes.length === 0) {
    causes.push('Aucun facteur de risque significatif détecté.');
  }

  if (recommandations.length === 0) {
    recommandations.push('Aucune action corrective nécessaire.');
  }

  return {
    score,
    niveau,
    decision,
    causes,
    recommandations,
    pu_fcfa: pu,
    quantite,
    montant_fcfa: montant,
    prix_revient_fcfa: prixRevient,
    ratio_prix_revient_pct: Number(ratioRevient.toFixed(2)),
    frais_gestion_pct: fraisGestionPct,
    marge_nette_pct: margeNettePct,
    categorie_code: categorieCode,
    code_projet: codeProjet
  };
};

/* =========================================================
   MODULE 3 - SUGGESTION DES VALEURS
========================================================= */

exports.suggestValues = async (data) => {
  const payload = {
    quantite: toNumber(data.quantite, 1),
    prix_revient_fcfa: toNumber(data.prix_revient_fcfa),
    code_categorie: toNumber(data.code_categorie || data.categorie_code, 1),
    categorie_code: toNumber(data.categorie_code || data.code_categorie, 1),
    code_projet: data.code_projet || 'ALL'
  };

  try {
    const response = await axios.post(`${IA_SERVICE_URL}/suggest-values`, payload);
    return response.data;
  } catch (err) {
    console.error('Erreur IA suggest-values:', err.response?.data || err.message);
    throw err;
  }
};

/* =========================================================
   MODULE 4 - PRÉDICTION DE MARGE
========================================================= */

exports.predictMargin = async (data) => {
  const pu = toNumber(data.pu_fcfa);
  const quantite = toNumber(data.quantite, 1);
  const prixRevient = toNumber(data.prix_revient_fcfa);
  const fraisGestionPct = toNumber(data.frais_gestion_pct, 5);
  const categorieCode = toNumber(data.categorie_code || data.code_categorie, 1);

  const response = await axios.post(`${IA_SERVICE_URL}/predict-margin`, {
    pu_fcfa: pu,
    quantite,
    prix_revient_fcfa: prixRevient,
    frais_gestion_pct: fraisGestionPct,
    code_categorie: categorieCode,
    categorie_code: categorieCode,
    code_projet: data.code_projet || 'ALL'
  });

  return response.data;
};