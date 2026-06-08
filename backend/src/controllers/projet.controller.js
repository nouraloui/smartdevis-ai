const Projet = require('../models/Projet.model');

const calculerRisque = (projet) => {
  const budget = Number(projet.budget_prevu_fcfa || 0);
  const realise = Number(projet.montant_realise_fcfa || 0);
  const avancement = Number(projet.avancement || 0);

  if (projet.statut === 'suspendu') return 'eleve';
  if (budget > 0 && realise > budget) return 'eleve';
  if (projet.statut === 'en_cours' && avancement < 40) return 'moyen';

  return 'faible';
};

exports.getAllProjets = async (req, res, next) => {
  try {
    const projets = await Projet.find().sort({ createdAt: -1 });

    const totalProjets = projets.length;

    const budgetTotal = projets.reduce(
      (sum, p) => sum + Number(p.budget_prevu_fcfa || 0),
      0
    );

    const realiseTotal = projets.reduce(
      (sum, p) => sum + Number(p.montant_realise_fcfa || 0),
      0
    );

    const projetsRisque = projets.filter((p) => p.risque === 'eleve').length;

    res.json({
      success: true,
      data: projets,
      kpis: {
        totalProjets,
        budgetTotal,
        realiseTotal,
        projetsRisque
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getProjetById = async (req, res, next) => {
  try {
    const projet = await Projet.findById(req.params.id);

    if (!projet) {
      return res.status(404).json({
        success: false,
        message: 'Projet introuvable'
      });
    }

    res.json({
      success: true,
      data: projet
    });
  } catch (err) {
    next(err);
  }
};

exports.createProjet = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (!payload.code_projet) {
      return res.status(400).json({
        success: false,
        message: 'Le code projet est obligatoire.'
      });
    }

    if (!payload.nom) {
      payload.nom = `Mission de contrôle ${payload.code_projet}`;
    }

    payload.risque = calculerRisque(payload);

    const projet = await Projet.create(payload);

    res.status(201).json({
      success: true,
      message: 'Projet créé avec succès',
      data: projet
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProjet = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    if (!payload.nom && payload.code_projet) {
      payload.nom = `Mission de contrôle ${payload.code_projet}`;
    }

    payload.risque = calculerRisque(payload);

    const projet = await Projet.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!projet) {
      return res.status(404).json({
        success: false,
        message: 'Projet introuvable'
      });
    }

    res.json({
      success: true,
      message: 'Projet modifié avec succès',
      data: projet
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteProjet = async (req, res, next) => {
  try {
    const projet = await Projet.findByIdAndDelete(req.params.id);

    if (!projet) {
      return res.status(404).json({
        success: false,
        message: 'Projet introuvable'
      });
    }

    res.json({
      success: true,
      message: 'Projet supprimé avec succès'
    });
  } catch (err) {
    next(err);
  }
};