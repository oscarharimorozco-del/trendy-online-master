import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useProducts } from '../context/ProductContext';
import { CategoryType, GenderType } from '../types';

interface AutoProductDraft {
  name: string;
  description: string;
  price: number;
  wholesalePrice: number;
  promoPrice: number;
  category: CategoryType;
  gender: GenderType;
  sizes: string[];
  isPromotion: boolean;
  imageIndex: number;
}

interface AdminAgentProps {
  onDraftsGenerated?: (drafts: AutoProductDraft[], images: string[]) => void;
}

export const AdminAgent: React.FC<AdminAgentProps> = ({ onDraftsGenerated }) => {
  const [messages, setMessages] = useState<{ role: string, text: string, images?: string[], drafts?: AutoProductDraft[] }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { products, addProduct } = useProducts();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const speak = async (text: string) => {
    if (isMuted || text.length > 300) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const audioBase64 = await geminiService.generateVoiceResponse(text);
      if (audioBase64) {
        const buffer = await geminiService.utils.decodeAudioData(geminiService.utils.decode(audioBase64), audioCtxRef.current, 24000, 1);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start();
      }
    } catch (e) { console.error(e); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImageToSupabase = async (base64Image: string): Promise<string | null> => {
    try {
      const fileExt = base64Image.split(';')[0].split('/')[1];
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
      const filePath = `shop/${fileName}`;
      const base64Data = base64Image.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: base64Image.split(';')[0].split(':')[1] });

      const { error } = await supabase.storage.from('imagenes').upload(filePath, blob);
      if (error) throw error;

      const { data } = supabase.storage.from('imagenes').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      console.error("Upload error:", e);
      return null;
    }
  };

  const publishDrafts = async (drafts: AutoProductDraft[], images: string[]) => {
    setIsPublishing(true);
    let successCount = 0;

    try {
      for (const draft of drafts) {
        if (draft.imageIndex >= images.length) continue;

        const imageUrl = await uploadImageToSupabase(images[draft.imageIndex]);
        if (!imageUrl) continue;

        await addProduct({
          name: draft.name,
          description: draft.description,
          price: draft.price,
          wholesalePrice: draft.wholesalePrice || Math.round(draft.price * 0.8),
          promoPrice: draft.promoPrice || draft.price,
          category: draft.category,
          gender: draft.gender,
          image: imageUrl,
          sizes: draft.sizes && draft.sizes.length > 0 ? draft.sizes : ['S', 'M', 'L', 'XL'],
          isPromotion: draft.isPromotion || false,
        });
        successCount++;
      }
      setMessages(prev => [...prev, { role: 'model', text: `✅ ¡Listo! Se publicaron ${successCount} productos exitosamente. Ya están en la tienda.` }]);
      speak(`Proceso completado. ${successCount} productos han sido publicados.`);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `❌ Hubo un error al publicar: ${e.message}` }]);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSend = async (customMsg?: string) => {
    const userMsg = customMsg || input;
    if (!userMsg.trim() && selectedImages.length === 0) return;
    if (isLoading) return;

    const currentImages = [...selectedImages];
    setInput('');
    setSelectedImages([]);

    // Optimistic UI update
    setMessages(prev => [...prev, { role: 'user', text: userMsg || "(Imágenes)", images: currentImages.length > 0 ? currentImages : undefined }]);
    setIsLoading(true);

    try {
      const ctx = products.map(p => `${p.name}`).join(', ');

      let systemPrompt = userMsg;
      if (currentImages.length > 0) {
        systemPrompt += `
        INSTRUCCIÓN DE AGENTE AUTÓNOMO (ESTILO MANUS):
        Eres el Director Ejecutivo de Operaciones de Gihart & Hersel. Tienes control TOTAL sobre la tienda.
        No eres un "chat", eres un AGENTE DE EJECUCIÓN. Tu objetivo es procesar las imágenes y órdenes para MANEJAR la interfaz.

        CAPACIDADES DE MANIOBRA:
        1. PUBLICACIÓN: Si hay imágenes, genera el JSON para darlos de alta.
        2. GESTIÓN: Si el usuario pide "borra", "cambia precio" o "busca", responde con la intención clara.
        
        REGLAS DE PRECIOS:
        - Precio Público: 1 pza.
        - Mayoreo: 6+ pzas (Sugerir siempre 20-30% menos que público si no te dan el dato).
        - No inventes categorías: Usa solo [Polos, Playeras, Accesorios, Cuadros, Pinturas].

        Responde SOLAMENTE con este formato JSON:
        {
          "action": "DRAFT" | "NAVIGATE" | "DELETE" | "UPDATE" | "TALK",
          "data": { ... correspondientes a la acción ... },
          "drafts": [ { "name": "...", "price": 0, ... } ],
          "message": "Tu respuesta corta y ejecutiva al usuario"
        }
        
        IMPORTANTE: Si el usuario dice "Precio 200", los drafts DEBEN tener 200. No pidas confirmación, EJECUTA.`;
      }

      const response = await geminiService.chat(
        messages.map(m => ({ role: m.role, text: m.text, images: m.images })), // Filter out drafts from history for API
        systemPrompt || "Orden sobre imágenes",
        ctx,
        'admin',
        currentImages.length > 0 ? currentImages : undefined
      );

      const reply = response.text;

      // Check for JSON response
      const jsonMatch = reply.match(/```json\n([\s\S]*?)\n```/) || reply.match(/\[\s*\{[\s\S]*\}\s*\]/);

      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const responseData = JSON.parse(jsonStr);

          if (responseData.drafts && Array.isArray(responseData.drafts)) {
            setMessages(prev => [...prev, {
              role: 'model',
              text: responseData.message || `He preparado ${responseData.drafts.length} productos.`,
              drafts: responseData.drafts,
              images: currentImages
            }]);
            speak(responseData.message || "Borradores generados.");
          } else if (responseData.action === 'NAVIGATE') {
            setMessages(prev => [...prev, { role: 'model', text: `🧭 Cambiando vista a: ${responseData.data.target}` }]);
            speak(`Entendido. Navegando a ${responseData.data.target}`);
            // Aquí se dispararía la navegación real
          } else {
            setMessages(prev => [...prev, { role: 'model', text: responseData.message || reply }]);
            speak(responseData.message || reply);
          }
        } catch (e) {
          setMessages(prev => [...prev, { role: 'model', text: reply }]);
          speak(reply);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: reply }]);
        await speak(reply);
      }

    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message}` }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-[3rem] h-[600px] flex flex-col overflow-hidden shadow-2xl">
      <div className="p-5 flex justify-between bg-white/[0.02] border-b border-white/5">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Director de Estrategia</span>
        <button onClick={() => setIsMuted(!isMuted)} className={`text-xs ${isMuted ? 'text-gray-600' : 'text-cyan-400'}`}>{isMuted ? '🔇' : '🔊'}</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/40 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">En línea. Esperando órdenes.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-[2rem] text-[10px] leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-cyan-600 shadow-lg shadow-cyan-600/20' : 'bg-white/5 border border-white/5 text-gray-300'}`}>
              {m.images && !m.drafts && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {m.images.map((img, idx) => (
                    <img key={idx} src={img} className="w-20 h-20 object-cover rounded-xl border border-white/10" />
                  ))}
                </div>
              )}
              {m.text}

              {/* Drafts Review UI */}
              {m.drafts && m.images && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-xl">
                    {m.drafts.map((draft, idx) => (
                      <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/5 flex gap-3">
                        <img src={m.images![draft.imageIndex]} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-black text-cyan-400 uppercase truncate">{draft.name}</p>
                          <p className="text-[9px] text-gray-500">${draft.price} | {draft.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (onDraftsGenerated) {
                        onDraftsGenerated(m.drafts!, m.images!);
                        setMessages(prev => [...prev, { role: 'model', text: '✅ Borradores enviados a la zona de edición manual.' }]);
                      }
                    }}
                    className="w-full py-3 bg-cyan-500 text-white rounded-xl font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                  >
                    📝 Enviar a Revisión Manual ({m.drafts.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-4 rounded-full animate-pulse flex gap-1">
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {selectedImages.length > 0 && (
        <div className="px-5 py-3 bg-cyan-500/10 flex flex-wrap gap-2 border-t border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
          {selectedImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img src={img} className="w-12 h-12 object-cover rounded-lg border border-cyan-400/50" />
              <button
                onClick={() => removeSelectedImage(idx)}
                className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
              >✕</button>
            </div>
          ))}
          <div className="flex items-center ml-2">
            <span className="text-[8px] font-black uppercase text-cyan-400">{selectedImages.length} Fotos listas</span>
          </div>
        </div>
      )}

      <div className="p-4 bg-black/60 flex gap-2 border-t border-white/5">
        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" multiple className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-colors">📷</button>
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Orden ejecutiva..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 text-[10px] outline-none focus:border-cyan-500/50"
        />
        <button onClick={() => handleSend()} className="bg-cyan-600 p-3 rounded-2xl text-white shadow-lg shadow-cyan-600/30 hover:brightness-110 active:scale-95 transition-all">🚀</button>
      </div>
    </div>
  );
};
