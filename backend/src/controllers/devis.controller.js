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

const normalizePhase = (value) => {
  const phase = String(value || 'phase2').toLowerCase();

  if (phase === 'phase1') return 'phase1';

  return 'phase2';
};

const isMysqlSyntheticId = (id) => {
  return (
    String(id || '').startsWith('phase1_') ||
    String(id || '').startsWith('phase2_')
  );
};

const parseMysqlSyntheticId = (id) => {
  const parts = String(id).split('_');

  const phase = parts[0];
  const idPersonnel = parts[1];
  const idCategorie = parts[2];
  const codeProjet = parts.slice(3).join('_');

  if (
    !['phase1', 'phase2'].includes(phase) ||
    !idPersonnel ||
    !idCategorie ||
    !codeProjet
  ) {
    throw new Error('Identifiant MySQL invalide.');
  }

  return {
    phase,
    idPersonnel,
    idCategorie,
    codeProjet
  };
};

/* =========================================================
   CALCULS PHASE 1
========================================================= */

const calculerDevisPhase1 = (data) => {
  const quantite = toNumber(data.quantite);
  const quantiteSite = toNumber(data.quantiteSite);

  const prixRevientEur =
    toNumber(data.prixRevientEur) ||
    toNumber(data.prixEuro) ||
    toNumber(data.prixTotalEur) ||
    0;

  const coefficientContrat = toNumber(data.coefficientContrat) || 1.5;

  const puSiteEur =
    quantiteSite > 0 ? prixRevientEur / quantiteSite : 0;

  const puContratFcfaExact =
    puSiteEur * TAUX_EUR_FCFA * coefficientContrat;

  const puContratFcfaArrondi =
    puContratFcfaExact > 0
      ? Math.ceil(puContratFcfaExact / 1000) * 1000
      : 0;

  const montantFcfa = quantite * puContratFcfaArrondi;
  const montantEur = montantFcfa / TAUX_EUR_FCFA;

  const tauxFg = normalizeTauxFg(data.tauxFg);

  const margeBruteEur = montantEur - prixRevientEur;
  const fraisGestionEur = prixRevientEur * tauxFg;
  const margeNetteEur = margeBruteEur - fraisGestionEur;

  const margeNettePct =
    montantEur > 0 ? (margeNetteEur / montantEur) * 100 : 0;

  return {
    ...data,

    phase: 'phase1',

    quantite,
    quantiteSite,

    prixRevientEur,
    puSiteEur,

    coefficientContrat,

    puContratFcfaArrondi,
    puContratFcfaExact,

    montantFcfa,
    montantEur,

    tauxFg,
    fraisGestionEur,

    margeBruteEur,
    margeNetteEur,
    margeNettePct,

    tauxEurFcfa: TAUX_EUR_FCFA,

    statut: normalizeStatut(data.statut),
    anomalie: margeNettePct < 0
  };
};

/* =========================================================
   CALCULS PHASE 2
========================================================= */

const calculerDevisPhase2 = (data) => {
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

    phase: 'phase2',

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

    tauxEurFcfa: TAUX_EUR_FCFA,

    statut: normalizeStatut(data.statut),
    anomalie: margeNettePct < 0
  };
};

const calculerDevis = (data) => {
  const phase = normalizePhase(data.phase);

  if (phase === 'phase1') {
    return calculerDevisPhase1(data);
  }

  return calculerDevisPhase2(data);
};

/* =========================================================
   MYSQL MAPPING
========================================================= */

const mapMySqlRowToDevis = (row, projet = null, selectedPhase = 'phase2') => {
  const phase = row.phase || selectedPhase;

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

    phase,

    projet: projet?._id || null,
    code_projet: row.code_projet || 'DI-M3',

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
};

/* =========================================================
   MYSQL -> FRONTEND
========================================================= */

const buildDiM3DevisData = async (projet = null, phase = 'phase2') => {
  const pool = getPool();

  if (!pool) {
    throw new Error('Connexion MySQL non initialisée.');
  }

  const selectedPhase = normalizePhase(phase);
  const codeProjet = String(projet?.code_projet || 'DI-M3').toUpperCase();

  const [rows] = await pool.query(
    `
    SELECT
      CONCAT(
        COALESCE(f.phase, 'phase2'),
        '_',
        f.id_personnel,
        '_',
        f.id_categorie,
        '_',
        f.code_projet
      ) AS ligne_id,

      f.code_projet,
      COALESCE(f.phase, 'phase2') AS phase,

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
    AND COALESCE(f.phase, 'phase2') = ?

    ORDER BY
      f.id_categorie,
      f.id_personnel
    `,
    [codeProjet, selectedPhase]
  );

  return rows.map((row) => mapMySqlRowToDevis(row, projet, selectedPhase));
};

/* =========================================================
   GET MYSQL BY SYNTHETIC ID
========================================================= */

const getMySqlDevisBySyntheticId = async (syntheticId) => {
  const pool = getPool();

  if (!pool) {
    throw new Error('Connexion MySQL non initialisée.');
  }

  const { phase, idPersonnel, idCategorie, codeProjet } =
    parseMysqlSyntheticId(syntheticId);

  const [rows] = await pool.query(
    `
    SELECT
      CONCAT(
        COALESCE(f.phase, 'phase2'),
        '_',
        f.id_personnel,
        '_',
        f.id_categorie,
        '_',
        f.code_projet
      ) AS ligne_id,

      f.code_projet,
      COALESCE(f.phase, 'phase2') AS phase,

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
    AND COALESCE(f.phase, 'phase2') = ?
    AND f.id_personnel = ?
    AND f.id_categorie = ?

    LIMIT 1
    `,
    [codeProjet, phase, idPersonnel, idCategorie]
  );

  if (!rows.length) {
    return null;
  }

  return mapMySqlRowToDevis(rows[0], null, phase);
};

/* =========================================================
   GET ALL
========================================================= */

const getAllDevis = async (req, res) => {
  try {
    const { projet, phase } = req.query;

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

    const selectedPhase = normalizePhase(phase);
    const codeProjet = String(projetDoc.code_projet || '').toUpperCase();

    if (codeProjet === 'DI-M3' || codeProjet === 'DI') {
      const lignesMySQL = await buildDiM3DevisData(projetDoc, selectedPhase);

      const devisCrud = await Devis.find({
        projet: projetDoc._id,
        phase: selectedPhase
      })
        .sort({ createdAt: 1 })
        .lean();

      const devisCrudCalcules = devisCrud.map((ligne) => {
        const ligneObj = {
          ...ligne,
          _id: String(ligne._id),
          source: 'devis',

          /*
            IMPORTANT :
            Une ligne créée depuis l'application doit rester une ligne calculable.
            Même si elle contient une sous-catégorie, on ne la considère PAS
            comme une ligne enfant Excel.
          */
          ligneType: 'categorie',
          isParentLine: true,
          hasSousCategories: false
        };

        if (selectedPhase === 'phase1') {
          return calculerDevisPhase1(ligneObj);
        }

        return calculerDevisPhase2(ligneObj);
      });

      const data = [...lignesMySQL, ...devisCrudCalcules];

      return res.json({
        success: true,
        phase: selectedPhase,
        count: data.length,
        data
      });
    }

    const devisProjet = await Devis.find({
      projet: projetDoc._id,
      phase: selectedPhase
    })
      .sort({ createdAt: 1 })
      .lean();

    const devisProjetCalcules = devisProjet.map((ligne) => {
      const ligneObj = {
        ...ligne,
        _id: String(ligne._id),
        source: 'devis',

        /*
          Même règle pour les autres projets :
          les lignes CRUD sont toujours des lignes calculables.
        */
        ligneType: 'categorie',
        isParentLine: true,
        hasSousCategories: false
      };

      if (selectedPhase === 'phase1') {
        return calculerDevisPhase1(ligneObj);
      }

      return calculerDevisPhase2(ligneObj);
    });

    return res.json({
      success: true,
      phase: selectedPhase,
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
    const id = req.params.id;

    if (isMysqlSyntheticId(id)) {
      const mysqlDevis = await getMySqlDevisBySyntheticId(id);

      if (!mysqlDevis) {
        return res.status(404).json({
          success: false,
          message: 'Ligne MySQL introuvable'
        });
      }

      return res.json({
        success: true,
        data: mysqlDevis
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant invalide.'
      });
    }

    const devis = await Devis.findById(id);

    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Ligne introuvable'
      });
    }

    const devisCalcule = calculerDevis({
      ...devis.toObject(),
      source: 'devis',
      ligneType: 'categorie',
      isParentLine: true,
      hasSousCategories: false
    });

    return res.json({
      success: true,
      data: devisCalcule
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
    const data = calculerDevis({
      ...req.body,
      source: 'devis',
      ligneType: 'categorie',
      isParentLine: true,
      hasSousCategories: false
    });

    const devis = await Devis.create(data);

    const devisCalcule = calculerDevis({
      ...devis.toObject(),
      source: 'devis',
      ligneType: 'categorie',
      isParentLine: true,
      hasSousCategories: false
    });

    return res.status(201).json({
      success: true,
      data: devisCalcule
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
    const id = req.params.id;

    if (isMysqlSyntheticId(id)) {
      const { phase, idPersonnel, idCategorie, codeProjet } =
        parseMysqlSyntheticId(id);

      const pool = getPool();

      if (!pool) {
        throw new Error('Connexion MySQL non initialisée.');
      }

      const data =
        phase === 'phase1'
          ? calculerDevisPhase1({
              ...req.body,
              phase: 'phase1'
            })
          : calculerDevisPhase2({
              ...req.body,
              phase: 'phase2'
            });

      await pool.query(
        `
        UPDATE dim_categorie
        SET
          code_section = ?,
          libelle_section = ?,
          sous_categorie = ?
        WHERE id_categorie = ?
        `,
        [
          data.section || '-',
          data.designation || '-',
          data.sousCategorie && data.sousCategorie !== '-'
            ? data.sousCategorie
            : '',
          idCategorie
        ]
      );

      await pool.query(
        `
        UPDATE dim_personnel
        SET
          designation = ?,
          unite = ?,
          sous_taches = ?
        WHERE id_personnel = ?
        `,
        [
          data.categorie || '-',
          data.unite || '-',
          data.sousCategorie && data.sousCategorie !== '-'
            ? data.sousCategorie
            : '',
          idPersonnel
        ]
      );

      const [factRows] = await pool.query(
        `
        SELECT id_cout
        FROM fact_ligne_devis
        WHERE code_projet = ?
        AND COALESCE(phase, 'phase2') = ?
        AND id_personnel = ?
        AND id_categorie = ?
        LIMIT 1
        `,
        [codeProjet, phase, idPersonnel, idCategorie]
      );

      if (!factRows.length) {
        return res.status(404).json({
          success: false,
          message: 'Ligne MySQL introuvable.'
        });
      }

      const idCout = factRows[0].id_cout;

      await pool.query(
        `
        UPDATE dim_cout
        SET
          prix_revient_site_eur = ?,
          prix_revient_total_eur = ?,
          taux_fg = ?,
          cout_fg_dt = ?,
          marge_brute_eur = ?,
          marge_nette_eur = ?,
          marge_nette_pct = ?
        WHERE id_cout = ?
        `,
        [
          data.prixRevientEur,
          data.prixRevientEur,
          data.tauxFg,
          data.fraisGestionEur,
          data.margeBruteEur,
          data.margeNetteEur,
          data.margeNettePct,
          idCout
        ]
      );

      await pool.query(
        `
        UPDATE fact_ligne_devis
        SET
          quantite_contrat = ?,
          pu_contrat_fcfa = ?,
          pu_contrat_exact = ?,
          montant_fcfa = ?,
          montant_eur = ?,
          quantite_revient = ?,
          pu_site = ?,
          prix_total_eur = ?
        WHERE code_projet = ?
        AND COALESCE(phase, 'phase2') = ?
        AND id_personnel = ?
        AND id_categorie = ?
        `,
        [
          data.quantite,
          data.puContratFcfaArrondi,
          data.puContratFcfaExact,
          data.montantFcfa,
          data.montantEur,
          data.quantiteSite,
          data.puSiteEur,
          data.prixRevientEur,
          codeProjet,
          phase,
          idPersonnel,
          idCategorie
        ]
      );

      const updated = await getMySqlDevisBySyntheticId(id);

      return res.json({
        success: true,
        data: updated
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant invalide.'
      });
    }

    const oldDevis = await Devis.findById(id).lean();

    if (!oldDevis) {
      return res.status(404).json({
        success: false,
        message: 'Ligne introuvable'
      });
    }

    const data = calculerDevis({
      ...oldDevis,
      ...req.body,
      source: 'devis',
      ligneType: 'categorie',
      isParentLine: true,
      hasSousCategories: false
    });

    const devis = await Devis.findByIdAndUpdate(id, data, {
      new: true
    });

    const devisCalcule = calculerDevis({
      ...devis.toObject(),
      source: 'devis',
      ligneType: 'categorie',
      isParentLine: true,
      hasSousCategories: false
    });

    return res.json({
      success: true,
      data: devisCalcule
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
    const id = req.params.id;

    if (isMysqlSyntheticId(id)) {
      const { phase, idPersonnel, idCategorie, codeProjet } =
        parseMysqlSyntheticId(id);

      const pool = getPool();

      if (!pool) {
        throw new Error('Connexion MySQL non initialisée.');
      }

      const [factRows] = await pool.query(
        `
        SELECT id_cout
        FROM fact_ligne_devis
        WHERE code_projet = ?
        AND COALESCE(phase, 'phase2') = ?
        AND id_personnel = ?
        AND id_categorie = ?
        LIMIT 1
        `,
        [codeProjet, phase, idPersonnel, idCategorie]
      );

      const idCout = factRows[0]?.id_cout;

      await pool.query(
        `
        DELETE FROM fact_ligne_devis
        WHERE code_projet = ?
        AND COALESCE(phase, 'phase2') = ?
        AND id_personnel = ?
        AND id_categorie = ?
        `,
        [codeProjet, phase, idPersonnel, idCategorie]
      );

      await pool.query(
        `
        DELETE FROM dim_categorie
        WHERE id_categorie = ?
        `,
        [idCategorie]
      );

      await pool.query(
        `
        DELETE FROM dim_personnel
        WHERE id_personnel = ?
        `,
        [idPersonnel]
      );

      if (idCout) {
        await pool.query(
          `
          DELETE FROM dim_cout
          WHERE id_cout = ?
          `,
          [idCout]
        );
      }

      return res.json({
        success: true,
        message: 'Ligne MySQL supprimée'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant invalide.'
      });
    }

    await Devis.findByIdAndDelete(id);

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
    const id = req.params.id;

    let devisCalcule = null;

    if (isMysqlSyntheticId(id)) {
      devisCalcule = await getMySqlDevisBySyntheticId(id);
    } else {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant invalide.'
        });
      }

      const devis = await Devis.findById(id);

      if (!devis) {
        return res.status(404).json({
          success: false,
          message: 'Ligne introuvable'
        });
      }

      devisCalcule = calculerDevis({
        ...devis.toObject(),
        source: 'devis',
        ligneType: 'categorie',
        isParentLine: true,
        hasSousCategories: false
      });
    }

    if (!devisCalcule) {
      return res.status(404).json({
        success: false,
        message: 'Ligne introuvable'
      });
    }

    const iaUrl = process.env.IA_SERVICE_URL || 'http://localhost:8000';

    const iaResponse = await axios.post(`${iaUrl}/detect-anomaly`, {
      pu_fcfa: devisCalcule.puContratFcfaExact,
      quantite: devisCalcule.quantite,
      montant_fcfa: devisCalcule.montantFcfa
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

/* =========================================================
   EXPORTS MODULE
========================================================= */

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