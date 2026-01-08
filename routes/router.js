const express = require('express');
const router = express.Router();
const visionController = require('../controllers/visionController');

router.post('/detect-text', visionController.detectText);

module.exports = router;
