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

        // Esperar que la página cargue completamente
        await driver.sleep(2000);

        // 1. Seleccionar tipo (CED o PLA)
        let selectTipo = await driver.wait(until.elementLocated(By.id("ps_tipo_identificacion")), 10000);
        await driver.sleep(500);

        try {
            await selectTipo.sendKeys(tipo);
        } catch (e) {
            console.log("sendKeys falló en select, usando JavaScript...");
            await driver.executeScript(`document.getElementById('ps_tipo_identificacion').value = '${tipo}'`);
        }

        // 2. Ingresar la identificación
        let inputIdentificacion = await driver.findElement(By.id("ps_identificacion"));
        await driver.sleep(500);

        try {
            await inputIdentificacion.sendKeys(identificacion);
        } catch (e) {
            console.log("sendKeys falló en input, usando JavaScript...");
            await driver.executeScript(`document.getElementById('ps_identificacion').value = '${identificacion}'`);
        }
        console.log(`Buscando ${tipo}: ${identificacion}`);

        // 3. Clic en el botón de búsqueda (icono de lupa)
        await driver.sleep(1000);

        try {
            let btnBusqueda = await driver.findElement(By.css("a[href*='validar']"));
            await btnBusqueda.click();
        } catch (e) {
            console.log("Click falló, usando JavaScript para submit...");
            await driver.executeScript("validar();");
        }

        console.log("Consulta enviada. Esperando resultados...");

        // Esperar más tiempo y verificar si hay resultados o mensaje de error
        await driver.sleep(3000);

        // Intentar localizar resultados con timeout más largo
        try {
            await driver.wait(until.elementLocated(By.className("titulo1")), 20000);
        } catch (timeoutError) {
            // Si no encuentra resultados, verificar si hay mensaje de error o no hay datos
            console.log("No se encontró elemento titulo1, verificando contenido de página...");

            // Obtener todo el texto visible de la página
            const bodyText = await driver.findElement(By.tagName("body")).getText();
            console.log("Texto de la página:", bodyText.substring(0, 500)); // Primeros 500 caracteres

            // PRIMERO: Verificar si hay indicadores POSITIVOS de datos de multas
            const hasMultasData = bodyText.includes("Pendientes") ||
                bodyText.includes("Pagadas") ||
                bodyText.includes("En Impugnación") ||
                bodyText.includes("Citaciones");

            // Verificar diferentes mensajes de "sin resultados"
            const noResultsKeywords = [
                "no se encontraron registros",
                "sin resultados",
                "no existe",
                "no hay información",
                "sin información",
                "datos no disponibles",
                "no se encontró información",
                "consulta sin resultados"
            ];

            // Solo verificar "sin resultados" si NO hay datos de multas
            if (!hasMultasData) {

                const hasNoResults = noResultsKeywords.some(keyword =>
                    bodyText.toLowerCase().includes(keyword)
                );

                if (hasNoResults) {
                    console.log("✓ No se encontraron registros para esta identificación en ANT.");
                    return null; // Retornar null para indicar "sin resultados"
                }

                // Si el body está prácticamente vacío o solo tiene el formulario
                if (bodyText.length < 100) {
                    console.log("✓ La página no retornó resultados (cuerpo vacío).");
                    return null;
                }
            } else {
                console.log("⚠️ Datos de multas detectados. Continuando extracción...");
            }
        }

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

                // DEBUG: Imprimir todas las columnas para identificar índices correctos
                if (infracciones.length === 0) {
                    console.log(`📊 Total de columnas: ${celdas.length}`);
                    for (let i = 0; i < celdas.length; i++) {
                        const valor = await celdas[i].getText();
                        console.log(`  Columna ${i}: "${valor}"`);
                    }
                }

                if (celdas.length > 10) {
                    // Basado en observación: col2=Infracción, col3=Entidad, col4=Citación,
                    // col7=Fecha, col14=Sanción, col??=Total
                    infracciones.push({
                        infraccion: (await celdas[2].getText()).trim(),
                        entidad: (await celdas[3].getText()).trim(),
                        citacion: (await celdas[4].getText()).trim(),
                        fecha: (await celdas[7].getText()).trim(),
                        sancion: (await celdas[14].getText()).trim(),
                        total: (await celdas[celdas.length - 1].getText()).trim() // Última columna
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
