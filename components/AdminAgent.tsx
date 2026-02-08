import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { useProducts } from '../context/ProductContext';

export const AdminAgent: React.FC = () => {
  const [messages, setMessages] = useState<{ role: string, text: string, image?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (customMsg?: string) => {
    const userMsg = customMsg || input;
    if (!userMsg.trim() && !selectedImage) return;
    if (isLoading) return;

    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    setMessages(prev => [...prev, { role: 'user', text: userMsg || "(Imagen)", image: currentImage || undefined }]);
    setIsLoading(true);

    try {
      const ctx = products.map(p => `${p.name}`).join(', ');
      const response = await geminiService.chat(messages, userMsg || "Orden sobre imagen", ctx, 'admin', currentImage || undefined);
      const reply = response.text;
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      await speak(reply);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message}` }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-[3rem] h-[550px] flex flex-col overflow-hidden shadow-2xl">
      <div className="p-5 flex justify-between bg-white/[0.02] border-b border-white/5">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Director de Estrategia</span>
        <button onClick={() => setIsMuted(!isMuted)} className={`text-xs ${isMuted ? 'text-gray-600' : 'text-cyan-400'}`}>{isMuted ? '🔇' : '🔊'}</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/40">
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
            <div className={`p-4 rounded-[2rem] text-[10px] leading-relaxed max-w-[85%] ${m.role === 'user' ? 'bg-cyan-600' : 'bg-white/5 border border-white/5 text-gray-300'}`}>
              {m.image && <img src={m.image} className="mb-2 rounded-xl border border-white/10" />}
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="px-5 py-2 bg-cyan-500/10 flex items-center justify-between border-t border-white/5">
          <span className="text-[8px] font-black uppercase text-cyan-400">Imagen lista para procesar</span>
          <button onClick={() => setSelectedImage(null)} className="text-xs">✕</button>
        </div>
      )}

      <div className="p-4 bg-black/60 flex gap-2 border-t border-white/5">
        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white">📷</button>
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Orden ejecutiva..." className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 text-[10px] outline-none"
        />
        <button onClick={() => handleSend()} className="bg-cyan-600 p-3 rounded-2xl text-white">🚀</button>
      </div>
    </div>
  );
};
