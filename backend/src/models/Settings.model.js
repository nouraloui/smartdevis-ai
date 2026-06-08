const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    entreprise: {
      nom: {
        type: String,
        default: 'Africa Engineering'
      },
      email: {
        type: String,
        default: ''
      },
      telephone: {
        type: String,
        default: ''
      },
      adresse: {
        type: String,
        default: ''
      }
    },

    devis: {
      tauxFraisGestion: {
        type: Number,
        default: 10
      },
      tauxEuroFcfa: {
        type: Number,
        default: 655.957
      },
      devisePrincipale: {
        type: String,
        enum: ['FCFA', 'EUR', 'TND'],
        default: 'FCFA'
      },
      methodeArrondi: {
        type: String,
        enum: ['standard', 'superieur', 'sans_arrondi'],
        default: 'standard'
      }
    },

    ia: {
      seuilAnomalie: {
        type: Number,
        default: 20
      },
      sensibilite: {
        type: String,
        enum: ['faible', 'moyenne', 'elevee'],
        default: 'moyenne'
      },
      detectionAnomalies: {
        type: Boolean,
        default: true
      },
      suggestionsPrix: {
        type: Boolean,
        default: true
      }
    },

    exports: {
      afficherLogoPdf: {
        type: Boolean,
        default: true
      },
      afficherDetailsEtape: {
        type: Boolean,
        default: true
      },
      exportExcel: {
        type: Boolean,
        default: true
      }
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Settings', settingsSchema);