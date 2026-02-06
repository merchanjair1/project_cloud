const consultaModel = require('../models/consulta_planes_claro');
const ResponseHandler = require('../utils/responseHandler');

module.exports.consultarDatos = async (req, res) => {
    const { numero } = req.body;

    // Validación: Si no se proporciona el número, responde con un error
    if (!numero) {
        return res.status(400).json({ error: "El número es obligatorio" });
    }

    try {
        console.log(`📱 Iniciando consulta de Claro para: ${numero}`);
        // Llama al modelo para realizar la consulta
        const resultado = await consultaModel.extraerDatos(numero);

        // Si la consulta tiene un resultado
        if (resultado) {
            return res.status(200).json({
                mensaje: "Consulta exitosa",
                resultado: resultado
            });
        } else {
            return res.status(404).json({ error: "No se encontraron resultados" });
        }
    } catch (error) {
        // Si ocurre un error
        console.error("Error durante la consulta de Claro:", error);
        return res.status(500).json({ error: "Hubo un error en la consulta" });
    }
};
