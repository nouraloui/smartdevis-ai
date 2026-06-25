const nodemailer = require('nodemailer');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error('Configuration email manquante : MAIL_USER ou MAIL_PASS absent.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    family: 4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });

  await transporter.verify();

  await transporter.sendMail({
    from: `"SmartDevis AI" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html
  });
};

module.exports = sendEmail;