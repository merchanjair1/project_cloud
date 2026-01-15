const visionService = require('../services/ocrService');
const eerssaModel = require('../models/consulta_luz_eerssa');
const sriModel = require('../models/consulta_sri_matriculacion');
const aguaModel = require('../models/consulta_agua');
const predioModel = require('../models/consulta_predio');
const ResponseHandler = require('../utils/responseHandler');

// Validación de Cédula (Algoritmo Módulo 10)
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

// Validación de Placa (AAA-1234 o AAA1234)
function extractPlaca(text) {
    // Busca patrones de 3 letras seguidas de 3 o 4 dígitos
    const match = text.match(/\b([A-Z]{3}-?\d{3,4})\b/);
    return match ? match[1].replace('-', '') : null;
}

exports.processServiceQuery = async (req, res) => {
    try {
        const { base64Image, serviceType } = req.body;

        if (!base64Image || !serviceType) {
            return ResponseHandler.badRequest(res, 'Faltan parámetros: base64Image y serviceType son requeridos.');
        }

        // 1. OCR: Extraer texto de la imagen
        const text = await visionService.detectTextFromBase64(base64Image);
        console.log("Texto detectado:", text); // Para depuración

        let identificacion = null;
        let tipoIdentificacion = null;
        let resultadoServicio = null;

        // 2. Lógica de Detección según Servicio
        if (['luz_loja', 'agua_loja', 'predio_urbano'].includes(serviceType)) {
            // Buscar Cédula para luz, agua y predio
            const matches = text.match(/\b\d{10}\b/g) || [];
            identificacion = matches.find(validateCedula);
            tipoIdentificacion = 'cedula';
        } else if (serviceType === 'sri_matriculacion') {
            // Buscar Placa para sri
            identificacion = extractPlaca(text);
            tipoIdentificacion = 'placa';
        } else {
            return ResponseHandler.badRequest(res, 'Tipo de servicio no soportado.');
        }

        if (!identificacion) {
            return ResponseHandler.notFound(res, `No se pudo detectar un documento válido para ${serviceType}. Texto: ${text.substring(0, 50)}...`);
        }

        // 3. Consultar Servicio Automáticamente
        if (serviceType === 'luz_loja') {
            resultadoServicio = await eerssaModel.consultarDeuda(identificacion, 'cedula');
        } else if (serviceType === 'sri_matriculacion') {
            resultadoServicio = await sriModel.extraerDatos(identificacion);
        } else if (serviceType === 'agua_loja') {
            resultadoServicio = await aguaModel.consultarDeuda(identificacion);
        } else if (serviceType === 'predio_urbano') {
            resultadoServicio = await predioModel.consultarDeuda(identificacion);
        }

        // 4. Responder
        if (!resultadoServicio) {
            return ResponseHandler.notFound(res, `No se encontraron datos en el servicio para: ${identificacion}`);
        }

        // Determine message (similar logic to individual controllers)
        let message = "Operación exitosa";
        if (serviceType === 'luz_loja') {
            if (!resultadoServicio.deuda && resultadoServicio.contribuyente) message = "no tiene valores por pagar";
            else if (!resultadoServicio.deuda && !resultadoServicio.contribuyente) message = "no tiene valores por pagar"; // Fallback if internal logic changes
        } else if (serviceType === 'sri_matriculacion') {
            const noPago = !resultadoServicio.totalPagar || resultadoServicio.totalPagar === "No disponible" || parseFloat(resultadoServicio.totalPagar.replace(/[^\d.-]/g, '')) === 0;
            if (noPago) message = "no tiene valores por pagar";
        } else if (serviceType === 'agua_loja' || serviceType === 'predio_urbano') {
            if (!resultadoServicio.servicios || resultadoServicio.servicios.length === 0) message = "no tiene valores por pagar";
        }

        ResponseHandler.success(res, {
            identificacion_detectada: identificacion,
            tipo_detectado: tipoIdentificacion,
            datos_servicio: resultadoServicio
        }, message);

    } catch (error) {
        // console.error("Error en orquestador:", error);
        ResponseHandler.internalError(res, error);
    }
};
