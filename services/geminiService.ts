import { AspectRatio, ImageSize } from "../types";

const getApiKey = () => (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || "";

// Instrucciones de personalidad
const storeInstruction = "Eres el Curador Maestro de Gihart & Hersel. Tu misión es ayudar al CLIENTE a encontrar piezas de arte y moda de lujo. Tono elegante y sofisticado. Siempre dirige al cierre de venta en WhatsApp.";
const adminInstruction = "Eres el Director de Estrategia de Gihart & Hersel. Tu misión es ayudar al ADMINISTRADOR a gestionar el negocio. Crea anuncios seguros para Facebook, reescribe descripciones en tono de lujo e inventa nombres creativos.";

export const geminiService = {
  // Chat por conexión directa (FETCH) - LA FORMA MÁS ESTABLE
  chat: async (history: any[], message: string, productsContext: string, mode: 'store' | 'admin' = 'store') => {
    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    try {
      const fullInstruction = mode === 'admin' ? adminInstruction : storeInstruction;
      const prompt = `INSTRUCCIONES DE PERSONALIDAD: ${fullInstruction}\n\nINVENTARIO ACTUAL: ${productsContext}\n\nMENSAJE DEL USUARIO: ${message}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta del servidor.";
      return { text: reply };
    } catch (error: any) {
      console.error("Chat Error:", error);
      throw error;
    }
  },

  // Voz secundaria (Opcional, si falla no bloquea el chat)
  generateVoiceResponse: async (text: string) => {
    // Implementación simplificada si es necesario, por ahora priorizamos el texto
    return null; 
  },

  getQuickSuggestion: async (topic: string) => {
    try {
      const res = await geminiService.chat([], `Sugerencia de 10 palabras sobre: ${topic}`, "");
      return res.text;
    } catch {
      return "El arte y la moda definen tu legado.";
    }
  },

  // Generación de imágenes (Directo al punto)
  generateImage: async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize) => {
    throw new Error("Función de imagen en mantenimiento.");
  },

  editImage: async (sourceImageBase64: string, prompt: string) => {
    throw new Error("Función de edición en mantenimiento.");
  },

  utils: {
    decode: (base64: string) => new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0))),
    decodeAudioData: async (data: any, ctx: any) => ctx.createBuffer(1, 1, 44100),
    encode: (bytes: any) => btoa(String.fromCharCode(...bytes))
  }
};
