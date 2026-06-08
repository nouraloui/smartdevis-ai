const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/ia-nlp.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/semantic-analysis', protect, ctrl.semanticAnalysis);

module.exports = router;