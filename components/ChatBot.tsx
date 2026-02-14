
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { useProducts } from '../context/ProductContext';
import { ChatMessage } from '../types';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'Bienvenido. ¿Buscas alguna pieza de arte o prenda exclusiva hoy?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { products } = useProducts();
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const speak = async (text: string) => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBase64 = await geminiService.generateVoiceResponse(text);
      if (audioBase64) {
        const buffer = await geminiService.utils.decodeAudioData(geminiService.utils.decode(audioBase64), audioCtxRef.current, 24000, 1);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start();
      }
    } catch (e) { console.error("TTS Error:", e); }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const productsContext = products.map(p => {
        const hasPromo = p.isPromotion && p.promoPrice && p.promoPrice > 0;
        const publicPrice = p.price > 0 ? `$${p.price} MXN` : 'Consultar';
        const wholesalePrice = p.wholesalePrice && p.wholesalePrice > 0 ? `$${p.wholesalePrice} MXN` : 'Consultar';
        const promoPrice = hasPromo ? `$${p.promoPrice} MXN` : null;
        const status = p.isSoldOut ? 'AGOTADO' : 'Disponible';
        const sizes = p.sizes && p.sizes.length > 0 ? p.sizes.join(', ') : 'Consultar';

        let line = `- ${p.name.toUpperCase()} (Cat: ${p.category}) | Precio: ${publicPrice}`;
        if (hasPromo) line += ` | 🔥 PROMO: ${promoPrice}`;
        line += ` | Mayoreo (6+): ${wholesalePrice}`;
        line += ` | Tallas: ${sizes} | ${status}`;
        return line;
      }).join('\n');

      const result = await geminiService.chat(messages, userMsg, productsContext);
      const reply = result.text ?? 'Sin respuesta.';
      setMessages(prev => [...prev, { role: 'model', text: reply }]);

      if (reply.length < 300) {
        speak(reply);
      }
    } catch (error: any) {
      console.error("CHATBOT ERROR:", error);
      const errorMsg = error.message || "Error desconocido";
      setMessages(prev => [...prev, { role: 'model', text: `ERROR: ${errorMsg}. Verifica tu conexión o comunica el error al administrador.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {isOpen ? (
        <div className="w-80 sm:w-96 h-[600px] flex flex-col glass rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-fade-in">
          <div className="accent-gradient p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" /></svg>
              </div>
              <span className="font-black text-[11px] uppercase tracking-widest">Curador IA</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsMuted(!isMuted)} className={`hover:scale-110 transition-transform ${isMuted ? 'text-white/40' : 'text-white'}`}>
                {isMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeWidth="2" /><path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" strokeWidth="2" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeWidth="2" /></svg>
                )}
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform opacity-50">✕</button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/60 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] leading-relaxed shadow-xl ${m.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' :
                  'bg-white/10 text-gray-300 rounded-tl-none border border-white/5'
                  }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-4 rounded-2xl flex gap-1 animate-pulse">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-white/5 bg-black/90 space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escribe aquí tu consulta..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[11px] outline-none focus:border-cyan-500 transition-all text-white"
              />
              <button onClick={handleSend} className="accent-gradient p-4 rounded-2xl hover:scale-105 transition-all">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" strokeWidth="3" /></svg>
              </button>
            </div>
            <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest text-center">Modo Texto Prioritario Habilitado</p>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-16 h-16 accent-gradient rounded-[1.8rem] shadow-2xl flex items-center justify-center hover:scale-110 transition-all border border-white/10">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeWidth="2" /></svg>
        </button>
      )}
    </div>
  );
};
