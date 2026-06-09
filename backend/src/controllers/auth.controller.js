const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const sendEmail = require('../utils/sendEmail');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'smartdevis_secret',
    { expiresIn: '7d' }
  );
};

const register = async (req, res, next) => {
  try {
    const { nom, email, password, role } = req.body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    if (!nom || !cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email et mot de passe sont obligatoires'
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec cet email existe déjà'
      });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const user = await User.create({
      nom: nom.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'consultant',
      actif: true
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif
      }
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.trim();

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe sont obligatoires'
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    if (!user.actif) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé'
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        actif: user.actif
      }
    });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email obligatoire'
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Aucun compte trouvé avec cet email'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpire = Date.now() + 15 * 60 * 1000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = resetExpire;
    await user.save();

    const frontendUrl =
      process.env.FRONTEND_URL || 'https://smartdevis-frontend.onrender.com';

    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Réinitialisation du mot de passe</h2>
        <p>Bonjour ${user.nom},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>
          <a
            href="${resetUrl}"
            style="background:#ef4444;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px;display:inline-block;"
          >
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
        <p>Ce lien expire dans 15 minutes.</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Réinitialisation du mot de passe - SmartDevis AI',
      html
    });

    return res.json({
      success: true,
      message: 'Un email de réinitialisation a été envoyé'
    });
  } catch (err) {
    console.error('Erreur forgotPassword:', err.message);

    return res.status(500).json({
      success: false,
      message:
        'Impossible d’envoyer l’email de réinitialisation. Vérifiez la configuration Gmail.'
    });
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const cleanPassword = password?.trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token obligatoire'
      });
    }

    if (!cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe est obligatoire'
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Lien invalide ou expiré'
      });
    }

    user.password = await bcrypt.hash(cleanPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await user.save();

    return res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword
};