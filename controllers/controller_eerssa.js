const ResponseHandler = require('../utils/responseHandler');
const { consultarDeuda } = require('../models/consulta_luz_eerssa');

exports.getDeuda = async (req, res) => {
    const { identificacion, tipo } = req.body;

    if (!identificacion || !tipo) {
        return ResponseHandler.badRequest(res, "Faltan parámetros: 'identificacion' y 'tipo' son requeridos.");
    }

    if (tipo !== 'cedula' && tipo !== 'servicio') {
        return ResponseHandler.badRequest(res, "Tipo inválido. Usa 'cedula' o 'servicio'.");
    }

    try {
        const resultado = await consultarDeuda(identificacion, tipo);

        if (!resultado) {
            return ResponseHandler.notFound(res, `No existen datos para el ${tipo} ingresado.`);
        }

        const message = (!resultado.deuda) ? "no tiene valores por pagar" : "Operación exitosa";

        ResponseHandler.success(res, resultado, message);
    } catch (error) {
        ResponseHandler.internalError(res, error);
    }
};
