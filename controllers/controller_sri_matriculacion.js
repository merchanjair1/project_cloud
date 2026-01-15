const ResponseHandler = require('../utils/responseHandler');
const consultaModel = require('../models/consulta_sri_matriculacion');

module.exports.consultarDatos = async (req, res) => {
    const { placa } = req.body;

    if (!placa) {
        return ResponseHandler.badRequest(res, "La placa es requerida");
    }

    try {
        const datos = await consultaModel.extraerDatos(placa);

        if (datos.error) {
            return ResponseHandler.internalError(res, datos.error);
        }

        // Check if totalPagar is "No disponible", "0.00", or implies no debt
        const noPago = !datos.totalPagar || datos.totalPagar === "No disponible" || parseFloat(datos.totalPagar.replace(/[^\d.-]/g, '')) === 0;
        const message = noPago ? "no tiene valores por pagar" : "Operación exitosa";

        return ResponseHandler.success(res, { datos }, message);
    } catch (error) {
        return ResponseHandler.internalError(res, "Hubo un error en la consulta");
    }
};

