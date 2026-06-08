const mongoose = require('mongoose');

const projetSchema = new mongoose.Schema(
  {
    id_projet: Number,
    code_projet: {
      type: String,
      required: true,
      trim: true
    },
    nom: {
      type: String,
      default: ''
    },
    client: {
      type: String,
      default: ''
    },
    departement: {
      type: String,
      default: ''
    },
    directeur: {
      type: String,
      default: ''
    },
    chef_projet: {
      type: String,
      default: ''
    },
    duree_mois: {
      type: Number,
      default: 0
    },
    numero_contrat: {
      type: Number,
      default: 0
    },
    date_devis: {
      type: Date,
      default: null
    },
    date_debut: {
      type: Date,
      default: null
    },
    date_fin: {
      type: Date,
      default: null
    },
    budget_prevu_fcfa: {
      type: Number,
      default: 0
    },
    montant_realise_fcfa: {
      type: Number,
      default: 0
    },
    avancement: {
      type: Number,
      default: 0
    },
    statut: {
      type: String,
      enum: ['planifie', 'en_cours', 'termine', 'suspendu'],
      default: 'planifie'
    },
    risque: {
      type: String,
      enum: ['faible', 'moyen', 'eleve'],
      default: 'faible'
    },
    description: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Projet', projetSchema, 'dim_projet');