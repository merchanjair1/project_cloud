const express = require('express');
const router = express.Router();
const visionController = require('../controllers/visionController');
const deudaController = require('../controllers/controller_eerssa');
const consultaSRIController = require('../controllers/controller_sri_matriculacion');
const orchestratorController = require('../controllers/orchestratorController');

router.post('/detect-text', visionController.detectText);
router.post('/consultar-luz_loja', deudaController.getDeuda);
router.post('/consultar-sri_matriculacion', consultaSRIController.consultarDatos);
router.post('/consultar-servicio-ocr', orchestratorController.processServiceQuery);


module.exports = router;
