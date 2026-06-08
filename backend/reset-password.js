const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetPassword = async () => {
  try {
    console.log('Base utilisée:', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    const emailRecherche = 'aloui.nour1@esprit.tn';
    const newPassword = 'aalnou';

    const usersCollection = mongoose.connection.db.collection('users');

    const users = await usersCollection.find({}).toArray();

    console.log('Utilisateurs trouvés:');
    users.forEach((u) => {
      console.log(`- "${u.email}"`);
    });

    const user = users.find(
      (u) =>
        String(u.email || '')
          .trim()
          .toLowerCase() === emailRecherche.trim().toLowerCase()
    );

    if (!user) {
      console.log('Utilisateur introuvable après comparaison.');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          email: emailRecherche.trim().toLowerCase(),
          password: hashedPassword,
          actif: true,
          resetPasswordToken: null,
          resetPasswordExpire: null,
          updatedAt: new Date()
        }
      }
    );

    console.log('Mot de passe réinitialisé avec succès');
    console.log('Email:', emailRecherche);
    console.log('Nouveau mot de passe:', newPassword);

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

resetPassword();