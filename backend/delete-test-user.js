const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '.env.development')
});

const User = require('./src/models/User.model');

const deleteTestUser = async () => {
  try {
    console.log('MONGO_URI =', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    const email = 'alouinour3333@gmail.com';

    const result = await User.deleteOne({
      email: email.trim().toLowerCase()
    });

    if (result.deletedCount === 0) {
      console.log('Aucun utilisateur trouvé avec cet email.');
    } else {
      console.log('Utilisateur supprimé avec succès :', email);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
};

deleteTestUser();