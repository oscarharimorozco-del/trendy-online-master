
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';

export const AdminAgent: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<{ role: string, text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const response = await geminiService.chat(messages, userMsg, "Contexto: Panel de Administración de Inventario.");
      setMessages(prev => [...prev, { role: 'model', text: response.text ?? 'Sin respuesta.' }]);
    } catch (e: any) {
      console.error("DEBUG AI ERROR:", e);
      const errorMsg = e.message || "Error desconocido";
      setMessages(prev => [...prev, { role: 'model', text: `ERROR: ${errorMsg}. Verifica tu conexión o API Key.` }]);
    }
  };

  return (
    <div className="glass rounded-[2rem] border-white/10 flex flex-col h-[400px] overflow-hidden">
      <div className="bg-cyan-500/20 p-4 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Co-Piloto Maestro</span>
        </div>
        <button
          onClick={() => setIsActive(!isActive)}
          className="text-[9px] font-black uppercase bg-white/5 px-3 py-1 rounded-full hover:bg-white/10 transition-all"
        >
          {isActive ? 'Desactivar' : 'Activar Voz'}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center mt-10 space-y-4 px-6">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
              Asistente de Control Maestro
            </p>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[9px] text-gray-400 font-bold uppercase">
                ✨ Generar Reseñas Elegantes
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[9px] text-gray-400 font-bold uppercase">
                📱 Posts de Marketplace (Anti-Ban)
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[9px] text-gray-400 font-bold uppercase">
                📦 Optimizar Inventario
              </div>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-[10px] ${m.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-400 border border-white/5'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Escribe comando..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-cyan-500 text-white"
        />
        <button onClick={handleSend} className="bg-cyan-500 p-2 rounded-xl hover:scale-105 transition-all">
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" strokeWidth="3" /></svg>
        </button>
      </div>
    </div>
  );
};
