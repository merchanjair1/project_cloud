const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function extraerDatos(placa) {
    const options = new chrome.Options();
    options.addArguments(
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-setuid-sandbox",
        "--remote-debugging-port=9222"
    );

    let driver = await new Builder()
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    try {
        await driver.get("https://srimatricula.com/");
        console.log("Accediendo a la página...");

        let inputPlaca = await driver.wait(until.elementLocated(By.id("txtPlaca")), 5000);
        await inputPlaca.sendKeys(placa);
        console.log(`Placa ingresada: ${placa}`);

        let btnConsultar = await driver.wait(until.elementLocated(By.id("btnConsultar")), 5000);
        await btnConsultar.click();
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
