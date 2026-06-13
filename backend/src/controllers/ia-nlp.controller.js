const axios = require('axios');
const { getPool } = require('../config/db.mysql');

const IA_SERVICE_URL = process.env.IA_SERVICE_URL || 'http://localhost:8000';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'string') {
    return Number(value.replace(/\s/g, '').replace(',', '.').replace('%', '')) || 0;
  }

  return Number(value) || 0;
};

const buildMysqlLines = async (codeProjet = 'ALL') => {
  const pool = getPool();

  if (!pool) {
    throw new Error('Connexion MySQL non initialisée.');
  }

  const params = [];
  let whereProjet = '';

  if (codeProjet && codeProjet !== 'ALL') {
    whereProjet = 'AND f.code_projet = ?';
    params.push(codeProjet);
  } else {
    whereProjet = "AND f.code_projet IN ('DI-M3', 'DI')";
  }

  const [rows] = await pool.query(
    `
    SELECT
      CONCAT(f.code_projet, '_', f.id_categorie, '_', f.id_personnel) AS id,

      f.code_projet,
      f.id_categorie,
      f.id_personnel,

      f.quantite_contrat,
      f.pu_contrat_fcfa,
      f.montant_fcfa,
      f.montant_eur,
      f.prix_total_eur,

      c.code_section,
      c.libelle_section,

      p.designation,
      p.unite,
      p.sous_taches

    FROM fact_ligne_devis f

    LEFT JOIN dim_categorie c
      ON f.id_categorie = c.id_categorie

    LEFT JOIN dim_personnel p
      ON f.id_personnel = p.id_personnel

    WHERE
      p.designation IS NOT NULL
      AND p.designation <> ''
      ${whereProjet}

    ORDER BY f.code_projet, f.id_categorie, f.id_personnel
    `,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    codeProjet: row.code_projet,

    section: row.code_section || '-',
    designation: row.libelle_section || '-',
    categorie: row.designation || '-',
    sousCategorie: row.sous_taches || '-',
    unite: row.unite || '-',

    puContratFcfaArrondi: toNumber(row.pu_contrat_fcfa),
    montantFcfa: toNumber(row.montant_fcfa),
    margeNettePct:
      toNumber(row.montant_eur) > 0
        ? ((toNumber(row.montant_eur) - toNumber(row.prix_total_eur) - toNumber(row.prix_total_eur) * 0.05) /
            toNumber(row.montant_eur)) *
          100
        : 0
  }));
};

const semanticAnalysis = async (req, res, next) => {
  try {
    const codeProjet = req.body?.code_projet || 'ALL';
    const lignes = await buildMysqlLines(codeProjet);

    const iaResponse = await axios.post(`${IA_SERVICE_URL}/semantic-analysis`, {
      lignes,
      n_clusters: Number(req.body?.n_clusters || 6)
    });

    return res.json(iaResponse.data);
  } catch (err) {
    console.error('Erreur IA NLP:', err.response?.data || err.message);

    return res.status(err.response?.status || 500).json({
      success: false,
      message:
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Erreur serveur interne'
    });
  }
};

module.exports = {
  semanticAnalysis
};