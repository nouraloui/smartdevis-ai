const mongoose = require('mongoose');

const ressourceSchema = new mongoose.Schema(
  {
    id_personnel: {
      type: Number,
      required: true,
      unique: true
    },
    designation: {
      type: String,
      required: true,
      trim: true
    },
    type_ressource: {
      type: String,
      required: true,
      trim: true
    },
    unite: {
      type: String,
      required: true,
      trim: true
    },
    appui_siege: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Ressource', ressourceSchema);