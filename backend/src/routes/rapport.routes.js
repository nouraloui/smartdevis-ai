// backend/src/routes/rapport.routes.js
const express = require('express');
const router  = express.Router();
const { protect } = require('../middlewares/auth.middleware');

router.get('/', protect, (req, res) => {
  res.json({ success: true, data: [], message: 'Rapports à implémenter' });
});

module.exports = router;