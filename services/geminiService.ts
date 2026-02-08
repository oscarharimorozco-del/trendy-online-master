import { AspectRatio, ImageSize } from "../types";

const getApiKey = () => (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || "";

const storeInstruction = "Eres el Curador Maestro de Gihart & Hersel. Tu misión es ayudar al CLIENTE a encontrar piezas de arte y moda de lujo. Tono elegante y sofisticado. Siempre dirige al cierre de venta en WhatsApp.";
const adminInstruction = "Eres el Director de Estrategia de Gihart & Hersel. Tu misión es ayudar al ADMINISTRADOR a gestionar el negocio. Crea anuncios seguros para Facebook, reescribe descripciones en tono de lujo e inventa nombres creativos.";

// Variable global para guardar el modelo que sí funcione
let cachedModel: string | null = null;

export const geminiService = {
  // Función para encontrar qué modelo tiene activo este usuario
  discoverBestModel: async (apiKey: string) => {
    if (cachedModel) return cachedModel;
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();
      
      if (data.models) {
        // Buscamos primero un 'flash' y si no un 'pro'
        const best = data.models.find((m: any) => 
          m.supportedGenerationMethods.includes('generateContent') && 
          (m.name.includes('flash') || m.name.includes('pro'))
        );
        
        if (best) {
          cachedModel = best.name; // Ej: 'models/gemini-1.5-flash'
          console.log("¡Modelo detectado y listo!", cachedModel);
          return cachedModel;
        }
      }
    } catch (e) {
      console.error("Error descubriendo modelo:", e);
    }
    return 'models/gemini-pro'; // Fallback por si todo falla
  },

  chat: async (history: any[], message: string, productsContext: string, mode: 'store' | 'admin' = 'store') => {
    const apiKey = getApiKey();
    const modelPath = await geminiService.discoverBestModel(apiKey);
    
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;
    
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
      
      if (data.error) throw new Error(data.error.message);

      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta." };
    } catch (error: any) {
      console.error("Chat Error:", error);
      throw error;
    }
  },

  generateVoiceResponse: async (text: string) => null,
  getQuickSuggestion: async (topic: string) => {
    try {
      const res = await geminiService.chat([], `Sugerencia corta de 10 palabras sobre: ${topic}`, "");
      return res.text;
    } catch { return "El lujo es una declaración de principios."; }
  },

  generateImage: async () => { throw new Error("Mantenimiento"); },
  editImage: async () => { throw new Error("Mantenimiento"); },

  utils: {
    decode: (base64: string) => new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0))),
    decodeAudioData: async (data: any, ctx: any) => ctx.createBuffer(1, 1, 44100),
    encode: (bytes: any) => btoa(String.fromCharCode(...bytes))
  }
};
