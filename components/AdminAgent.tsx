import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { useProducts } from '../context/ProductContext';

// Extender tipos para SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const AdminAgent: React.FC = () => {
  const [messages, setMessages] = useState<{ role: string, text: string, image?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const { products } = useProducts();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    // Configurar reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'es-MX';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

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
    setMessages(prev => [...prev, { role: 'user', text: userMsg || "(Imagen enviada)", image: currentImage || undefined }]);
    setIsLoading(true);

    try {
      const productsContext = products.map(p => `${p.name} ($${p.price})`).join(', ');
      const response = await geminiService.chat(messages, userMsg || "Analiza esta imagen", productsContext, 'admin', currentImage || undefined);
      const reply = response.text ?? 'Sin respuesta.';

      setMessages(prev => [...prev, { role: 'model', text: reply }]);
      if (reply.length < 500) await speak(reply);

    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `ERROR: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] flex flex-col h-[500px] overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 p-5 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Director de Estrategia</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white bg-white/5'}`}
            title="Hablar (STT)"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-full transition-all ${isMuted ? 'text-gray-600' : 'text-cyan-400 bg-cyan-400/10'}`}
          >
            {isMuted ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeWidth="2" /><path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" strokeWidth="2" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" strokeWidth="2" /></svg>
            )}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
        {messages.length === 0 && (
          <div className="text-center space-y-4 py-10">
            <h4 className="text-[10px] text-gray-400 uppercase font-black tracking-[0.3em]">Comandos Rápidos</h4>
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => handleSend("Ayúdame a crear una descripción")} className="px-4 py-2 bg-white/5 rounded-full text-[9px] font-bold uppercase hover:bg-white/10">Descripción</button>
              <button onClick={() => handleSend("Post para Facebook")} className="px-4 py-2 bg-white/5 rounded-full text-[9px] font-bold uppercase hover:bg-white/10">Facebook Post</button>
              <button onClick={() => handleSend("Analizar tendencia")} className="px-4 py-2 bg-white/5 rounded-full text-[9px] font-bold uppercase hover:bg-white/10">Tendencias</button>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-3xl text-[10px] leading-relaxed shadow-xl max-w-[90%] ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-indigo-500/10' : 'bg-white/5 text-gray-300 border border-white/10 backdrop-blur-xl'}`}>
              {m.image && (
                <div className="mb-3 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                  <img src={m.image} alt="User Upload" className="max-w-full h-auto" />
                </div>
              )}
              {m.text.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-4 rounded-3xl animate-pulse flex gap-1 items-center">
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="px-5 py-3 bg-indigo-500/10 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-indigo-500/50 shadow-lg">
              <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Imagen Multimodal Lista</span>
          </div>
          <button onClick={() => setSelectedImage(null)} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full">✕</button>
        </div>
      )}

      {isListening && (
        <div className="bg-red-500/10 py-2 px-5 border-t border-red-500/20 flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Escuchando tu voz...</span>
        </div>
      )}

      <div className="p-5 bg-black/60 border-t border-white/10 flex gap-3">
        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`p-3 rounded-2xl transition-all border ${selectedImage ? 'bg-indigo-500 border-transparent text-white' : 'bg-white/5 border-white/10 text-gray-500 hover:text-indigo-400 hover:border-indigo-400/50'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" /></svg>
        </button>

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={selectedImage ? "Describe qué modificar..." : "Pregunta sobre tu negocio..."}
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] outline-none focus:border-indigo-500 text-white placeholder:text-gray-700 transition-all shadow-inner"
        />

        <button onClick={() => handleSend()} disabled={isLoading} className="bg-indigo-600 p-4 rounded-2xl hover:bg-indigo-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" strokeWidth="3" /></svg>
        </button>
      </div>
    </div>
  );
};
