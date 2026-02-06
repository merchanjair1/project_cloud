require('dotenv').config();

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("❌ No API Key found");
        return;
    }

    try {
        console.log("🔍 Consultando modelos disponibles...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.models) {
            console.log("No models found.");
            return;
        }

        console.log("MODELS_START");
        data.models.forEach(m => {
            // Imprimir solo el nombre si contiene "flash"
            if (m.name.includes("flash")) {
                console.log(m.name);
            }
        });
        console.log("MODELS_END");

    } catch (error) {
        console.error("❌ Error listando modelos:", error.message);
    }
}

listModels();
