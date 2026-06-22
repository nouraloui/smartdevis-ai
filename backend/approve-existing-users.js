const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '.env.development')
});

const User = require('./src/models/User.model');

const approveExistingUsers = async () => {
  try {
    console.log('MONGO_URI =', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    /*
      Objectif :
      Approuver uniquement les anciens comptes déjà actifs.

      On ne touche pas aux nouveaux comptes créés depuis Sign Up,
      car eux ont actif:false + approvalToken/rejectionToken.
    */
    const result = await User.updateMany(
      {
        actif: true,
        $or: [
          { approvalStatus: { $exists: false } },
          { approvalStatus: null },
          { approvalStatus: 'pending' }
        ],
        approvalToken: null,
        rejectionToken: null
      },
      {
        $set: {
          approvalStatus: 'approved',
          approvalToken: null,
          rejectionToken: null,
          approvalTokenExpire: null
        }
      }
    );

    console.log('Utilisateurs anciens approuvés:', result.modifiedCount);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
};

approveExistingUsers();