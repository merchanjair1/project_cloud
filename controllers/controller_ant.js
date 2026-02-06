const antModel = require('../models/consulta_ant');

module.exports.consultarDatos = async (req, res) => {
    const { identificacion, tipo } = req.body; // tipo: CED o PLA

    if (!identificacion) {
        return res.status(400).json({ error: "La identificación es obligatoria" });
    }

    // Default a CED si no viene tipo
    const queryType = tipo || "CED";

    try {
        console.log(`🚗 Iniciando consulta ANT (${queryType}) para: ${identificacion}`);
        const resultado = await antModel.extraerDatos(identificacion, queryType);

        if (resultado) {
            return res.status(200).json({
                mensaje: "Consulta de ANT exitosa",
                resumen: resultado.mensaje,
                datos: resultado
            });
        } else {
            return res.status(404).json({ error: "No se encontraron resultados en la ANT" });
        }
    } catch (error) {
        console.error("Error durante la consulta de ANT:", error);
        return res.status(500).json({ error: "Hubo un error en la consulta a la ANT" });
    }
};
