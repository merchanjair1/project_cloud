const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function extraerDatos(identificacion, tipo = "CED") {
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
        await driver.get("https://consultaweb.ant.gob.ec/PortalWEB/paginas/clientes/clp_criterio_consulta.jsp");
        console.log("Accediendo a la página de ANT...");

        // 1. Seleccionar tipo (CED o PLA)
        let selectTipo = await driver.wait(until.elementLocated(By.id("ps_tipo_identificacion")), 10000);
        await selectTipo.sendKeys(tipo);

        // 2. Ingresar la identificación
        let inputIdentificacion = await driver.findElement(By.id("ps_identificacion"));
        await inputIdentificacion.sendKeys(identificacion);
        console.log(`Buscando ${tipo}: ${identificacion}`);

        // 3. Clic en el botón de búsqueda (icono de lupa)
        // El botón es un link que llama a javascript:validar()
        let btnBusqueda = await driver.findElement(By.css("a[href*='validar']"));
        await btnBusqueda.click();

        console.log("Consulta enviada. Esperando resultados...");

        // Esperar a que cargue la tabla de resultados o el contenedor con el nombre
        // Según el HTML, el nombre aparece en un td con clase 'titulo1'
        await driver.wait(until.elementLocated(By.className("titulo1")), 15000);

        // Extraer Nombre y Puntos
        let celdasTitulo = await driver.findElements(By.className("titulo1"));
        let nombre = "";
        let puntos = "0";

        for (let celda of celdasTitulo) {
            let texto = await celda.getText();
            if (texto.includes("Puntos:")) {
                // A veces los puntos están en la celda siguiente o dentro de ella
                // Intentamos buscar el valor numérico
                let match = texto.match(/\d+/);
                if (match) puntos = match[0];
            } else if (texto.length > 10 && !texto.includes("CED") && !texto.includes("Puntos")) {
                nombre = texto.trim();
            }
        }

        // Si no se capturaron bien en el loop anterior, intentar específicamente el valor de puntos
        if (puntos === "0") {
            try {
                let puntosLink = await driver.findElement(By.css("a[title*='Información adicional de Puntos']"));
                puntos = await puntosLink.getText();
            } catch (e) {
                console.log("No se pudo extraer puntos por selector específico.");
            }
        }

        // Extraer resumen de valores desde el iframe_estado_cuenta
        let resumenValores = {};
        try {
            console.log("🖼️ Accediendo al iframe de estado de cuenta...");
            const iframe = await driver.wait(until.elementLocated(By.id("iframe_estado_cuenta")), 10000);
            await driver.switchTo().frame(iframe);

            // Extraer todo el texto del cuerpo del iframe para usar regex
            let bodyText = await driver.findElement(By.tagName("body")).getText();
            console.log("📄 Texto completo del iframe:", bodyText);

            const extraerValor = (label) => {
                const regex = new RegExp(`${label}:\\s*\\$\\s*([\\d,.]+)`, "i");
                const match = bodyText.match(regex);
                return match ? `$ ${match[1]}` : "$ 0,00";
            };

            resumenValores.pendiente = extraerValor("Valor Pendiente");
            resumenValores.convenio = extraerValor("Valor Convenio");
            resumenValores.intereses = extraerValor("Intereses Pendiente");
            resumenValores.remision = extraerValor("Total remisión");
            resumenValores.ant = extraerValor("ANT");
            resumenValores.total = extraerValor("TOTAL");

            console.log("✅ Resumen extraído:", resumenValores);
            await driver.switchTo().defaultContent();
        } catch (e) {
            console.log("No se pudo acceder al iframe de estado de cuenta o extraer valores.");
            await driver.switchTo().defaultContent();
        }

        // Extraer totales de la barra de radios (P, R, A, G, C)
        let resumenMultas = { ...resumenValores };

        // Extraer detalles de la tabla de infracciones (#list10)
        let infracciones = [];
        try {
            console.log("📄 Extrayendo tabla de infracciones...");
            // Esperar a que la tabla tenga alguna fila que no sea el header
            await driver.wait(until.elementLocated(By.css("#list10 tr.jqgrow")), 5000);
            let filas = await driver.findElements(By.css("#list10 tr.jqgrow"));

            for (let fila of filas) {
                let celdas = await fila.findElements(By.tagName("td"));
                if (celdas.length > 10) {
                    infracciones.push({
                        infraccion: (await celdas[1].getText()).trim(),
                        entidad: (await celdas[2].getText()).trim(),
                        citacion: (await celdas[3].getText()).trim(),
                        fecha: (await celdas[6].getText()).trim(),
                        multa: (await celdas[14].getText()).trim(),
                        total: (await celdas[16].getText()).trim(),
                        articulo: (await celdas[17].getText()).trim()
                    });
                }
            }
        } catch (e) {
            console.log("No se encontraron infracciones en la tabla o tardó mucho en cargar.");
        }

        return {
            nombre,
            puntos,
            resumen: resumenMultas,
            infracciones,
            mensaje: `El usuario ${nombre} tiene ${puntos} puntos y ${resumenMultas.pendientes || infracciones.length || 0} multas pendientes.`
        };

    } catch (error) {
        console.error("Error en model ANT:", error.message);
        throw error;
    } finally {
        await driver.quit();
    }
}

module.exports = { extraerDatos };
