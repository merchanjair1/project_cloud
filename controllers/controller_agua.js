const model = require('../models/consulta_agua');

const ResponseHandler = require('../utils/responseHandler');

async function consultarServicio(req, res) {
    const { cedula } = req.body;
    let driver = await model.iniciarDriver();

    try {
        await driver.get("https://www.loja.gob.ec/consulta");

        await model.llenarFormulario(driver, cedula);
        await model.resolverCaptcha(driver);

        await driver.findElement({ id: "edit-save" }).click();
        await driver.sleep(1500);

        let [contribuyente, servicios, total] = await Promise.all([
            model.obtenerDatosContribuyente(driver),
            model.extraerTabla(driver),
            model.obtenerTotal(driver)
        ]);

        const message = (!servicios || servicios.length === 0) ? "no tiene valores por pagar" : "Operación exitosa";

        ResponseHandler.success(res, {
            rubro: "SERVICIO DE AGUA POTABLE",
            contribuyente,
            servicios: servicios || [],
            total: total || "0.00"
        }, message);

    } catch (err) {
        // console.error(err); // Handled in internalError
        ResponseHandler.internalError(res, err);
    } finally {
        await driver.quit();
    }
}

module.exports = { consultarServicio };
