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

const getBackendUrl = () => {
  return process.env.BACKEND_URL || 'http://localhost:3000';
};

const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:4200';
};

const getAdminEmail = () => {
  return process.env.ADMIN_EMAIL || process.env.MAIL_USER;
};

/* =========================================================
   REGISTER - COMPTE EN ATTENTE
========================================================= */

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

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
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

    const approvalToken = crypto.randomBytes(32).toString('hex');
    const rejectionToken = crypto.randomBytes(32).toString('hex');
    const approvalTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000;

    /*
      Sécurité :
      On évite qu’un utilisateur se donne lui-même le rôle admin
      depuis la page register.
    */
    const allowedPublicRoles = ['manager', 'consultant', 'agent_saisie'];
    const safeRole = allowedPublicRoles.includes(role) ? role : 'consultant';

    const user = await User.create({
      nom: nom.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: safeRole,
      actif: false,
      approvalStatus: 'pending',
      approvalToken,
      rejectionToken,
      approvalTokenExpire
    });

    const backendUrl = getBackendUrl();

    const approvalUrl = `${backendUrl}/api/auth/approve-account/${approvalToken}`;
    const rejectionUrl = `${backendUrl}/api/auth/reject-account/${rejectionToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
        <h2>Nouvelle demande de création de compte</h2>

        <p>Un nouvel utilisateur souhaite créer un compte sur <strong>SmartDevis AI</strong>.</p>

        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:16px 0;">
          <p><strong>Nom :</strong> ${user.nom}</p>
          <p><strong>Email :</strong> ${user.email}</p>
          <p><strong>Rôle demandé :</strong> ${user.role}</p>
          <p><strong>Statut :</strong> En attente</p>
        </div>

        <p>Choisissez une action :</p>

        <p>
          <a
            href="${approvalUrl}"
            style="background:#16a34a;color:white;padding:12px 18px;text-decoration:none;border-radius:8px;display:inline-block;margin-right:8px;"
          >
            Accepter le compte
          </a>

          <a
            href="${rejectionUrl}"
            style="background:#dc2626;color:white;padding:12px 18px;text-decoration:none;border-radius:8px;display:inline-block;"
          >
            Refuser le compte
          </a>
        </p>

        <p style="font-size:13px;color:#6b7280;margin-top:20px;">
          Ce lien expire dans 7 jours.
        </p>
      </div>
    `;

    await sendEmail({
      to: getAdminEmail(),
      subject: 'Nouvelle demande de compte - SmartDevis AI',
      html
    });

    return res.status(201).json({
      success: true,
      message:
        'Votre demande de création de compte a été envoyée. Veuillez attendre la validation de l’administrateur.'
    });
  } catch (err) {
    console.error('Erreur register:', err.message);
    next(err);
  }
};

/* =========================================================
   LOGIN
========================================================= */

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

    /*
      Compatibilité avec les anciens comptes :
      Si approvalStatus n’existe pas mais actif=true,
      on considère le compte comme approuvé.
    */
    const approvalStatus =
      user.approvalStatus || (user.actif ? 'approved' : 'pending');

    if (approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est en attente de validation par l’administrateur.'
      });
    }

    if (approvalStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Votre demande de création de compte a été refusée.'
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
        actif: user.actif,
        approvalStatus: approvalStatus
      }
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   APPROVE ACCOUNT
========================================================= */

const approveAccount = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      approvalToken: token,
      approvalTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).send(`
        <h2>Lien invalide ou expiré</h2>
        <p>Le lien d’acceptation est invalide ou a expiré.</p>
      `);
    }

    user.actif = true;
    user.approvalStatus = 'approved';
    user.approvalToken = null;
    user.rejectionToken = null;
    user.approvalTokenExpire = null;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Votre compte SmartDevis AI a été accepté',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Compte accepté</h2>
          <p>Bonjour ${user.nom},</p>
          <p>Votre compte SmartDevis AI a été accepté par l’administrateur.</p>
          <p>Vous pouvez maintenant vous connecter à l’application.</p>

          <p>
            <a
              href="${getFrontendUrl()}/login"
              style="background:#ef4444;color:white;padding:12px 18px;text-decoration:none;border-radius:8px;display:inline-block;"
            >
              Se connecter
            </a>
          </p>
        </div>
      `
    });

    return res.send(`
      <div style="font-family: Arial, sans-serif; padding: 30px;">
        <h2>Compte accepté</h2>
        <p>Le compte de <strong>${user.email}</strong> a été accepté avec succès.</p>
      </div>
    `);
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   REJECT ACCOUNT
========================================================= */

const rejectAccount = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      rejectionToken: token,
      approvalTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).send(`
        <h2>Lien invalide ou expiré</h2>
        <p>Le lien de refus est invalide ou a expiré.</p>
      `);
    }

    user.actif = false;
    user.approvalStatus = 'rejected';
    user.approvalToken = null;
    user.rejectionToken = null;
    user.approvalTokenExpire = null;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Votre demande de compte SmartDevis AI a été refusée',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Demande refusée</h2>
          <p>Bonjour ${user.nom},</p>
          <p>Votre demande de création de compte SmartDevis AI a été refusée par l’administrateur.</p>
        </div>
      `
    });

    return res.send(`
      <div style="font-family: Arial, sans-serif; padding: 30px;">
        <h2>Compte refusé</h2>
        <p>Le compte de <strong>${user.email}</strong> a été refusé.</p>
      </div>
    `);
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

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

    const resetUrl = `${getFrontendUrl()}/reset-password/${resetToken}`;

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

/* =========================================================
   RESET PASSWORD
========================================================= */

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
  approveAccount,
  rejectAccount,
  forgotPassword,
  resetPassword
};