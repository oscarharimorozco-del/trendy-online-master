import React, { useState, useRef } from 'react';
import { CategoryType, GenderType, SocialConfig, AspectRatio, ImageSize } from '../types';
import { useProducts } from '../context/ProductContext';
import { AdminAgent } from '../components/AdminAgent';
import { supabase } from '../services/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import { geminiService } from '../services/geminiService';

interface PendingFile {
  id: string;
  src: string;
  name: string;
  target: 'shop' | 'gallery';
  price: number;
  wholesalePrice: number;
  category: CategoryType;
  gender: GenderType;
  sizes: string[];
  description: string;
}

const Admin: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { addProduct, addToGallery, products, gallery, removeProduct, removeFromGallery } = useProducts();
  const [activeView, setActiveView] = useState<'inventory' | 'studio'>('inventory');

  // Inventory State
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Studio State (Private/Local)
  const [studioPrompt, setStudioPrompt] = useState('');
  const [studioImage, setStudioImage] = useState<string | null>(null);
  const [studioResult, setStudioResult] = useState<string | null>(null);
  const [isStudioLoading, setIsStudioLoading] = useState(false);
  const [studioAR, setStudioAR] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [studioSize, setStudioSize] = useState<ImageSize>(ImageSize.K1);
  const studioFileRef = useRef<HTMLInputElement>(null);

  const [social, setSocial] = useState<SocialConfig>({
    facebookStoreUrl: localStorage.getItem('fb_store_url') || '',
    whatsappNumber: localStorage.getItem('wa_number') || '+521'
  });

  const [qrUrl, setQrUrl] = useState(window.location.origin);
  const sizeOptions = ['S', 'M', 'L', 'XL', '2XL'];

  // --- Inventory Handlers ---
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPendingFiles(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          src: reader.result as string,
          name: file.name.split('.')[0],
          target: 'shop',
          price: 450,
          wholesalePrice: 350,
          category: 'Polos',
          gender: 'Hombre',
          sizes: ['M', 'L'],
          description: "Nueva pieza exclusiva."
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const updatePending = (id: string, updates: Partial<PendingFile>) => {
    setPendingFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const toggleSize = (id: string, size: string) => {
    const file = pendingFiles.find(f => f.id === id);
    if (!file) return;
    const newSizes = file.sizes.includes(size)
      ? file.sizes.filter(s => s !== size)
      : [...file.sizes, size];
    updatePending(id, { sizes: newSizes });
  };

  const saveItem = async (id: string) => {
    const f = pendingFiles.find(x => x.id === id);
    if (!f) return;
    setIsSaving(true);
    try {
      let finalUrl = f.src;
      if (f.src.startsWith('data:')) {
        const fileExt = f.src.split(';')[0].split('/')[1];
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${f.target}/${fileName}`;
        const base64Data = f.src.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: f.src.split(';')[0].split(':')[1] });
        const { error } = await supabase.storage.from('imagenes').upload(filePath, blob);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('imagenes').getPublicUrl(filePath);
        finalUrl = publicUrl;
      }

      if (f.target === 'shop') {
        await addProduct({
          name: f.name,
          price: f.price,
          wholesalePrice: f.wholesalePrice,
          category: f.category,
          gender: f.gender,
          image: finalUrl,
          description: f.description,
          sizes: f.sizes
        });
      } else {
        await addToGallery({
          url: finalUrl,
          type: f.src.startsWith('data:video') ? 'video' : 'image',
          name: f.name,
          category: 'Videos'
        });
      }
      setPendingFiles(prev => prev.filter(x => x.id !== id));
      alert("¡Publicado!");
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  const saveSocial = () => {
    localStorage.setItem('fb_store_url', social.facebookStoreUrl);
    localStorage.setItem('wa_number', social.whatsappNumber);
    alert("Datos guardados.");
  };

  const downloadQR = () => {
    const canvas = document.querySelector('.qr-maestro canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL();
    link.download = `QR-TrendyOnline.png`;
    link.click();
  };

  // --- Studio Handlers ---
  const handleStudioAction = async () => {
    if (!studioPrompt.trim()) return;
    setIsStudioLoading(true);
    setStudioResult(null);
    try {
      if (studioImage) {
        // Modo Edición / Multimodal
        const analysis = await geminiService.editImage(studioImage, studioPrompt);
        alert("Estrategia de Imagen:\n" + analysis);
        setStudioResult(studioImage); // En modo simulación devolvemos la misma o una analizada
      } else {
        // Generación (simulada por ahora)
        alert("Enviando comando de creación...");
        setTimeout(() => {
          setStudioResult("https://source.unsplash.com/random/800x800/?luxury,fashion");
          setIsStudioLoading(false);
        }, 2000);
        return;
      }
    } catch (e: any) { alert(e.message); } finally { setIsStudioLoading(false); }
  };

  const handleStudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setStudioImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 space-y-8 font-sans">

      {/* HEADER PREMIUM */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-3xl gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/20 translate-y-[-2px]">T</div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Master <span className="text-indigo-400">Center</span></h1>
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">IA Strategy & Luxury Inventory</p>
          </div>
        </div>

        <div className="flex bg-black p-1 rounded-2xl border border-white/5">
          <button onClick={() => setActiveView('inventory')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'inventory' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>Inventario</button>
          <button onClick={() => setActiveView('studio')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'studio' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>IA Studio</button>
        </div>

        <button onClick={onLogout} className="px-5 py-3 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">Salir</button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* COLUMNA PRINCIPAL */}
        <div className="lg:col-span-8 space-y-8">

          {activeView === 'inventory' ? (
            <div className="space-y-8 animate-fade-in">
              {/* UPLOADER */}
              <section className="space-y-4">
                <div
                  onClick={() => uploadInputRef.current?.click()}
                  className="group bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem] p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all"
                >
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" /></svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest">Añadir Nueva Pieza</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Sube el alma de tu marca</p>
                  </div>
                  <input type="file" ref={uploadInputRef} multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelection} />
                </div>
              </section>

              {/* EDITOR FILES */}
              {pendingFiles.map(f => (
                <div key={f.id} className="bg-white/[0.03] border border-white/10 rounded-[4rem] p-8 md:p-12 animate-slide-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-black border border-white/5 shadow-2xl relative group">
                        {f.src.startsWith('data:video') ? <video src={f.src} className="w-full h-full object-cover" autoPlay muted loop /> : <img src={f.src} className="w-full h-full object-cover" />}
                        <button onClick={() => setPendingFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute top-6 right-6 p-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75">✕</button>
                      </div>
                      <input type="text" value={f.name} onChange={e => updatePending(f.id, { name: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-center font-bold text-lg outline-none focus:border-indigo-500 shadow-inner" />
                    </div>

                    <div className="space-y-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center block">Destino Estratégico</label>
                        <div className="flex gap-4">
                          <button onClick={() => updatePending(f.id, { target: 'shop' })} className={`flex-1 py-5 rounded-3xl text-[10px] font-black uppercase border transition-all ${f.target === 'shop' ? 'bg-indigo-500 text-white border-transparent shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-gray-500 border-white/5'}`}>🛍️ Tienda</button>
                          <button onClick={() => updatePending(f.id, { target: 'gallery' })} className={`flex-1 py-5 rounded-3xl text-[10px] font-black uppercase border transition-all ${f.target === 'gallery' ? 'bg-purple-500 text-white border-transparent shadow-lg shadow-purple-500/20' : 'bg-white/5 text-gray-500 border-white/5'}`}>👁️ Galería</button>
                        </div>
                      </div>

                      {f.target === 'shop' && (
                        <div className="space-y-8">
                          <div className="grid grid-cols-2 gap-4">
                            {['Hombre', 'Mujer'].map(g => (
                              <button key={g} onClick={() => updatePending(f.id, { gender: g as GenderType })} className={`py-4 rounded-xl text-[10px] font-black uppercase border transition-all ${f.gender === g ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-gray-600 border-white/5'}`}>{g}</button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {sizeOptions.map(s => (
                              <button key={s} onClick={() => toggleSize(f.id, s)} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${f.sizes.includes(s) ? 'bg-indigo-400 text-white' : 'bg-white/5 text-gray-700 border-white/5'}`}>{s}</button>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <input type="number" value={f.price} onChange={e => updatePending(f.id, { price: Number(e.target.value) })} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black text-indigo-400 text-center" />
                            <input type="number" value={f.wholesalePrice} onChange={e => updatePending(f.id, { wholesalePrice: Number(e.target.value) })} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black text-purple-400 text-center" />
                          </div>
                        </div>
                      )}
                      <button onClick={() => saveItem(f.id)} disabled={isSaving} className="w-full py-6 bg-white text-black rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-500 hover:text-white transition-all transform active:scale-95">Finalizar Publicación</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* STUDIO VIEW (PRIVATE/LOCAL) */
            <div className="space-y-8 animate-fade-in">
              <section className="bg-white/[0.02] border border-white/5 rounded-[4rem] p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black uppercase">IA <span className="text-indigo-400">Creative Studio</span></h2>
                  <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[8px] font-black uppercase tracking-widest">Modo Privado: No se sube a la tienda</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div
                      onClick={() => studioFileRef.current?.click()}
                      className="aspect-square bg-black border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/30 overflow-hidden relative"
                    >
                      {studioImage ? <img src={studioImage} className="w-full h-full object-cover" /> : (
                        <div className="text-center opacity-30">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1" /></svg>
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Subir para editar</p>
                        </div>
                      )}
                      <input type="file" ref={studioFileRef} onChange={handleStudioFile} className="hidden" />
                    </div>
                    <textarea
                      value={studioPrompt}
                      onChange={e => setStudioPrompt(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xs outline-none focus:border-indigo-500 placeholder:text-gray-700 min-h-[120px]"
                      placeholder="Describe el diseño o modificación (ej: Cambia el color del fondo a mármol oscuro)..."
                    />
                    <button onClick={handleStudioAction} disabled={isStudioLoading} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase transition-all shadow-xl shadow-indigo-500/10 active:scale-95">
                      {isStudioLoading ? "Procesando Arte..." : (studioImage ? "Aplicar Modificaciones" : "Generar Visión")}
                    </button>
                  </div>

                  <div className="bg-black/40 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center p-8 relative min-h-[400px]">
                    {studioResult ? (
                      <div className="space-y-6 w-full h-full flex flex-col items-center">
                        <img src={studioResult} className="flex-1 rounded-2xl object-contain shadow-2xl border border-white/10" />
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = studioResult;
                            a.download = 'Trendy_Studio_Design.png';
                            a.click();
                          }}
                          className="px-10 py-4 bg-white text-black font-black text-[10px] uppercase rounded-full hover:bg-indigo-400 hover:text-white transition-all shadow-lg"
                        >
                          📥 Descargar para Campaña
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Resultado se proyectará aquí</p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* SIDEBAR ESTRATÉGICO */}
        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-4">
            <AdminAgent />
          </section>

          <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-8 qr-maestro">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black italic">Sales <span className="text-indigo-400">QR</span></h3>
              <button onClick={downloadQR} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-full hover:bg-indigo-500 hover:text-white transition-all text-xs">📥</button>
            </div>
            <div className="bg-white p-4 rounded-3xl flex justify-center shadow-2xl shadow-white/5">
              <QRCodeCanvas value={qrUrl} size={150} level="H" includeMargin />
            </div>
            <input type="text" value={qrUrl} onChange={e => setQrUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[9px] text-gray-500 outline-none text-center font-bold" />
          </section>

          <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[3rem] space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Configuración Contacto</h3>
            <div className="space-y-4">
              <input type="text" value={social.whatsappNumber} onChange={e => setSocial({ ...social, whatsappNumber: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none" placeholder="WhatsApp Number" />
              <input type="text" value={social.facebookStoreUrl} onChange={e => setSocial({ ...social, facebookStoreUrl: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none" placeholder="Facebook Store URL" />
              <button onClick={saveSocial} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase rounded-2xl hover:bg-indigo-500 hover:text-white transition-all">Sincronizar Datos</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Admin;
