require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    console.log("🔑 Verificando API Key...");
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
        console.error("❌ ERROR: No se encontró GEMINI_API_KEY en variables de entorno.");
        return;
    }

    console.log(`✅ Key encontrada: ${key.substring(0, 10)}...`);

    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        console.log("🤖 Enviando prueba MULTIMODAL (Texto + Imagen) a Gemini...");

        // Pixel rojo 1x1 en Base64
        const pixelBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

        const result = await model.generateContent([
            "Describe esta imagen en 2 palabras.",
            { inlineData: { data: pixelBase64, mimeType: "image/png" } }
        ]);
        const response = await result.response;
        const text = response.text();

        console.log(`✅ RESPUESTA DE GEMINI: ${text}`);
    } catch (error) {
        console.error("❌ ERROR CON LA API:", error.message);
        console.error("Detalles:", JSON.stringify(error, null, 2));
    }
}

testGemini();
