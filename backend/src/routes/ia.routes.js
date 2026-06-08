const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/ia.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/detect-anomaly', protect, ctrl.detectAnomaly);
router.post('/risk-score', protect, ctrl.riskScore);
router.post('/suggest-values', protect, ctrl.suggestValues);
router.post('/suggest-price', protect, ctrl.suggestPrice);
router.post('/predict-margin', protect, ctrl.predictMargin);

module.exports = router;