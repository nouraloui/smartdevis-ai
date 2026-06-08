const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/devis.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/', protect, ctrl.getAllDevis);
router.get('/:id', protect, ctrl.getDevisById);
router.post('/', protect, ctrl.createDevis);
router.put('/:id', protect, ctrl.updateDevis);
router.delete('/:id', protect, ctrl.deleteDevis);

router.post('/:id/analyse-ia', protect, ctrl.analyseIA);
router.get('/:id/export-pdf', protect, ctrl.exportPDF);
router.get('/:id/export-excel', protect, ctrl.exportExcel);

module.exports = router;