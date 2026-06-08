const express = require('express');
const router = express.Router();

const settingsController = require('../controllers/settings.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/', protect, settingsController.getSettings);
router.put('/', protect, settingsController.updateSettings);

module.exports = router;