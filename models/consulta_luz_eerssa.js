const { Builder, By, until } = require('selenium-webdriver');
const { getChromeOptions } = require('../utils/browserConfig');

async function consultarDeuda(identificacion, tipo) {
    let options = getChromeOptions();

    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    const url = 'http://186.178.204.52/kioskos/cuenc/';

    try {
        let attempts = 0;
        const maxAttempts = 2;
        while (attempts < maxAttempts) {
            try {
                console.log(`[EERSSA] Accediendo a la URL: ${url} (Intento ${attempts + 1}/${maxAttempts})...`);
                await driver.get(url);
                console.log("[EERSSA] Página cargada con éxito.");
                break; // Éxito
            } catch (e) {
                attempts++;
                console.error(`[EERSSA] Intento ${attempts} falló al cargar URL: ${e.message}`);
                if (attempts >= maxAttempts) throw e;
                await driver.sleep(2000); // Esperar antes de reintentar
            }
        }

        const opciones = {
            "cedula": "num_cedula",
            "servicio": "num_servicio"
        };

        if (!opciones[tipo]) throw new Error("Tipo de consulta no válido");

        console.log(`[EERSSA] Seleccionando opción: ${tipo}...`);
        let radioOpt = await driver.wait(until.elementLocated(By.id(opciones[tipo])), 10000);
        await radioOpt.click();
        await driver.sleep(1000);

        console.log(`[EERSSA] Ingresando identificación: ${identificacion}...`);
        let inputIdentificacion = await driver.wait(until.elementLocated(By.id("input1")), 10000);
        await inputIdentificacion.sendKeys(identificacion);

        console.log("[EERSSA] Clic en Consultar...");
        let btnConsultar = await driver.wait(until.elementLocated(By.css("input[value='Consultar']")), 10000);
        await btnConsultar.click();
        await driver.sleep(2000);

        try {
            let mensajeError = await driver.findElement(By.xpath("//*[contains(text(),'No existen datos para')]"));
            if (await mensajeError.isDisplayed()) {
                console.log("[EERSSA] No se encontraron resultados en la página.");
                return { success: false, errorType: 'NOT_FOUND', message: 'Cédula no registrada' };
            }
        } catch { }

        console.log("[EERSSA] Extrayendo datos del contribuyente...");
        let resultadosPrimerTabla = await extraerDatosTabla(driver, "#resultados table");
        let contribuyente = resultadosPrimerTabla.length > 0 ? resultadosPrimerTabla[0] : null;

        console.log("[EERSSA] Clic en detalle de deuda...");
        let enlaceConsultarDeuda = await driver.wait(until.elementLocated(By.css("a[href^='javascript:mostrarDeuda']")), 10000);
        await enlaceConsultarDeuda.click();
        await driver.sleep(1500);

        console.log("[EERSSA] Extrayendo detalle de deuda...");
        let resultadosDeuda = await extraerDatosDeuda(driver, "#vent table");
        let deudaData = Object.keys(resultadosDeuda).length ? resultadosDeuda : null;

        console.log("[EERSSA] Proceso completado con éxito.");
        return {
            success: true,
            contribuyente: contribuyente,
            deuda: deudaData
        };
    } catch (error) {
        console.error("[EERSSA] Error fatal:", error.message);
        return {
            success: false,
            errorType: 'CONNECTION_ERROR',
            message: error.message
        };
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
            let celdas = await fila.findElements(By.css("td"));
            // Si no hay td, intentar con th (encabezados)
            if (celdas.length === 0) {
                celdas = await fila.findElements(By.css("th"));
            }

            let filaData = await Promise.all(celdas.map(celda => celda.getText()));
            // Filtrar filas vacías y limpiar datos
            filaData = filaData.map(d => d.trim()).filter(d => d !== '');

            if (filaData.length > 0) {
                datos.push(filaData);
            }
        }

        // La primera fila suele ser datos del contribuyente (N° Servicio, Nombre, Dirección)
        // Devolver solo la primera fila con datos reales, no encabezados
        return datos.filter(row => !row.some(cell =>
            cell.toUpperCase().includes('CUENTA') ||
            cell.toUpperCase().includes('NOMBRE') ||
            cell.toUpperCase().includes('DIRECCION')
        ));
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
