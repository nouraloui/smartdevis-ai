const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/stats', protect, ctrl.getDashboardStats);

module.exports = router;