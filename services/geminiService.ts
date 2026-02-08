import { AspectRatio, ImageSize } from "../types";

const getApiKey = () => {
  const localKey = localStorage.getItem('custom_gemini_key');
  if (localKey) return localKey.trim();
  return (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || "";
};

const storeInstruction = "Eres el Curador Maestro de Gihart & Hersel. Tono sofisticado. Ayuda al cliente y cierra en WhatsApp.";
const adminInstruction = "Eres el Director de Estrategia. Sé breve, ejecutivo y directo. No saludes con textos largos. Si hay imagen, úsala para cumplir la orden del usuario (crear descripción, anuncio, etc.) de forma inmediata.";

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
        if (best) { cachedModel = best.name; return cachedModel; }
      }
    } catch (e) { console.error(e); }
    return 'models/gemini-1.5-flash';
  },

  chat: async (history: any[], message: string, productsContext: string, mode: 'store' | 'admin' = 'store', imageBase64?: string) => {
    const apiKey = getApiKey();
    const modelPath = await geminiService.discoverBestModel(apiKey);
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

    try {
      const fullInstruction = mode === 'admin' ? adminInstruction : storeInstruction;
      const prompt = `INSTRUCCIONES: ${fullInstruction}\n\nCONTEXTO: ${productsContext}\n\nORDEN: ${message}`;

      const parts: any[] = [{ text: prompt }];

      if (imageBase64) {
        const mimeType = imageBase64.match(/:(.*?);/)?.[1] || "image/png";
        const data = imageBase64.split(',')[1];
        parts.push({ inline_data: { mime_type: mimeType, data: data } });
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
          contents: [{ parts: [{ text: `Responsable de tienda: ${text}` }] }],
          generationConfig: { responseModalities: ["AUDIO"] }
        })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) { return null; }
  },

  generateImage: async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize) => {
    throw new Error("Motor 'Imagen' no vinculado.");
  },

  editImage: async (sourceImageBase64: string, prompt: string) => {
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
              { text: `Edita esta imagen siguiendo esta orden: ${prompt}` }
            ]
          }]
        })
      });
      const resData = await response.json();
      return resData.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e: any) { throw e; }
  },

  getQuickSuggestion: async (topic: string) => {
    try {
      const res = await geminiService.chat([], `10 palabras sobre: ${topic}`, "");
      return res.text;
    } catch { return "Legacy of Luxury."; }
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
