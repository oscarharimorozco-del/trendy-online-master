
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AspectRatio, ImageSize } from "../types";

// En Vite las variables de entorno para el navegador deben tener prefijo VITE_
const getApiKey = () => (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || "";

// Funciones de codificación/decodificación requeridas por el SDK
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
}

export const geminiService = {
  connectAdminLive: (callbacks: any) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    return ai.live.connect({
      model: 'gemini-1.5-flash',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
        systemInstruction: `Eres el Director de Gihart & Hersel. 
        Gestionas moda, pero también CUADROS, PINTURAS y VIDEOS de arte.
        Si el usuario habla de "piezas", se refiere a obras de arte o prendas exclusivas.
        Ayuda a organizar el inventario masivo de forma eficiente.`
      }
    });
  },

  generateVoiceResponse: async (text: string) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ parts: [{ text: `Vendedor de arte y moda de lujo: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      return null;
    }
  },

  chat: async (history: any[], message: string, productsContext: string) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
      const contents = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config: {
          systemInstruction: `Eres el Curador Maestro de Gihart & Hersel.
          Tu misión es ayudar al administrador a gestionar un inventario de lujo (Moda, Cuadros, Pinturas, Videos).
          
          TAREAS ESPECÍFICAS:
          1. Generar reseñas persuasivas y elegantes para los productos.
          2. Crear publicaciones para Facebook Marketplace que sean "seguras" (evita mencionar marcas explícitamente si esto puede causar baneos por logos, enfócate en la calidad, materiales y estilo "Old Money" / "Luxury").
          3. Ayudar a organizar el inventario masivo.
          
          INVENTARIO ACTUAL: ${productsContext}
          REGLA: Si el cliente pregunta por algo que no está, ofrece una pieza similar.
          Siempre dirige al cierre de venta en WhatsApp. No des respuestas vacías.`,
          tools: [{ googleSearch: {} }]
        },
      });
      return { text: response.text };
    } catch (error) {
      console.error("Chat Error:", error);
      throw error;
    }
  },

  getQuickSuggestion: async (topic: string) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `Sugerencia de estilo/arte (10 palabras): ${topic}`,
      });
      return response.text;
    } catch (error) { return "El arte y la moda definen tu legado."; }
  },

  // Generación de imágenes
  generateImage: async (prompt: string, aspectRatio: AspectRatio, imageSize: ImageSize) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const model = 'gemini-1.5-flash'; // Fallback to flash for reliability

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated by the model");
  },

  // Edición de imágenes usando gemini-2.5-flash-image
  editImage: async (sourceImageBase64: string, prompt: string) => {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });

    // Extraer datos base64 y mimeType de la cadena data URL
    let mimeType = 'image/png';
    let base64Data = sourceImageBase64;

    if (sourceImageBase64.includes(',')) {
      const [header, data] = sourceImageBase64.split(',');
      const match = header.match(/:(.*?);/);
      if (match) mimeType = match[1];
      base64Data = data;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No edited image returned by the model");
  },

  utils: { decode, decodeAudioData, encode }
};
