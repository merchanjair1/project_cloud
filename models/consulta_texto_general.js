
/**
 * Modelo para Servicio de Texto General
 * Simula la estructura de otros modelos de consulta (luz, agua, sri)
 * para mantener consistencia en el orquestador.
 */

exports.extraerDatos = async (textoCompleto) => {
    // Aquí se podría agregar lógica adicional de procesamiento o limpieza
    // Por ahora, simplemente retornamos el texto estructurado

    if (!textoCompleto || textoCompleto.trim().length === 0) {
        return null;
    }

    return {
        contenido: textoCompleto,
        longitud: textoCompleto.length,
        timestamp: new Date().toISOString()
    };
};
