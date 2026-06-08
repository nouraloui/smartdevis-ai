const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User.model');

const listUsers = async () => {
  try {
    console.log('MONGO_URI =', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find().select('nom email role actif createdAt');

    console.log('Nombre utilisateurs:', users.length);
    console.table(users.map(u => ({
      id: u._id.toString(),
      nom: u.nom,
      email: u.email,
      role: u.role,
      actif: u.actif
    })));

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
};

listUsers();