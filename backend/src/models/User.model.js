const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['admin', 'manager', 'consultant', 'agent_saisie'],
      default: 'consultant'
    },

    actif: {
      type: Boolean,
      default: false
    },

    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },

    approvalToken: {
      type: String,
      default: null
    },

    rejectionToken: {
      type: String,
      default: null
    },

    approvalTokenExpire: {
      type: Date,
      default: null
    },

    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpire: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);