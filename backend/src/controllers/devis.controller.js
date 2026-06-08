const mongoose = require('mongoose');
const axios = require('axios');

const Devis = require('../models/Devis.model');
const Projet = require('../models/Projet.model');
const { getPool } = require('../config/db.mysql');

const TAUX_EUR_FCFA = 655.957;

/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;

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

const normalizeStatut = (value) => {
  const statut = String(value || 'brouillon').toLowerCase();

  if (statut === 'validé') return 'valide';

  if (['brouillon', 'valide', 'archive'].includes(statut)) {
    return statut;
  }

  return 'brouillon';
};

const normalizeTauxFg = (value) => {
  const n = toNumber(value);

  if (n === 0) return 0.05;
  if (n > 1) return n / 100;

  return n;
};

/* =========================================================
   CALCULS
========================================================= */

const calculerDevis = (data) => {
  const quantite = toNumber(data.quantite);
  const puContratFcfaArrondi = toNumber(data.puContratFcfaArrondi);
  const puContratFcfaExact = toNumber(data.puContratFcfaExact);

  const montantFcfa = quantite * puContratFcfaArrondi;
  const montantEur = montantFcfa / TAUX_EUR_FCFA;

  const quantiteSite = toNumber(data.quantiteSite);

  const prixRevientEur =
    toNumber(data.prixRevientEur) ||
    toNumber(data.prixTotalEur) ||
    toNumber(data.prixEuro) ||
    0;

  const puSiteEur =
    quantiteSite > 0 ? prixRevientEur / quantiteSite : 0;

  const tauxFg = normalizeTauxFg(data.tauxFg);

  const margeBruteEur = montantEur - prixRevientEur;

  const fraisGestionEur = prixRevientEur * tauxFg;

  const margeNetteEur = margeBruteEur - fraisGestionEur;

  const margeNettePct =
    montantEur > 0 ? (margeNetteEur / montantEur) * 100 : 0;

  return {
    ...data,

    quantite,
    puContratFcfaArrondi,
    puContratFcfaExact,

    montantFcfa,
    montantEur,

    quantiteSite,
    puSiteEur,
    prixRevientEur,

    tauxFg,
    fraisGestionEur,

    margeBruteEur,
    margeNetteEur,
    margeNettePct,

    statut: normalizeStatut(data.statut),
    anomalie: margeNettePct < 0
  };
};

/* =========================================================
   MYSQL -> FRONTEND
========================================================= */

const buildDiM3DevisData = async (projet = null) => {
  const pool = getPool();

  if (!pool) {
    throw new Error('Connexion MySQL non initialisée.');
  }

  const codeProjet = String(projet?.code_projet || 'DI-M3').toUpperCase();

  const [rows] = await pool.query(
    `
    SELECT
      CONCAT(
        f.id_personnel,
        '_',
        f.id_categorie,
        '_',
        f.code_projet
      ) AS ligne_id,

      f.code_projet,
      f.quantite_contrat,
      f.pu_contrat_fcfa,
      f.pu_contrat_exact,
      f.montant_fcfa,
      f.montant_eur,
      f.quantite_revient,
      f.pu_site,
      f.prix_total_eur,

      c.code_section,
      c.libelle_section,
      c.sous_categorie,

      p.designation,
      p.unite,
      p.sous_taches

    FROM fact_ligne_devis f

    LEFT JOIN dim_categorie c
      ON f.id_categorie = c.id_categorie

    LEFT JOIN dim_personnel p
      ON f.id_personnel = p.id_personnel

    WHERE f.code_projet = ?

    ORDER BY
      f.id_categorie,
      f.id_personnel
    `,
    [codeProjet]
  );

  return rows.map((row) => {
    const isSousCategorie =
      row.sous_taches && String(row.sous_taches).trim() !== '';

    const montantEur = toNumber(row.montant_eur);
    const prixRevientEur = toNumber(row.prix_total_eur);
    const tauxFg = isSousCategorie ? null : 0.05;

    const margeBruteEur = isSousCategorie
      ? null
      : montantEur - prixRevientEur;

    const fraisGestionEur = isSousCategorie
      ? null
      : prixRevientEur * 0.05;

    const margeNetteEur = isSousCategorie
      ? null
      : margeBruteEur - fraisGestionEur;

    const margeNettePct =
      !isSousCategorie && montantEur > 0
        ? (margeNetteEur / montantEur) * 100
        : null;

    return {
      _id: row.ligne_id,
      source: 'mysql',

      projet: projet?._id || null,
      code_projet: row.code_projet || codeProjet,

      section: row.code_section || '-',
      designation: row.libelle_section || '-',
      categorie: row.designation || '-',
      sousCategorie: isSousCategorie ? row.sous_taches : '-',
      unite: row.unite || '-',

      quantite: toNumber(row.quantite_contrat),
      puContratFcfaArrondi: toNumber(row.pu_contrat_fcfa),
      puContratFcfaExact: toNumber(row.pu_contrat_exact),

      montantFcfa: toNumber(row.montant_fcfa),
      montantEur,

      quantiteSite: toNumber(row.quantite_revient),
      puSiteEur: toNumber(row.pu_site),
      prixRevientEur,

      margeBruteEur,
      fraisGestionEur,
      tauxFg,

      margeNetteEur,
      margeNettePct,

      ligneType: isSousCategorie ? 'sous_categorie' : 'categorie',
      isParentLine: !isSousCategorie,
      hasSousCategories: false,

      statut: 'valide',
      anomalie: margeNettePct !== null && margeNettePct < 0
    };
  });
};

/* =========================================================
   GET ALL
========================================================= */

const getAllDevis = async (req, res) => {
  try {
    const { projet } = req.query;

    if (!projet) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner un projet.'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(projet)) {
      return res.status(400).json({
        success: false,
        message: 'Projet invalide.'
      });
    }

    const projetDoc = await Projet.findById(projet).lean();

    if (!projetDoc) {
      return res.status(404).json({
        success: false,
        message: 'Projet introuvable.'
      });
    }

    const codeProjet = String(projetDoc.code_projet || '').toUpperCase();

    if (codeProjet === 'DI-M3' || codeProjet === 'DI') {
      const lignesMySQL = await buildDiM3DevisData(projetDoc);

      const devisCrud = await Devis.find({
        projet: projetDoc._id
      })
        .sort({ createdAt: -1 })
        .lean();

      const devisCrudCalcules = devisCrud.map((ligne) =>
        calculerDevis({
          ...ligne,
          source: 'devis'
        })
      );

      const data = [...lignesMySQL, ...devisCrudCalcules];

      return res.json({
        success: true,
        count: data.length,
        data
      });
    }

    const devisProjet = await Devis.find({
      projet: projetDoc._id
    })
      .sort({ createdAt: -1 })
      .lean();

    const devisProjetCalcules = devisProjet.map((ligne) =>
      calculerDevis({
        ...ligne,
        source: 'devis'
      })
    );

    return res.json({
      success: true,
      count: devisProjetCalcules.length,
      data: devisProjetCalcules
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* =========================================================
   GET BY ID
========================================================= */

const getDevisById = async (req, res, next) => {
  try {
    const devis = await Devis.findById(req.params.id);

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Ligne introuvable'
      });
    }

    return res.json({
      success: true,
      data: devis
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   CREATE
========================================================= */

const createDevis = async (req, res, next) => {
  try {
    const data = calculerDevis(req.body);

    const devis = await Devis.create(data);

    return res.status(201).json({
      success: true,
      data: devis
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   UPDATE
========================================================= */

const updateDevis = async (req, res, next) => {
  try {
    const oldDevis = await Devis.findById(req.params.id).lean();

    if (!oldDevis) {
      return res.status(404).json({
        success: false,
        message: 'Ligne introuvable'
      });
    }

    const data = calculerDevis({
      ...oldDevis,
      ...req.body
    });

    const devis = await Devis.findByIdAndUpdate(req.params.id, data, {
      new: true
    });

    return res.json({
      success: true,
      data: devis
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   DELETE
========================================================= */

const deleteDevis = async (req, res, next) => {
  try {
    await Devis.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Ligne supprimée'
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   IA
========================================================= */

const analyseIA = async (req, res, next) => {
  try {
    const devis = await Devis.findById(req.params.id);

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Ligne introuvable'
      });
    }

    const iaUrl = process.env.IA_SERVICE_URL || 'http://localhost:8000';

    const iaResponse = await axios.post(`${iaUrl}/detect-anomaly`, {
      pu_fcfa: devis.puContratFcfaArrondi,
      quantite: devis.quantite,
      montant_fcfa: devis.montantFcfa
    });

    return res.json({
      success: true,
      data: iaResponse.data
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   EXPORTS
========================================================= */

const exportPDF = async (req, res) => {
  return res.json({
    success: true,
    message: 'Export PDF à implémenter'
  });
};

const exportExcel = async (req, res) => {
  return res.json({
    success: true,
    message: 'Export Excel à implémenter'
  });
};

module.exports = {
  getAllDevis,
  getDevisById,
  createDevis,
  updateDevis,
  deleteDevis,
  analyseIA,
  exportPDF,
  exportExcel,
  buildDiM3DevisData
};