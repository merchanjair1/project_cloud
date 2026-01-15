const express = require('express');
const router = express.Router();
const visionController = require('../controllers/visionController');
const deudaController = require('../controllers/controller_eerssa');
const consultaSRIController = require('../controllers/controller_sri_matriculacion');
const orchestratorController = require('../controllers/orchestratorController');
const aguaController = require('../controllers/controller_agua');
const predioController = require('../controllers/controller_predio');

router.post('/detect-text', visionController.detectText);
router.post('/consultar-luz_loja', deudaController.getDeuda);
router.post('/consultar-sri_matriculacion', consultaSRIController.consultarDatos);
router.post('/consultar-servicio-ocr', orchestratorController.processServiceQuery);
router.post('/consultar-agua', aguaController.consultarServicio);
router.post('/consultar-predio', predioController.consultarServicio);


module.exports = router;
