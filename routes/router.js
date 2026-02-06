const express = require('express');
const router = express.Router();
const visionController = require('../controllers/visionController');
const deudaController = require('../controllers/controller_eerssa');
const consultaSRIController = require('../controllers/controller_sri_matriculacion');
const claroController = require('../controllers/controller_planes_claro');
const antController = require('../controllers/controller_ant');
const orchestratorController = require('../controllers/orchestratorController');

router.post('/detect-text', visionController.detectText);
router.post('/consultar-luz_loja', deudaController.getDeuda);
router.post('/consultar-sri_matriculacion', consultaSRIController.consultarDatos);
router.post('/consultar-servicio-ocr', orchestratorController.processServiceQuery);
router.post('/consultar-claro', claroController.consultarDatos);
router.post('/consultar-ant', antController.consultarDatos);


module.exports = router;
