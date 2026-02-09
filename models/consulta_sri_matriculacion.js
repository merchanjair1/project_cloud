const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function extraerDatos(placa) {
    const options = new chrome.Options();
    options.addArguments(
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--window-size=1920,1080"
    );

    let driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    try {
        await driver.get("https://srimatricula.com/");
        console.log("Accediendo a la página...");

        // Esperar a que la página cargue completamente
        await driver.sleep(2000);

        // Esperar a que el input sea visible e interactuable
        let inputPlaca = await driver.wait(until.elementLocated(By.id("txtPlaca")), 10000);
        await driver.wait(until.elementIsVisible(inputPlaca), 10000);

        // Espera adicional para asegurar interactividad
        await driver.sleep(1000);

        // Intentar con sendKeys primero
        try {
            await inputPlaca.sendKeys(placa);
            console.log(`Placa ingresada: ${placa}`);
        } catch (e) {
            // Si sendKeys falla, usar JavaScript para inyectar el valor
            console.log("sendKeys falló, usando JavaScript injection...");
            await driver.executeScript(`document.getElementById('txtPlaca').value = '${placa}'`);
            console.log(`Placa ingresada con JS: ${placa}`);
        }

        let btnConsultar = await driver.wait(until.elementLocated(By.id("btnConsultar")), 5000);
        await driver.sleep(500); // Pequeña espera antes del click

        try {
            await btnConsultar.click();
        } catch (e) {
            // Si click falla, usar JavaScript
            console.log("Click falló, usando JavaScript...");
            await driver.executeScript(`document.getElementById('btnConsultar').click()`);
        }
        console.log("Botón Consultar clickeado...");

        await driver.wait(async () => {
            let form = await driver.findElement(By.id("formVehiculo"));
            let isDisplayed = await form.isDisplayed();
            return isDisplayed;
        }, 15000);

        console.log("Datos visibles en la página...");

        let datos = await driver.executeScript(() => {
            return {
                marca: document.getElementById("lblMarca")?.innerText || "No disponible",
                modelo: document.getElementById("lblModelo")?.innerText || "No disponible",
                anio: document.getElementById("lblAnioAuto")?.innerText || "No disponible",
                pais: document.getElementById("lblPais")?.innerText || "No disponible",
                totalPagar: document.getElementById("lblTotal")?.innerText || "No disponible"
            };
        });

        console.log("Datos extraídos:");
        console.log(`Marca: ${datos.marca}`);
        console.log(`Modelo: ${datos.modelo}`);
        console.log(`Año: ${datos.anio}`);
        console.log(`País: ${datos.pais}`);
        console.log(`Total a pagar: ${datos.totalPagar}`);

        return datos;

    } catch (error) {
        console.error("Error:", error);
        return null; // Return null to indicate no data found
    } finally {
        await driver.quit();
    }
}

module.exports = { extraerDatos };
