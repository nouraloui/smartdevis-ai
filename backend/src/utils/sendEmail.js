const { Resend } = require('resend');

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Configuration email manquante : RESEND_API_KEY absent.');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const from =
    process.env.MAIL_FROM || 'SmartDevis AI <onboarding@resend.dev>';

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html
  });

  if (error) {
    console.error('Erreur Resend:', error);
    throw new Error(error.message || 'Erreur lors de l’envoi de l’email.');
  }

  console.log('✅ Email envoyé avec Resend:', data?.id);

  return data;
};

module.exports = sendEmail;