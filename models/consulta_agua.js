const { Builder, By, until, Key } = require('selenium-webdriver');

const RUBRO_FIJO = "SERVICIO DE AGUA POTABLE";

async function iniciarDriver() {
    return await new Builder().forBrowser('chrome').build();
}

async function llenarFormulario(driver, cedula) {
    await driver.findElement(By.id("edit-cedula")).sendKeys(cedula);
    await driver.findElement(By.id("edit-rubro")).sendKeys(RUBRO_FIJO, Key.RETURN);
}

async function resolverCaptcha(driver) {
    let frame = await driver.wait(until.elementLocated(By.css('iframe[title="reCAPTCHA"]')), 10000);
    await driver.switchTo().frame(frame);

    let checkbox = await driver.findElement(By.id("recaptcha-anchor"));
    await checkbox.click();

    console.log("🛑 Resuelve el CAPTCHA...");
    await driver.wait(async () => (await checkbox.getAttribute("aria-checked")) === "true", 120000);

    await driver.switchTo().defaultContent();
}

async function obtenerDatosContribuyente(driver) {
    try {
        let nombre = await driver.findElement(By.css(".nombrecon")).getText();
        let cedula = await driver.findElement(By.css(".apecon")).getText();

        return {
            nombre: nombre.replace("Nombre :", "").trim(),
            cedula: cedula.replace("Cédula :", "").trim()
        };
    } catch (error) {
        return null; // Retornar null si no se encuentran los datos (posiblemente no hay deuda)
    }
}

async function extraerTabla(driver) {
    try {
        let filas = await driver.findElements(By.css("table.table-hover tbody tr"));
        if (!filas || filas.length === 0) return [];

        const resultados = await Promise.all(filas.map(async fila => {
            let c = await fila.findElements(By.css("td"));
            if (c.length < 6) return null; // Ensure there are enough columns
            try {
                return {
                    rubro: await c[2].getText(),
                    fechaServicio: await c[3].getText(),
                    fechaExpiracion: await c[4].getText(),
                    valor: await c[5].getText()
                };
            } catch (e) {
                return null; // Handle potential stale element references
            }
        }));

        return resultados.filter(r => r !== null);
    } catch (error) {
        return [];
    }
}

async function obtenerTotal(driver) {
    try {
        return await driver.findElement(By.css("div.totalq")).getText();
    } catch (error) {
        return "0.00";
    }
}

async function consultarDeuda(cedula) {
    let driver = await iniciarDriver();
    try {
        await driver.get("https://www.loja.gob.ec/consulta");

        await llenarFormulario(driver, cedula);
        await resolverCaptcha(driver);

        await driver.findElement({ id: "edit-save" }).click();
        await driver.sleep(1500);

        let [contribuyente, servicios, total] = await Promise.all([
            obtenerDatosContribuyente(driver),
            extraerTabla(driver),
            obtenerTotal(driver)
        ]);

        // Handle case where specific parts are missing but partial data exists
        // or return standardized object
        return {
            rubro: RUBRO_FIJO,
            contribuyente,
            servicios: servicios || [],
            total: total || "0.00"
        };
    } catch (error) {
        console.error("Error en consultarDeuda (Agua):", error);
        return null; // Or rethrow if we want controller to handle errors
    } finally {
        await driver.quit();
    }
}

module.exports = {
    iniciarDriver,
    llenarFormulario,
    resolverCaptcha,
    obtenerDatosContribuyente,
    extraerTabla,
    obtenerTotal,
    consultarDeuda
};
