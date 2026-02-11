const eerssaModel = require('./models/consulta_luz_eerssa');

async function testEERSSA() {
    console.log("Testing EERSSA model...");
    try {
        // Using a sample ID for testing if available, or just checking reachability
        const result = await eerssaModel.consultarDeuda("1104616053", "cedula");
        console.log("Result:", result);
    } catch (e) {
        console.error("EERSSA Test Failed:", e);
    }
}

testEERSSA();
