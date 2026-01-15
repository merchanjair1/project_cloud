/**
 * Utilidad para estandarizar las respuestas del servidor
 */
const ResponseHandler = {
    COD_OK: 200,
    COD_ERROR: 500,
    COD_BAD_REQUEST: 400,
    COD_UNPROCESSABLE: 422,

    // Respuesta exitosa (Código 200)
    success: (res, data, message = "Operación exitosa") => {
        return res.status(ResponseHandler.COD_OK).json({
            success: true,
            code: ResponseHandler.COD_OK,
            message: message,
            data: data
        });
    },

    // Error de validación o datos faltantes (Código 400)
    badRequest: (res, message = "Datos insuficientes o inválidos") => {
        return res.status(ResponseHandler.COD_BAD_REQUEST).json({
            success: false,
            code: ResponseHandler.COD_BAD_REQUEST,
            error: message
        });
    },

    COD_NOT_FOUND: 404,

    // Recurso no encontrado (Código 404)
    notFound: (res, message = "Recurso no encontrado") => {
        return res.status(ResponseHandler.COD_NOT_FOUND).json({
            success: false,
            code: ResponseHandler.COD_NOT_FOUND,
            error: message
        });
    },

    // Error cuando no se encuentra un dato (ej. no se leyó la cédula) (Código 422)
    unprocessable: (res, message = "No se pudo procesar la imagen") => {
        return res.status(ResponseHandler.COD_UNPROCESSABLE).json({
            success: false,
            code: ResponseHandler.COD_UNPROCESSABLE,
            error: message
        });
    },

    // Error interno del servidor (Código 500)
    internalError: (res, error) => {
        console.error("Internal Error:", error);
        return res.status(ResponseHandler.COD_ERROR).json({
            success: false,
            code: ResponseHandler.COD_ERROR,
            error: "Ocurrió un error interno en el servidor",
            details: error ? (error.message || error) : "Error desconocido"
        });
    }
};

module.exports = ResponseHandler;