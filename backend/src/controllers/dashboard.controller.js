const { getPool } = require('../config/db.mysql');

const TAUX_EUR_DT = 3.35;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'string') {
    const cleaned = value.replace(',', '.').replace(/\s/g, '').replace('%', '');
    if (cleaned.toUpperCase() === 'NULL') return 0;
    return Number(cleaned) || 0;
  }

  return Number(value) || 0;
};

const toKey = (value) => String(value ?? '').trim();

const buildMap = (rows, key) => {
  const map = {};
  rows.forEach((row) => {
    map[toKey(row[key])] = row;
  });
  return map;
};

const getField = (obj, keys, defaultValue = '') => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return defaultValue;
};

const average = (arr) => {
  const values = arr.filter((v) => Number.isFinite(v));
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const pool = getPool();

    if (!pool) {
      return res.status(500).json({
        success: false,
        message: 'Connexion MySQL non initialisée'
      });
    }

    const codeProjet = String(req.query.code_projet || 'DI-M3').toUpperCase();

    const [factRows] = await pool.query(
      `
      SELECT *
      FROM fact_ligne_devis
      WHERE code_projet = ?
      `,
      [codeProjet]
    );

    const [dimCoutRows] = await pool.query(`
      SELECT *
      FROM dim_coutt_corrige
    `);

    const [dimPersonnelRows] = await pool.query(`
      SELECT *
      FROM dim_personnel
    `);

    const [dimCategorieRows] = await pool.query(`
      SELECT *
      FROM dim_categorie
    `);

    const coutMap = buildMap(dimCoutRows, 'id_cout');
    const personnelMap = buildMap(dimPersonnelRows, 'id_personnel');
    const categorieMap = buildMap(dimCategorieRows, 'id_categorie');

    const lignes = factRows.map((fact) => {
      const cout = coutMap[toKey(fact.id_cout)] || {};
      const personnel = personnelMap[toKey(fact.id_personnel)] || {};
      const categorieDoc = categorieMap[toKey(fact.id_categorie)] || {};

      const section =
        getField(categorieDoc, ['code_section', 'section'], '') ||
        'Non définie';

      const categorie =
        getField(personnel, ['designation'], '') ||
        getField(categorieDoc, ['designation'], '') ||
        'Non définie';

      const sousCategorie =
        getField(personnel, ['sous_taches', 'sous_tâches', 'sous_categorie'], '') ||
        '-';

      const designation = sousCategorie !== '-' ? sousCategorie : categorie;

      const montantFcfa = toNumber(fact.montant_fcfa);
      const montantEur = toNumber(fact.montant_eur);
      const pu = toNumber(fact.pu_contrat_exact || fact.pu_contrat_fcfa);

      const prixRevientTotalEur =
        toNumber(cout.prix_revient_total_eur) ||
        toNumber(fact.prix_total_eur) ||
        0;

      const coutFgDt = toNumber(cout.cout_fg_dt);

      const coutFinalDt =
        toNumber(cout.cout_final_dt) ||
        toNumber(cout.cout_final) ||
        toNumber(cout.cout_total_dt) ||
        prixRevientTotalEur * TAUX_EUR_DT;

      const margeBruteEur =
        toNumber(cout.marge_brute_eur) ||
        (montantEur > 0 ? montantEur - prixRevientTotalEur : 0);

      const fraisGestionEur =
        coutFgDt > 0 ? coutFgDt / TAUX_EUR_DT : prixRevientTotalEur * 0.05;

      const margeNetteEur =
        toNumber(cout.marge_nette_eur) ||
        (montantEur > 0 ? margeBruteEur - fraisGestionEur : 0);

      const margeBrutePct =
        toNumber(cout.marge_brute_pct) > 0
          ? toNumber(cout.marge_brute_pct) * 100
          : montantEur > 0
            ? (margeBruteEur / montantEur) * 100
            : null;

      const margeNettePct =
        toNumber(cout.marge_nette_pct) !== 0
          ? toNumber(cout.marge_nette_pct) * 100
          : montantEur > 0
            ? (margeNetteEur / montantEur) * 100
            : null;

      const hasValidMargin = margeNettePct !== null && Number.isFinite(margeNettePct);

      const isAnomaly =
        (hasValidMargin && margeNettePct < 5) ||
        pu > 10000000;

      return {
        idLigne: fact.id_ligne,
        idCout: fact.id_cout,
        codeProjet,
        section,
        categorie,
        designation,
        unite: getField(personnel, ['unite'], '-'),
        montantFcfa,
        montantEur,
        pu,
        prixRevientTotalEur,
        coutFinalDt,
        coutFgDt,
        margeSousTraitantDt: toNumber(cout.marge_sous_traitant_dt),
        margeBruteEur,
        margeNetteEur,
        margeBrutePct: hasValidMargin ? margeBrutePct : null,
        margeNettePct: hasValidMargin ? margeNettePct : null,
        isAnomaly
      };
    });

    const totalLignes = lignes.length;

    const montantTotalFcfa = lignes.reduce(
      (sum, d) => sum + d.montantFcfa,
      0
    );

    const lignesAvecMarge = lignes.filter(
      (d) => d.margeNettePct !== null && Number.isFinite(d.margeNettePct)
    );

    const margeNetteMoyenne = average(
      lignesAvecMarge.map((d) => d.margeNettePct)
    );

    const anomalies = lignes.filter((d) => d.isAnomaly);

    const bySection = {};
    const byCategorie = {};

    lignes.forEach((d) => {
      const section = d.section || 'Non définie';
      const categorie = d.categorie || 'Non définie';

      if (!bySection[section]) {
        bySection[section] = {
          section,
          montantFcfa: 0,
          marges: [],
          anomalies: 0
        };
      }

      bySection[section].montantFcfa += d.montantFcfa;

      if (d.margeNettePct !== null && Number.isFinite(d.margeNettePct)) {
        bySection[section].marges.push(d.margeNettePct);
      }

      if (d.isAnomaly) {
        bySection[section].anomalies += 1;
      }

      const catKey = `${section}__${categorie}`;

      if (!byCategorie[catKey]) {
        byCategorie[catKey] = {
          section,
          categorie,
          montantFcfa: 0,
          marges: [],
          anomalies: 0
        };
      }

      byCategorie[catKey].montantFcfa += d.montantFcfa;

      if (d.margeNettePct !== null && Number.isFinite(d.margeNettePct)) {
        byCategorie[catKey].marges.push(d.margeNettePct);
      }

      if (d.isAnomaly) {
        byCategorie[catKey].anomalies += 1;
      }
    });

    const sections = Object.values(bySection).map((item) => ({
      section: item.section,
      montantFcfa: item.montantFcfa,
      margeMoyenne: average(item.marges),
      anomalies: item.anomalies
    }));

    const categories = Object.values(byCategorie).map((item) => ({
      section: item.section,
      categorie: item.categorie,
      montantFcfa: item.montantFcfa,
      margeMoyenne: average(item.marges),
      anomalies: item.anomalies
    }));

    const historique = sections.map((s) => ({
      section: s.section,
      montantActuel: s.montantFcfa,
      montantHistorique: Math.round(s.montantFcfa * 0.8),
      evolutionPct:
        s.montantFcfa > 0
          ? ((s.montantFcfa - s.montantFcfa * 0.8) /
              (s.montantFcfa * 0.8)) *
            100
          : 0
    }));

    const alertes = anomalies.slice(0, 10).map((d) => {
      let message = 'Anomalie détectée';
      let niveau = 'Moyen';

      if (d.margeNettePct !== null && d.margeNettePct < 0) {
        message = 'Devis non rentable';
        niveau = 'Critique';
      } else if (d.margeNettePct !== null && d.margeNettePct < 5) {
        message = 'Marge nette faible';
        niveau = 'Élevé';
      } else if (d.pu > 10000000) {
        message = 'PU FCFA anormalement élevé';
        niveau = 'Moyen';
      }

      return {
        section: d.section || '-',
        designation: d.designation || '-',
        categorie: d.categorie || '-',
        pu: d.pu,
        marge: d.margeNettePct || 0,
        message,
        niveau
      };
    });

    const coutsLignes = lignes
      .filter((d) => d.prixRevientTotalEur > 0 || d.coutFinalDt > 0)
      .map((d) => ({
        idCout: d.idCout,
        designation: d.designation,
        categorie: d.categorie,
        section: d.section,
        prixRevientTotalEur: d.prixRevientTotalEur,
        coutFgDt: d.coutFgDt,
        margeSousTraitantDt: d.margeSousTraitantDt,
        coutFinalDt: d.coutFinalDt,
        margeBruteEur: d.margeBruteEur,
        margeBrutePct: d.margeBrutePct || 0,
        margeNetteEur: d.margeNetteEur,
        margeNettePct: d.margeNettePct !== null ? d.margeNettePct / 100 : 0
      }));

    const totalCouts = coutsLignes.length;

    const coutFinalTotalDt = coutsLignes.reduce(
      (sum, c) => sum + c.coutFinalDt,
      0
    );

    const prixRevientTotalEur = coutsLignes.reduce(
      (sum, c) => sum + c.prixRevientTotalEur,
      0
    );

    const coutFgTotalDt = coutsLignes.reduce(
      (sum, c) => sum + c.coutFgDt,
      0
    );

    const margeBruteTotalEur = coutsLignes.reduce(
      (sum, c) => sum + c.margeBruteEur,
      0
    );

    const margeNetteTotalEur = coutsLignes.reduce(
      (sum, c) => sum + c.margeNetteEur,
      0
    );

    const margeBrutePctMoyenne =
      totalCouts > 0
        ? average(coutsLignes.map((c) => c.margeBrutePct)) / 100
        : 0;

    const margeNettePctMoyenne =
      totalCouts > 0
        ? average(coutsLignes.map((c) => c.margeNettePct))
        : 0;

    const topCouts = [...coutsLignes]
      .filter((c) => c.coutFinalDt > 0)
      .sort((a, b) => b.coutFinalDt - a.coutFinalDt)
      .slice(0, 10);

    const coutsCritiques = coutsLignes.filter(
      (c) => c.margeNettePct < 0.05 || c.coutFinalDt > 50000
    );

    return res.json({
      success: true,
      code_projet: codeProjet,
      source: 'mysql',
      data: {
        kpis: {
          montantTotalFcfa,
          margeNetteMoyenne,
          nombreAnomalies: anomalies.length,
          totalLignes
        },
        sections,
        categories,
        historique,
        alertes,
        couts: {
          kpis: {
            totalCouts,
            coutFinalTotalDt,
            prixRevientTotalEur,
            coutFgTotalDt,
            margeBruteTotalEur,
            margeNetteTotalEur,
            margeBrutePctMoyenne,
            margeNettePctMoyenne,
            coutsCritiques: coutsCritiques.length
          },
          lignes: coutsLignes,
          topCouts
        }
      }
    });
  } catch (err) {
    next(err);
  }
};