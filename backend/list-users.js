const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '.env.development')
});

const User = require('./src/models/User.model');

const listUsers = async () => {
  try {
    console.log('MONGO_URI =', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find().select(
      'nom email role actif approvalStatus approvalToken rejectionToken createdAt'
    );

    console.log('Nombre utilisateurs:', users.length);

    console.table(
      users.map((u) => ({
        id: u._id.toString(),
        nom: u.nom,
        email: u.email,
        role: u.role,
        actif: u.actif,
        approvalStatus: u.approvalStatus || 'approved',
        hasApprovalToken: !!u.approvalToken,
        hasRejectionToken: !!u.rejectionToken,
        createdAt: u.createdAt
      }))
    );

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
};

listUsers();