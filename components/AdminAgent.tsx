import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { useProducts } from '../context/ProductContext';

export const AdminAgent: React.FC = () => {
  const [messages, setMessages] = useState<{ role: string, text: string, images?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { products } = useProducts();

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

  const handleSend = async (customMsg?: string) => {
    const userMsg = customMsg || input;
    if (!userMsg.trim() && selectedImages.length === 0) return;
    if (isLoading) return;

    const currentImages = [...selectedImages];
    setInput('');
    setSelectedImages([]);
    setMessages(prev => [...prev, { role: 'user', text: userMsg || "(Imágenes)", images: currentImages.length > 0 ? currentImages : undefined }]);
    setIsLoading(true);

    try {
      const ctx = products.map(p => `${p.name}`).join(', ');
      const response = await geminiService.chat(messages, userMsg || "Orden sobre imágenes", ctx, 'admin', currentImages.length > 0 ? currentImages : undefined);
      const reply = response.text;
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      await speak(reply);
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
              {m.images && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {m.images.map((img, idx) => (
                    <img key={idx} src={img} className="w-20 h-20 object-cover rounded-xl border border-white/10" />
                  ))}
                </div>
              )}
              {m.text}
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
