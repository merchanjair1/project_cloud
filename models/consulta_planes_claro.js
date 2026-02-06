const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function extraerDatos(num) {
    const options = new chrome.Options();
    // En producción (Render) debe ser headless
    if (process.env.NODE_ENV === 'production') {
        options.addArguments("--headless=new");
    }
    options.addArguments("--disable-gpu");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");

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
        await driver.sleep(6000);

        // Extraer texto del resultado (XPath o selector genérico)
        let paragraphText = "";
        try {
            paragraphText = await driver.wait(until.elementLocated(By.xpath(XPATH_RESULTADO)), 10000).getText();
            console.log("✅ Resultado extraído por XPath.");
        } catch (e) {
            console.log("⚠️ XPath del resultado falló, buscando etiqueta 'p' o 'span'...");
            paragraphText = await driver.findElement(By.css('p, span.resultado, .result-text')).getText();
        }

        return paragraphText;

    } catch (error) {
        console.error("Error en model Claro:", error.message);
        throw error;
    } finally {
        await driver.quit();
    }
}

module.exports = { extraerDatos };
