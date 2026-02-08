import { AspectRatio, ImageSize } from "../types";

const getApiKey = () => (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || "";

const storeInstruction = "Eres el Curador Maestro de Gihart & Hersel. Tu misión es ayudar al CLIENTE a encontrar piezas de arte y moda de lujo. Tono elegante y sofisticado. Siempre dirige al cierre de venta en WhatsApp.";
const adminInstruction = "Eres el Director de Estrategia de Gihart & Hersel. Tu misión es ayudar al ADMINISTRADOR a gestionar el negocio. Crea anuncios seguros para Facebook, reescribe descripciones en tono de lujo e inventa nombres creativos.";

export const geminiService = {
  chat: async (history: any[], message: string, productsContext: string, mode: 'store' | 'admin' = 'store') => {
    const apiKey = getApiKey();
    // MODELOS A PROBAR: Si falla uno, probamos el otro.
    const modelNames = ['gemini-1.5-flash', 'gemini-pro'];
    let lastError = "";

    for (const modelName of modelNames) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      try {
        const fullInstruction = mode === 'admin' ? adminInstruction : storeInstruction;
        const prompt = `INSTRUCCIONES: ${fullInstruction}\n\nINVENTARIO: ${productsContext}\n\nMENSAJE: ${message}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message;
          continue; // Intentamos con el siguiente modelo
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
        return { text: reply };
      } catch (error: any) {
        lastError = error.message;
      }
    }

    throw new Error(`Google nos sigue ganando: ${lastError}`);
  },

  generateVoiceResponse: async (text: string) => { return null; },
  getQuickSuggestion: async (topic: string) => {
    try {
      const res = await geminiService.chat([], `Sugerencia de 10 palabras sobre: ${topic}`, "");
      return res.text;
    } catch { return "El legado del lujo es eterno."; }
  },

  generateImage: async () => { throw new Error("Mantenimiento"); },
  editImage: async () => { throw new Error("Mantenimiento"); },

  utils: {
    decode: (base64: string) => new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0))),
    decodeAudioData: async (data: any, ctx: any) => ctx.createBuffer(1, 1, 44100),
    encode: (bytes: any) => btoa(String.fromCharCode(...bytes))
  }
};
