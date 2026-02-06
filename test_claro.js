const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function testClaroSelector() {
    const options = new chrome.Options();
    options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");

    let driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    try {
        console.log("Accediendo a la página de Claro...");
        await driver.get("https://miclaro.com.ec/pagoparcial/web/index.php/llena/numero");

        let inputNum = await driver.wait(until.elementLocated(By.id("numero")), 10000);
        await inputNum.sendKeys("0987654321");
        console.log("Número ingresado.");

        console.log("🖱️ Buscando botón de consulta...");
        let btnConsulta = null;
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
                btnConsulta = await driver.wait(until.elementLocated(By.css(selector)), 3000);
                if (await btnConsulta.isDisplayed()) {
                    console.log(`✅ Botón encontrado con selector: ${selector}`);
                    break;
                }
            } catch (e) { }
        }

        if (!btnConsulta) {
            console.log("🔍 Intentando buscar botón por texto...");
            btnConsulta = await driver.executeScript(`
                return [...document.querySelectorAll('button, input[type="submit"], a.btn, a')]
                    .find(el => /consultar|continuar|enviar|siguiente/i.test(el.innerText || el.value || ""));
            `);
            if (btnConsulta) console.log("✅ Botón encontrado por TEXTO.");
        }

        if (btnConsulta) {
            console.log("🎉 BOTÓN DETECTADO CORRECTAMENTE.");
        } else {
            console.log("❌ NO SE PUDO ENCONTRAR EL BOTÓN.");
        }

    } catch (error) {
        console.error("Error en el test:", error.message);
    } finally {
        await driver.quit();
    }
}

testClaroSelector();
