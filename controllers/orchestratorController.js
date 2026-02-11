const visionService = require('../services/ocrService');
const eerssaModel = require('../models/consulta_luz_eerssa');
const sriModel = require('../models/consulta_sri_matriculacion');
const clearModel = require('../models/consulta_planes_claro');
const antModel = require('../models/consulta_ant');
const textoGeneralModel = require('../models/consulta_texto_general');
const ResponseHandler = require('../utils/responseHandler');

// Validación de Cédula (Algoritmo Módulo 10)
function validateCedula(cedulaRaw) {
    const cedula = cedulaRaw.replace(/-/g, ''); // Eliminar guiones
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
            // Buscar cédula (10 dígitos o 9-1)
            const matches = text.match(/\b\d{9}-?\d{1}\b/g) || [];
            const rawId = matches.find(validateCedula);
            if (rawId) {
                identificacion = rawId.replace(/-/g, '');
                tipoIdentificacion = 'cedula';
            }
        } else if (serviceType === 'claro_planes') {
            const matches = text.match(/\b09\d{8}\b/g) || [];
            identificacion = matches.find(validateCelular);
            tipoIdentificacion = 'numero';
        } else if (serviceType === 'sri_matriculacion') {
            identificacion = extractPlaca(text);
            tipoIdentificacion = 'placa';
        } else if (serviceType === 'ocr_cedula') {
            const matches = text.match(/\b\d{9}-?\d{1}\b/g) || [];
            const rawId = matches.find(validateCedula);

            if (rawId) {
                identificacion = rawId.replace(/-/g, ''); // Limpiar guion para consistencia
                // Nota: Podríamos devolver rawId si queremos mostrar el guion, pero mejor estándar.
            }
            tipoIdentificacion = 'cedula';

            let textBack = '';
            if (req.body.base64ImageBack) {
                console.log("[OCR] Procesando reverso...");
                textBack = await visionService.detectTextFromBase64(req.body.base64ImageBack);
            }

            resultadoServicio = {
                ocr_frontal: text,
                ocr_reverso: textBack,
                es_doble_cara: true,
                identificacion_detectada: identificacion // Usamos la limpia
            };

            if (!identificacion) identificacion = "NO_DETECTADA";
        } else if (serviceType === 'texto_general') {
            identificacion = "TEXTO_GENERAL";
            tipoIdentificacion = 'texto';
        } else if (serviceType === 'ant_multas') {
            // ANT puede buscar por placa o cédula, pero priorizamos PLACA
            const placaMatch = extractPlaca(text);
            const cedulaMatches = (text.match(/\b\d{9}-?\d{1}\b/g) || []);
            const rawCedula = cedulaMatches.find(validateCedula);

            if (placaMatch) {
                identificacion = placaMatch;
                tipoIdentificacion = 'placa';
            } else if (rawCedula) {
                identificacion = rawCedula.replace(/-/g, '');
                tipoIdentificacion = 'cedula';
            }
        } else {
            return ResponseHandler.badRequest(res, 'Tipo de servicio no soportado.');
        }

        if (!identificacion && serviceType !== 'ocr_cedula') {
            let mensajeAmigable = '';
            if (serviceType === 'luz_loja') {
                mensajeAmigable = 'No se pudo detectar un número de cédula válido en la imagen. Por favor, asegúrese de que la foto sea clara y legible.';
            } else if (serviceType === 'sri_matriculacion') {
                mensajeAmigable = 'No se pudo detectar un número de placa válido en la imagen. Por favor, intente con una foto más clara.';
            } else if (serviceType === 'ant_multas') {
                mensajeAmigable = 'No se pudo detectar un número de placa válido en la imagen para consultar multas ANT. Asegúrese de capturar la placa del vehículo.';
            } else {
                mensajeAmigable = `No se pudo detectar un documento válido para ${serviceType}.`;
            }
            return ResponseHandler.notFound(res, mensajeAmigable);
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
            // Mensaje más específico según el tipo de servicio
            let mensajeNoEncontrado = '';
            if (serviceType === 'luz_loja') {
                mensajeNoEncontrado = `La cédula ${identificacion} NO ESTA REGISTRADA como cliente del servicio de luz eléctrica (EERSSA).`;
            } else if (serviceType === 'sri_matriculacion') {
                mensajeNoEncontrado = `No se encontró información de matriculación vehicular para la placa ${identificacion}, la placa NO ESTA REGISTRADA en el sistema del SRI.`;
            } else if (serviceType === 'ant_multas') {
                const tipoTexto = tipoIdentificacion === 'placa' ? 'la placa' : 'la cédula';
                mensajeNoEncontrado = `No se encontraron multas registradas en la ANT para ${tipoTexto} ${identificacion}.`;
            } else {
                mensajeNoEncontrado = `No se encontraron datos en el servicio para: ${identificacion}`;
            }
            return ResponseHandler.notFound(res, mensajeNoEncontrado);
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
