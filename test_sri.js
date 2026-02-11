const sriModel = require('./models/consulta_sri_matriculacion');

async function testSRI() {
    console.log("Testing SRI model...");
    try {
        const result = await sriModel.extraerDatos("PCQ6000");
        console.log("Result:", result);
    } catch (e) {
        console.error("SRI Test Failed:", e);
    }
}

testSRI();
