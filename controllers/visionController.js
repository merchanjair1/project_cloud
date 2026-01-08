const visionService = require('../services/ocrService');

// Algoritmo robusto de validación de cédula (Módulo 10)
function validateCedula(cedula) {
  if (cedula.length !== 10) return false;
  const province = parseInt(cedula.slice(0, 2));
  if (province < 1 || (province > 24 && province !== 30)) return false;
  
  const digits = cedula.split('').map(Number);
  const checkDigit = digits.pop();
  let sum = 0;
  digits.forEach((d, i) => {
    let v = (i % 2 === 0) ? d * 2 : d;
    if (v > 9) v -= 9;
    sum += v;
  });
  const calculated = (sum % 10 === 0) ? 0 : 10 - (sum % 10);
  return calculated === checkDigit;
}

async function detectText(req, res) {
  try {
    const { base64Image } = req.body;
    if (!base64Image) return res.status(400).json({ error: 'Falta base64Image' });

    const text = await visionService.detectTextFromBase64(base64Image);
    
    // Buscar números de 10 dígitos y validar el primero que cumpla
    const matches = text.match(/\b\d{10}\b/g) || [];
    const validCedula = matches.find(validateCedula);

    res.json({
      cedula: validCedula || 'No se detectó cédula válida',
      textoExtraido: text
    });
  } catch (e) {
    res.status(500).json({ error: 'OCR falló', details: e.message });
  }
}

module.exports = { detectText };