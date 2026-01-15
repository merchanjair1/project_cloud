const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function consultarDeuda(identificacion, tipo) {
    let options = new chrome.Options();
    options.addArguments(
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-setuid-sandbox",
        "--remote-debugging-port=9222"
    );

    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

    try {
        await driver.get('http://186.178.204.52/kioskos/cuenc/');

        const opciones = {
            "cedula": "num_cedula",
            "servicio": "num_servicio"
        };

        if (!opciones[tipo]) throw new Error("Tipo de consulta no válido");

        await driver.wait(until.elementLocated(By.id(opciones[tipo])), 2000).click();
        await driver.sleep(1000);

        let inputIdentificacion = await driver.wait(until.elementLocated(By.id("input1")), 5000);
        await inputIdentificacion.sendKeys(identificacion);

        await driver.wait(until.elementLocated(By.css("input[value='Consultar']")), 5000).click();
        await driver.sleep(1000);

        try {
            let mensajeError = await driver.findElement(By.xpath("//*[contains(text(),'No existen datos para')]"));
            if (await mensajeError.isDisplayed()) return null;
        } catch { }

        let resultadosPrimerTabla = await extraerDatosTabla(driver, "#resultados table");
        let contribuyente = resultadosPrimerTabla.length > 0 ? resultadosPrimerTabla[0] : null;

        let enlaceConsultarDeuda = await driver.wait(until.elementLocated(By.css("a[href^='javascript:mostrarDeuda']")), 2000);
        await enlaceConsultarDeuda.click();

        let resultadosDeuda = await extraerDatosDeuda(driver, "#vent table");
        let deudaData = Object.keys(resultadosDeuda).length ? resultadosDeuda : null;

        return {
            contribuyente: contribuyente,
            deuda: deudaData
        };
    } catch (error) {
        console.error("Error:", error);
        return null;
    } finally {
        await driver.sleep(1000);
        await driver.quit();
    }
}

async function extraerDatosTabla(driver, selector) {
    try {
        let tabla = await driver.wait(until.elementLocated(By.css(selector)), 3000);
        let filas = await tabla.findElements(By.css("tbody tr"));
        let datos = [];

        for (let fila of filas) {
            let celdas = await fila.findElements(By.css("td, th"));
            let filaData = await Promise.all(celdas.map(celda => celda.getText()));
            if (filaData.some(d => d.trim() !== '')) datos.push(filaData);
        }
        return datos;
    } catch {
        return [];
    }
}

async function extraerDatosDeuda(driver, selector) {
    try {
        let tabla = await driver.wait(until.elementLocated(By.css(selector)), 3000);
        let th = await tabla.findElements(By.css("th"));
        let td = await tabla.findElements(By.css("td"));
        let datos = {};
        for (let i = 0; i < th.length; i++) {
            let key = (await th[i].getText()).trim().replace(/:$/, '');
            let val = (await td[i].getText()).trim();
            if (key.toLowerCase().includes("deuda total") || key.toLowerCase().includes("consumo") || key.toLowerCase().includes("periodo") || key.toLowerCase().includes("fecha")) {
                datos[key] = val;
            }
        }
        return datos;
    } catch {
        return {};
    }
}

module.exports = { consultarDeuda };
