const axios = require('axios');

const IA_SERVICE_URL = process.env.IA_SERVICE_URL || 'http://localhost:8000';

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

exports.detectAnomaly = async (data) => {
  const pu = toNumber(data.pu_fcfa);
  const quantite = toNumber(data.quantite, 1);
  const montant = toNumber(data.montant_fcfa);

  const response = await axios.post(`${IA_SERVICE_URL}/detect-anomaly`, {
    pu_fcfa: pu,
    quantite,
    montant_fcfa: montant,
    code_projet: data.code_projet || 'ALL'
  });

  const result = response.data || {};

  if (pu > 10000000) {
    return {
      ...result,
      anomalie: true,
      message: 'PU FCFA anormalement élevé selon la règle métier.',
      score: result.score || 1,
      source_decision: 'regle_metier'
    };
  }

  return {
    ...result,
    source_decision: 'modele_ia'
  };
};

exports.riskScore = async (data) => {
  const pu = toNumber(data.pu_fcfa);
  const quantite = toNumber(data.quantite, 1);
  const montant = pu * quantite;

  const prixRevient = toNumber(data.prix_revient_fcfa);
  const fraisGestionPct = toNumber(data.frais_gestion_pct, 5);
  const margeNettePct = toNumber(data.marge_nette_pct);
  const categorieCode = toNumber(data.categorie_code, 1);

  let score = 0;
  const causes = [];
  const recommandations = [];

  if (pu > 10000000) {
    score += 35;
    causes.push('PU FCFA supérieur au seuil métier de 10 000 000 FCFA.');
    recommandations.push('Vérifier la justification du prix unitaire.');
  }

  if (montant > 0 && prixRevient > 0) {
    const ratioRevient = (prixRevient / montant) * 100;

    if (ratioRevient >= 90) {
      score += 30;
      causes.push(`Le prix de revient représente ${ratioRevient.toFixed(2)}% du montant.`);
      recommandations.push('Revoir le prix de revient ou augmenter la marge.');
    } else if (ratioRevient >= 75) {
      score += 20;
      causes.push(`Le prix de revient est élevé : ${ratioRevient.toFixed(2)}% du montant.`);
    }
  }

  if (margeNettePct <= 0) {
    score += 25;
    causes.push('Marge nette nulle ou négative.');
    recommandations.push('Corriger le PU contrat ou réduire les coûts.');
  } else if (margeNettePct < 5) {
    score += 15;
    causes.push('Marge nette faible.');
    recommandations.push('Vérifier la rentabilité du poste.');
  }

  if (fraisGestionPct > 10) {
    score += 10;
    causes.push('Frais de gestion élevés.');
    recommandations.push('Vérifier le taux de frais de gestion.');
  }

  score = Math.min(score, 100);

  let niveau = 'Faible';
  let decision = 'Valider';

  if (score >= 70) {
    niveau = 'Élevé';
    decision = 'À revoir avant validation';
  } else if (score >= 40) {
    niveau = 'Moyen';
    decision = 'Valider avec prudence';
  }

  return {
    score,
    niveau,
    decision,
    causes,
    recommandations,
    categorie_code: categorieCode
  };
};

exports.suggestValues = async (data) => {
  const response = await axios.post(`${IA_SERVICE_URL}/suggest-values`, {
    quantite: toNumber(data.quantite, 1),
    prix_revient_fcfa: toNumber(data.prix_revient_fcfa),
    categorie_code: toNumber(data.categorie_code, 1),
    code_projet: data.code_projet || 'ALL'
  });

  return response.data;
};

exports.predictMargin = async (data) => {
  const pu = toNumber(data.pu_fcfa);
  const quantite = toNumber(data.quantite, 1);
  const prixRevient = toNumber(data.prix_revient_fcfa);
  const fraisGestionPct = toNumber(data.frais_gestion_pct, 5);
  const categorieCode = toNumber(data.categorie_code, 1);

  const montant = pu * quantite;
  const fraisGestion = prixRevient * (fraisGestionPct / 100);
  const margeNette = montant - prixRevient - fraisGestion;

  const margeNettePct =
    montant > 0 ? (margeNette / montant) * 100 : 0;

  const response = await axios.post(`${IA_SERVICE_URL}/predict-margin`, {
    pu_fcfa: pu,
    quantite,
    prix_revient_fcfa: prixRevient,
    frais_gestion_pct: fraisGestionPct,
    categorie_code: categorieCode,
    code_projet: data.code_projet || 'ALL'
  });

  const iaResult = response.data || {};

  let niveau = 'Bonne';
  let decision = 'Valider';
  let message = 'La marge prédite est correcte.';

  if (margeNettePct < 0) {
    niveau = 'Déficitaire';
    decision = 'Réviser avant validation';
    message = 'La marge nette calculée est négative. Le devis présente un risque financier.';
  } else if (margeNettePct < 5) {
    niveau = 'Faible';
    decision = 'Valider avec prudence';
    message = 'La marge nette est positive mais très faible. Le devis doit être vérifié.';
  } else if (margeNettePct < 10) {
    niveau = 'Acceptable';
    decision = 'Valider avec suivi';
    message = 'La marge nette est acceptable mais reste à surveiller.';
  }

  return {
    ...iaResult,
    marge_predite_pct: Number(margeNettePct.toFixed(2)),
    niveau,
    decision,
    message,
    score_confiance:
      iaResult.score_confiance ??
      iaResult.score_confiance_pct ??
      iaResult.confidence ??
      85,
    source_decision: 'regle_metier_et_ia'
  };
};