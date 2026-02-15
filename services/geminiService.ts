import { AspectRatio, ImageSize } from "../types";
import { supabase } from "./supabase";

// Gestión inteligente de múltiples llaves de API (Gemini y Groq)
// Gestión inteligente de múltiples llaves de API (Gemini y Groq)
export const getApiKeys = async () => {
  const allKeys = (import.meta.env.VITE_GEMINI_API_KEY as string || "").split(',').map(k => k.trim()).filter(Boolean);

  // Intentar cargar llaves desde Supabase (Donde están tus 6 llaves nuevas)
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'gemini_keys').single();
    if (data?.value) {
      const dbKeys = data.value.split(/[\s,]+/).map((k: string) => k.trim()).filter(Boolean);
      allKeys.push(...dbKeys);
    }
  } catch (e) { console.warn("No se pudieron cargar llaves de DB"); }

  const localKeys = localStorage.getItem('custom_gemini_keys');
  if (localKeys) {
    try {
      const parsed = JSON.parse(localKeys);
      if (Array.isArray(parsed)) allKeys.push(...parsed);
    } catch {
      allKeys.push(localKeys.trim());
    }
  }

  return {
    groq: [...new Set(allKeys.filter(k => k.startsWith('gsk_')))],
    gemini: [...new Set(allKeys.filter(k => k.startsWith('AIza')))]
  };
};

const storeInstruction = `Eres el Curador Maestro de Gihart & Hersel. 
Tono sofisticado, elegante pero cercano. 

REGLAS DE PRECIOS CRÍTICAS:
1. **PRECIO PÚBLICO**: Es el precio unitario (para 1 pieza). Es el que debes dar por defecto.
2. **PRECIO PROMO**: Si el producto tiene un precio de promoción, dale prioridad absoluta.
3. **PRECIO MAYOREO**: Solo aplica en la compra de 6 piezas o más. Menciónalo como un beneficio adicional.
4. **NUNCA INVENTES**: Si un precio no está claro, invita al cliente a concretar en WhatsApp para una cotización formal.

REGLAS DE PRODUCTO:
5. **ESTADO**: Si un producto dice "AGOTADO", no lo ofrezcas activamente.
6. **TALLAS**: Usa nombres claros.

ESTILO:
7. Respuestas breves, elegantes, usando negritas para precios y nombres. Usa emojis sutiles.`;

const adminInstruction = "Eres el Director de Estrategia. Sé breve, ejecutivo y directo. No saludes con textos largos.";

let cachedModel: string | null = null;

export const geminiService = {
  discoverBestModel: async (apiKey: string) => {
    if (apiKey.startsWith('gsk_')) return 'llama-3.3-70b-versatile';
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

  chat: async (history: any[], message: string, productsContext: string, mode: 'store' | 'admin' = 'store', imagesBase64?: string[]) => {
    const keys = await getApiKeys();
    let lastError: any = null;

    // 1. Intentar con GROQ primero (Si hay llaves)
    for (const key of keys.groq) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: mode === 'admin' ? adminInstruction : storeInstruction + "\n\nCONTEXTO:\n" + productsContext },
              ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
              { role: "user", content: message }
            ]
          })
        });
        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return { text: data.choices[0].message.content };
        }
      } catch (e) {
        console.warn("Groq falló en web, probando siguiente...");
        lastError = e;
      }
    }

    // 2. Fallback a GEMINI
    for (const key of keys.gemini) {
      try {
        const modelPath = await geminiService.discoverBestModel(key);
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${key}`;
        const fullInstruction = mode === 'admin' ? adminInstruction : storeInstruction;
        const prompt = `INSTRUCCIONES: ${fullInstruction}\n\nCONTEXTO: ${productsContext}\n\nORDEN: ${message}`;
        const parts: any[] = [{ text: prompt }];

        if (imagesBase64 && imagesBase64.length > 0) {
          imagesBase64.forEach(img => {
            const mimeType = img.match(/:(.*?);/)?.[1] || "image/png";
            const data = img.split(',')[1];
            parts.push({ inline_data: { mime_type: mimeType, data: data } });
          });
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        });

        const data = await response.json();
        if (data.error) continue;
        return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta." };
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    throw lastError || new Error("No hay llaves de IA disponibles.");
  },

  generateVoiceResponse: async (text: string) => {
    const keysData = await getApiKeys();
    const keys = keysData.gemini;
    for (const key of keys) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Responsable de tienda: ${text}` }] }],
            generationConfig: { responseModalities: ["AUDIO"] }
          })
        });
        const data = await response.json();
        if (data.error) continue;
        return data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } catch (e) { continue; }
    }
    return null;
  },

  generateImage: async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize) => {
    throw new Error("El motor 'Imagen' requiere una llave de API con facturación activa.");
  },

  editImage: async (sourceImageBase64: string, prompt: string) => {
    const keys = getApiKeys().gemini;
    for (const key of keys) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
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
        if (resData.error) continue;
        return resData.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (e) { continue; }
    }
    return null;
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
