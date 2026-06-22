const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/auth.controller');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);

router.get('/approve-account/:token', ctrl.approveAccount);
router.get('/reject-account/:token', ctrl.rejectAccount);

router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);

module.exports = router;