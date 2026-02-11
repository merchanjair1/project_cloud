const { Builder, By, until } = require("selenium-webdriver");
const { getChromeOptions } = require("../utils/browserConfig");

async function extraerDatos(num) {
    const options = getChromeOptions();

    let driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    try {
        await driver.get("https://miclaro.com.ec/pagoparcial/web/index.php/llena/numero");
        console.log("Accediendo a la página de Claro...");

        let inputNum = await driver.wait(until.elementLocated(By.id("numero")), 10000);
        await inputNum.sendKeys(num);
        console.log("Número ingresado correctamente.");

        // XPath proporcionado por el usuario para el botón
        const XPATH_BOTON = "/html/body/div[3]/div/div[3]/div[2]/div/button";
        const XPATH_RESULTADO = "/html/body/div[3]/div/div[2]/span";

        console.log("🖱️ Buscando botón de consulta...");
        let btnConsulta = null;

        // Intentar primero con el XPath específico
        try {
            btnConsulta = await driver.wait(until.elementLocated(By.xpath(XPATH_BOTON)), 5000);
            if (await btnConsulta.isDisplayed()) {
                console.log("✅ Botón encontrado por XPath específico.");
            }
        } catch (e) {
            console.log("⚠️ XPath del botón falló, intentando selectores genéricos...");
            const selectors = [
                "button[type='submit']",
                "input[type='submit']",
                ".btn-primary",
                ".col-md-push-6 a",
                ".col-md-push-6 button",
                "button.btn"
            ];

            for (let selector of selectors) {
                try {
                    btnConsulta = await driver.wait(until.elementLocated(By.css(selector)), 2000);
                    if (await btnConsulta.isDisplayed()) {
                        console.log(`✅ Botón encontrado con selector: ${selector}`);
                        break;
                    }
                } catch (err) { }
            }
        }

        // Fallback final: Buscar por texto
        if (!btnConsulta) {
            console.log("🔍 Intentando buscar botón por texto...");
            try {
                btnConsulta = await driver.executeScript(`
                    return [...document.querySelectorAll('button, input[type="submit"], a.btn, a')]
                        .find(el => /consultar|continuar|enviar|siguiente/i.test(el.innerText || el.value || ""));
                `);
            } catch (e) { }
        }

        if (btnConsulta) {
            try {
                await driver.executeScript("arguments[0].scrollIntoView();", btnConsulta);
                await driver.sleep(500);
                await btnConsulta.click();
            } catch (e) {
                await driver.executeScript("arguments[0].click();", btnConsulta);
            }
        } else {
            throw new Error("No se pudo encontrar el botón de consulta.");
        }

        console.log("🚀 Consulta realizada. Esperando resultado...");
        await driver.sleep(6000); // CRÍTICO: Esperar a que cargue la respuesta

        // DEBUG: Guardar el HTML siempre para análisis
        const fs = require('fs');
        const debugPath = 'd:\\Proyectos\\PROYECTO_OCR\\debug_claro.html';
        try {
            const pageSource = await driver.getPageSource();
            fs.writeFileSync(debugPath, pageSource);
            console.log(`✅ HTML guardado en: ${debugPath}`);
        } catch (err) {
            console.error("❌ Error guardando debug HTML:", err);
        }

        // ANÁLISIS DE TEXTO VISIBLE (no source completo para evitar falsos positivos)
        let visibleText = "";
        try {
            visibleText = await driver.findElement(By.tagName('body')).getText();
            console.log("📄 Texto visible capturado (primeros 500 chars):", visibleText.substring(0, 500));
        } catch (err) {
            console.error("❌ Error extrayendo texto visible:", err);
            return null;
        }

        const lowerText = visibleText.toLowerCase();

        // CASO 1: Errores específicos detectados PRIMERO (PRIORIDAD)
        if (lowerText.includes("no tenemos información") && lowerText.includes("servicio disponible para clientes postpago")) {
            console.log("❌ Detectado: Número prepago o sin plan postpago.");
            return null;
        }

        if (lowerText.includes("no tenemos información") && lowerText.includes("vuelve a ingresarla")) {
            console.log("❌ Detectado: Número inválido (no existe).");
            return null;
        }

        if (lowerText.includes("verifica que sea correcta")) {
            console.log("❌ Detectado: Error de validación del número.");
            return null;
        }

        // CASO 2: Éxito - Número válido sin deuda
        if (lowerText.includes("tu línea no tiene deuda activa") || lowerText.includes("no tienes pagos pendientes")) {
            console.log("✅ Detectado: Número válido sin deuda activa.");
            return "Tu línea no tiene deuda activa.";
        }

        if (lowerText.includes("buenas noticias") && lowerText.includes("no tiene pagos pendientes")) {
            console.log("✅ Detectado: Sin pagos pendientes.");
            return "Tu línea no tiene deuda activa.";
        }

        // Si no se detectó ningún patrón conocido
        console.log("⚠️ No se detectó ningún patrón conocido en el texto visible.");
        console.log("🔍 Texto completo:", visibleText);
        return null;

    } catch (error) {
        console.error("Error en model Claro:", error.message);
        throw error;
    } finally {
        await driver.quit();
    }
}

module.exports = { extraerDatos };
