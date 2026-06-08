const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/projet.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/', protect, ctrl.getAllProjets);
router.get('/:id', protect, ctrl.getProjetById);
router.post('/', protect, ctrl.createProjet);
router.put('/:id', protect, ctrl.updateProjet);
router.delete('/:id', protect, ctrl.deleteProjet);

module.exports = router;