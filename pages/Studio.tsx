import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { AspectRatio, ImageSize } from '../types';

declare global {
  interface Window {
    aistudio?: { hasSelectedApiKey(): Promise<boolean>; openSelectKey(): Promise<void> };
  }
}

const Studio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [size, setSize] = useState<ImageSize>(ImageSize.K1);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(true);
  
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    if (window.aistudio) {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } catch (e) {
        // Fallback si no está en el entorno de AI Studio
        setHasKey(true);
      }
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      // Prompt user to select an API key from a paid GCP project
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setResultImage(null);
    try {
      const img = await geminiService.generateImage(prompt, aspectRatio, size);
      setResultImage(img);
    } catch (err: any) {
      console.error(err);
      // Handle the error by prompting for key selection if it was a missing or invalid key error
      if (err.message === "MISSING_KEY") {
        await handleOpenKeySelector();
      } else {
        alert("Hubo un error al generar. Intenta con un prompt más descriptivo.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!sourceImage || !prompt.trim()) return;
    setIsProcessing(true);
    setResultImage(null);
    try {
      const img = await geminiService.editImage(sourceImage, prompt);
      setResultImage(img);
    } catch (err: any) {
      console.error(err);
      if (err.message === "MISSING_KEY") {
        await handleOpenKeySelector();
      } else {
        alert("La edición falló. Verifica que la imagen sea clara.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSourceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <h1 className="text-6xl font-black tracking-tighter uppercase">Trendy <span className="text-gradient">Studio</span></h1>
        <p className="text-gray-500 text-lg">Visualiza tu estilo usando la inteligencia artificial de última generación.</p>
        <div className="flex justify-center mt-2">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest hover:underline">
            Facturación de Gemini API (GCP)
          </a>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('generate')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'generate' ? 'accent-gradient shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}
            >
              Generar Nuevo
            </button>
            <button 
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'edit' ? 'accent-gradient shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}
            >
              Editar Foto
            </button>
          </div>

          <div className="glass p-8 rounded-[2.5rem] space-y-6 border-white/5 shadow-2xl">
            {activeTab === 'edit' && (
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Imagen de Base</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-500/50 transition-colors bg-white/5 group overflow-hidden"
                >
                  {sourceImage ? (
                    <img src={sourceImage} className="w-full h-full object-cover" alt="Source" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0l-4 4m4-4v12" strokeWidth="1.5"/></svg>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Sube JPG o PNG</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">
                {activeTab === 'generate' ? '¿Qué quieres crear?' : '¿Qué cambios quieres hacer?'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder={activeTab === 'generate' ? "Ej: Un hombre con un polo premium azul en un estudio minimalista..." : "Ej: Cambia el color del polo a rojo neón..."}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-pink-500 transition-all placeholder:text-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Formato</label>
                <select 
                  value={aspectRatio} 
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] uppercase font-bold"
                >
                  {Object.values(AspectRatio).map(ar => <option key={ar} value={ar} className="bg-black">{ar}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Calidad</label>
                <select 
                  value={size} 
                  onChange={(e) => setSize(e.target.value as ImageSize)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] uppercase font-bold"
                >
                  {Object.values(ImageSize).map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={activeTab === 'generate' ? handleGenerate : handleEdit}
              disabled={isProcessing || (activeTab === 'edit' && !sourceImage) || !prompt.trim()}
              className="w-full py-5 accent-gradient rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>Procesando</span>
                </div>
              ) : (activeTab === 'generate' ? 'Generar Visión' : 'Aplicar Edición')}
            </button>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="glass rounded-[3rem] h-full min-h-[600px] flex flex-col items-center justify-center p-10 relative overflow-hidden border-white/5 shadow-2xl">
            {isProcessing ? (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Pintando tus ideas...</h3>
                  <p className="text-gray-500 font-medium">Trendy AI está procesando tu estilo.</p>
                </div>
              </div>
            ) : resultImage ? (
              <div className="w-full h-full flex flex-col items-center">
                <div className="flex-1 rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-8 bg-black">
                  <img src={resultImage} alt="Resultado" className="w-full h-full object-contain" />
                </div>
                <div className="flex gap-4">
                  <button onClick={() => {
                    const link = document.createElement('a');
                    link.href = resultImage;
                    link.download = 'trendy-style.png';
                    link.click();
                  }} className="bg-white text-black px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-cyan-400 hover:text-white transition-all">Descargar</button>
                  <button onClick={() => setResultImage(null)} className="glass px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-all">Limpiar</button>
                </div>
              </div>
            ) : (
              <div className="text-center max-w-sm">
                <div className="bg-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                  <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-2">Tu visión aparecerá aquí</h4>
                <p className="text-gray-600 text-sm font-medium">Usa el panel de la izquierda para dar vida a tus ideas de moda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Studio;