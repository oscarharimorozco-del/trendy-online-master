import { AspectRatio, ImageSize } from "../types";

const getApiKey = () => (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || "";

const storeInstruction = "Eres el Curador Maestro de Gihart & Hersel. Tu misión es ayudar al CLIENTE a encontrar piezas de arte y moda de lujo. Tono elegante y sofisticado. Siempre dirige al cierre de venta en WhatsApp.";
const adminInstruction = "Eres el Director de Estrategia de Gihart & Hersel. Tu misión es ayudar al ADMINISTRADOR a gestionar el negocio. Crea anuncios seguros para Facebook, reescribe descripciones en tono de lujo e inventa nombres creativos. Si el usuario sube una imagen, analízala y brinda consejos específicos sobre ella.";

let cachedModel: string | null = null;

export const geminiService = {
  discoverBestModel: async (apiKey: string) => {
    if (cachedModel) return cachedModel;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();
      if (data.models) {
        const best = data.models.find((m: any) =>
          m.supportedGenerationMethods.includes('generateContent') &&
          (m.name.includes('flash') || m.name.includes('pro'))
        );
        if (best) {
          cachedModel = best.name;
          return cachedModel;
        }
      }
    } catch (e) { console.error("Error discovering model:", e); }
    return 'models/gemini-1.5-flash'; // Priorize flash for speed
  },

  chat: async (history: any[], message: string, productsContext: string, mode: 'store' | 'admin' = 'store', imageBase64?: string) => {
    const apiKey = getApiKey();
    const modelPath = await geminiService.discoverBestModel(apiKey);
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

    try {
      const fullInstruction = mode === 'admin' ? adminInstruction : storeInstruction;
      const prompt = `INSTRUCCIONES DE PERSONALIDAD: ${fullInstruction}\n\nINVENTARIO ACTUAL: ${productsContext}\n\nMENSAJE DEL USUARIO: ${message}`;

      const parts: any[] = [{ text: prompt }];

      if (imageBase64) {
        const mimeType = imageBase64.match(/:(.*?);/)?.[1] || "image/png";
        const data = imageBase64.split(',')[1];
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: data
          }
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta." };
    } catch (error: any) { throw error; }
  },

  generateVoiceResponse: async (text: string) => {
    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Vendedor de arte y moda de lujo: ${text}` }] }],
          generationConfig: { responseModalities: ["AUDIO"] }
        })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) { return null; }
  },

  // IMAGEN: Generación real con Gemini 1.5 Flash (soporta multimodal pero no generación directa de imagen per se, 
  // pero usaremos el prompt para guiar si hay algún plugin o simplemente simularemos la respuesta de lujo si el modelo cambia)
  // NOTA: Gemini 1.5 no genera imágenes DIRECTAMENTE (usa Imagen), pero para este flujo usaremos un placeholder de alta calidad
  // o conectaremos a una API de imagen si el usuario lo requiere. Por ahora, habilitaremos el flujo de "análisis y edición".

  generateImage: async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize) => {
    // Para demostración premium, si no hay API de imagen activa, devolvemos un error descriptivo o usamos un proxy.
    // Pero el usuario quiere que "funcione". Usaremos el modelo para describir y luego lo integraremos.
    throw new Error("Para generar imágenes artísticas se requiere el motor 'Imagen' activado en Google Cloud.");
  },

  editImage: async (sourceImageBase64: string, prompt: string) => {
    // Esto es multimodal: enviamos la imagen + el prompt de edición
    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const mimeType = sourceImageBase64.match(/:(.*?);/)?.[1] || "image/png";
      const data = sourceImageBase64.split(',')[1];

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: data } },
              { text: `INSTRUCCIÓN DE EDICIÓN: ${prompt}. Describe los cambios sugeridos detalladamente ya que el editor visual se encargará del renderizado.` }
            ]
          }]
        })
      });
      const resData = await response.json();
      return resData.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e: any) {
      throw e;
    }
  },

  getQuickSuggestion: async (topic: string) => {
    try {
      const res = await geminiService.chat([], `Sugerencia corta de 10 palabras sobre: ${topic}`, "");
      return res.text;
    } catch { return "El lujo es una declaración de principios."; }
  },

  utils: {
    decode: (base64: string) => {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
      return bytes;
    },
    decodeAudioData: async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
      const dataInt16 = new Int16Array(data.buffer);
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }
      return buffer;
    },
    encode: (bytes: Uint8Array) => {
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
      return btoa(binary);
    }
  }
};
