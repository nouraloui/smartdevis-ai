const mongoose = require('mongoose');

const devisSchema = new mongoose.Schema(
  {
    projet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Projet',
      default: null
    },

    code_projet: {
      type: String,
      default: '',
      trim: true
    },

    section: {
      type: String,
      required: true,
      trim: true
    },

    designation: {
      type: String,
      required: true,
      trim: true
    },

    categorie: {
      type: String,
      required: true,
      trim: true
    },

    sousCategorie: {
      type: String,
      default: '',
      trim: true
    },

    unite: {
      type: String,
      default: '',
      trim: true
    },

    quantite: {
      type: Number,
      default: 0
    },

    puContratFcfaArrondi: {
      type: Number,
      default: 0
    },

    puContratFcfaExact: {
      type: Number,
      default: 0
    },

    montantFcfa: {
      type: Number,
      default: 0
    },

    montantEur: {
      type: Number,
      default: 0
    },

    quantiteSite: {
      type: Number,
      default: 0
    },

    prixRevientEur: {
      type: Number,
      default: 0
    },

    puSiteEur: {
      type: Number,
      default: 0
    },

    margeBruteEur: {
      type: Number,
      default: 0
    },

    fraisGestionEur: {
      type: Number,
      default: 0
    },

    tauxFg: {
      type: Number,
      default: 0
    },

    margeNetteEur: {
      type: Number,
      default: 0
    },

    margeNettePct: {
      type: Number,
      default: 0
    },

    tauxEurFcfa: {
      type: Number,
      default: 655.957
    },

    statut: {
      type: String,
      enum: ['brouillon', 'valide', 'archive'],
      default: 'brouillon'
    },

    anomalie: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Devis', devisSchema);