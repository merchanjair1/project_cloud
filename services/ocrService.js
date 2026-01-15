const { ImageAnnotatorClient } = require('@google-cloud/vision');

const client = new ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

async function detectTextFromBase64(base64Image) {
  // 1. Limpiamos el string eliminando 'url(', el ')' final y el prefijo 'data:image/...'
  const cleanedString = base64Image
    .replace(/^url\(/, '')                             // Quita 'url(' al inicio
    .replace(/\)$/, '')                                // Quita ')' al final
    .replace(/^data:image\/[a-zA-Z]+;base64,/, '');    // Quita el encabezado base64 estándar

  // 2. Creamos el buffer con el string ya limpio
  const imageBuffer = Buffer.from(cleanedString, 'base64');

  // 3. Procesamos con Google Vision
  const [result] = await client.documentTextDetection({ image: { content: imageBuffer } });

  return result.fullTextAnnotation?.text || '';
}

module.exports = { detectTextFromBase64 };