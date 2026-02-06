const visionService = require('../services/ocrService');
const eerssaModel = require('../models/consulta_luz_eerssa');
const sriModel = require('../models/consulta_sri_matriculacion');
const clearModel = require('../models/consulta_planes_claro');
const antModel = require('../models/consulta_ant');
const textoGeneralModel = require('../models/consulta_texto_general');
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

// Validación de Celular (Ecuador: 10 dígitos, empieza con 09)
function validateCelular(numero) {
    const regex = /^09\d{8}$/;
    return regex.test(numero);
}

exports.processServiceQuery = async (req, res) => {
    try {
        const { base64Image, serviceType } = req.body;

        if (!base64Image || !serviceType) {
            return ResponseHandler.badRequest(res, 'Faltan parámetros: base64Image y serviceType son requeridos.');
        }

        // 1. OCR: Extraer texto de la imagen
        const text = await visionService.detectTextFromBase64(base64Image);
        console.log("Texto detectado aqui:", text); // Para depuración

        let identificacion = null;
        let tipoIdentificacion = null;
        let resultadoServicio = null;

        // 2. Lógica de Detección según Servicio
        if (serviceType === 'luz_loja') {
            const matches = text.match(/\b\d{10}\b/g) || [];
            identificacion = matches.find(validateCedula);
            tipoIdentificacion = 'cedula';
        } else if (serviceType === 'claro_planes') {
            const matches = text.match(/\b09\d{8}\b/g) || [];
            identificacion = matches.find(validateCelular);
            tipoIdentificacion = 'numero';
        } else if (serviceType === 'sri_matriculacion') {
            identificacion = extractPlaca(text);
            tipoIdentificacion = 'placa';
        } else if (serviceType === 'ocr_cedula') {
            identificacion = (text.match(/\d{10}/g) || []).find(validateCedula);
            tipoIdentificacion = 'cedula';

            let textBack = '';
            if (req.body.base64ImageBack) {
                console.log("[OCR] Procesando reverso...");
                textBack = await visionService.detectTextFromBase64(req.body.base64ImageBack);
            }

            resultadoServicio = {
                ocr_frontal: text,
                ocr_reverso: textBack,
                es_doble_cara: true
            };

            if (!identificacion) identificacion = "NO_DETECTADA";
        } else if (serviceType === 'texto_general') {
            identificacion = "TEXTO_GENERAL";
            tipoIdentificacion = 'texto';
        } else if (serviceType === 'ant_multas') {
            const cedulaMatch = (text.match(/\b\d{10}\b/g) || []).find(validateCedula);
            const placaMatch = extractPlaca(text);

            if (cedulaMatch) {
                identificacion = cedulaMatch;
                tipoIdentificacion = 'cedula';
            } else if (placaMatch) {
                identificacion = placaMatch;
                tipoIdentificacion = 'placa';
            }
        } else {
            return ResponseHandler.badRequest(res, 'Tipo de servicio no soportado.');
        }

        if (!identificacion && serviceType !== 'ocr_cedula') {
            return ResponseHandler.notFound(res, `No se pudo detectar un documento válido para ${serviceType}. Texto: ${text.substring(0, 50)}...`);
        }

        // 3. Consultar Servicio Automáticamente
        if (serviceType === 'luz_loja') {
            resultadoServicio = await eerssaModel.consultarDeuda(identificacion, 'cedula');
        } else if (serviceType === 'sri_matriculacion') {
            resultadoServicio = await sriModel.extraerDatos(identificacion);
        } else if (serviceType === 'claro_planes') {
            resultadoServicio = await clearModel.extraerDatos(identificacion);
        } else if (serviceType === 'texto_general') {
            resultadoServicio = await textoGeneralModel.extraerDatos(text);
        } else if (serviceType === 'ant_multas') {
            const queryType = tipoIdentificacion === 'placa' ? 'PLA' : 'CED';
            resultadoServicio = await antModel.extraerDatos(identificacion, queryType);
        }

        // 4. Responder
        if (!resultadoServicio) {
            return ResponseHandler.notFound(res, `No se encontraron datos en el servicio para: ${identificacion}`);
        }

        let message = "Operación exitosa";
        if (serviceType === 'luz_loja') {
            if (!resultadoServicio.deuda && resultadoServicio.contribuyente) message = "no tiene valores por pagar";
            else if (!resultadoServicio.deuda && !resultadoServicio.contribuyente) message = "no tiene valores por pagar";
        } else if (serviceType === 'sri_matriculacion') {
            const noPago = !resultadoServicio.totalPagar || resultadoServicio.totalPagar === "No disponible" || parseFloat(resultadoServicio.totalPagar.replace(/[^\d.-]/g, '')) === 0;
            if (noPago) message = "no tiene valores por pagar";
        } else if (serviceType === 'claro_planes') {
            message = "Consulta de Claro exitosa";
        } else if (serviceType === 'texto_general') {
            message = "Texto extraído correctamente";
        } else if (serviceType === 'ant_multas') {
            message = resultadoServicio.mensaje || "Consulta de ANT completada";
        }

        ResponseHandler.success(res, {
            identificacion_detectada: identificacion,
            tipo_detectado: tipoIdentificacion,
            datos_servicio: resultadoServicio,
            texto_detectado: text
        }, message);

    } catch (error) {
        ResponseHandler.internalError(res, error);
    }
};
