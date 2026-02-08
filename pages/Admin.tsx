import React, { useState, useRef } from 'react';
import { CategoryType, GenderType, SocialConfig } from '../types';
import { useProducts } from '../context/ProductContext';
import { AdminAgent } from '../components/AdminAgent';
import { supabase } from '../services/supabase';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [social, setSocial] = useState<SocialConfig>({
    facebookStoreUrl: localStorage.getItem('fb_store_url') || '',
    whatsappNumber: localStorage.getItem('wa_number') || '+521'
  });

  const [qrUrl, setQrUrl] = useState(window.location.origin);
  const qrRef = useRef<HTMLDivElement>(null);

  const sizeOptions = ['S', 'M', 'L', 'XL', '2XL'];

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
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
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
      alert("¡Publicado con éxito!");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveSocial = () => {
    localStorage.setItem('fb_store_url', social.facebookStoreUrl);
    localStorage.setItem('wa_number', social.whatsappNumber);
    alert("Datos de contacto guardados.");
  };

  const downloadQR = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-TrendyOnline.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10 space-y-12">

      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex justify-between items-center bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center font-black text-2xl rotate-3">M</div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Master <span className="text-pink-500">Center</span></h1>
        </div>
        <button onClick={onLogout} className="px-6 py-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Salir</button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* CARGADOR */}
        <div className="lg:col-span-8 space-y-10">

          <section className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 ml-4">Subida de Archivos</p>
            <div
              onClick={() => uploadInputRef.current?.click()}
              className="group aspect-[5/1] bg-white/5 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-all"
            >
              <div className="p-4 bg-pink-500/20 rounded-full mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" /></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cargar Imagen o Video</span>
              <input type="file" ref={uploadInputRef} multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelection} />
            </div>
          </section>

          <div className="space-y-10">
            {pendingFiles.map(f => (
              <div key={f.id} className="bg-white/[0.02] border border-white/10 p-8 md:p-12 rounded-[4rem] animate-slide-up relative">
                <button onClick={() => setPendingFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute top-8 right-10 text-gray-600 hover:text-white text-3xl">✕</button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6 text-center">
                    <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl bg-black border border-white/5">
                      {f.src.startsWith('data:video') ? (
                        <video src={f.src} className="w-full h-full object-cover" muted loop autoPlay />
                      ) : (
                        <img src={f.src} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <input
                      type="text" value={f.name} onChange={e => updatePending(f.id, { name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center font-bold text-white outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">¿A dónde enviamos esta pieza?</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => updatePending(f.id, { target: 'shop' })} className={`py-6 rounded-3xl text-[10px] font-black uppercase border transition-all ${f.target === 'shop' ? 'bg-pink-500 text-white border-transparent' : 'bg-white/5 text-gray-500 border-white/5'}`}>📦 Catálogo</button>
                        <button onClick={() => updatePending(f.id, { target: 'gallery' })} className={`py-6 rounded-3xl text-[10px] font-black uppercase border transition-all ${f.target === 'gallery' ? 'bg-cyan-500 text-white border-transparent' : 'bg-white/5 text-gray-500 border-white/5'}`}>🖼️ Galería</button>
                      </div>
                    </div>

                    {f.target === 'shop' ? (
                      <div className="space-y-8 animate-fade-in">
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Género</p>
                          <div className="grid grid-cols-2 gap-2">
                            {['Hombre', 'Mujer'].map(g => (
                              <button key={g} onClick={() => updatePending(f.id, { gender: g as GenderType })} className={`py-4 rounded-xl text-[10px] font-black uppercase border transition-all ${f.gender === g ? 'bg-white text-black border-transparent' : 'bg-white/5 text-gray-500 border-white/5'}`}>{g}</button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tallas</p>
                          <div className="flex flex-wrap gap-2">
                            {sizeOptions.map(s => (
                              <button key={s} onClick={() => toggleSize(f.id, s)} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${f.sizes.includes(s) ? 'bg-white text-black border-transparent' : 'bg-white/5 text-gray-600 border-white/5'}`}>{s}</button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-600 uppercase ml-2">Menudeo</label>
                            <input type="number" value={f.price} onChange={e => updatePending(f.id, { price: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-pink-500" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-600 uppercase ml-2">Mayoreo</label>
                            <input type="number" value={f.wholesalePrice} onChange={e => updatePending(f.id, { wholesalePrice: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-cyan-400" />
                          </div>
                        </div>
                        <button onClick={() => saveItem(f.id)} disabled={isSaving} className="w-full py-6 bg-pink-500 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-white hover:text-pink-500 transition-all">🚀 Publicar en Tienda</button>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-cyan-500/20 bg-cyan-500/[0.02] rounded-[3rem] space-y-6">
                        <p className="text-xs font-black text-cyan-500 uppercase text-center">¡Listo para Galería Visual!</p>
                        <button onClick={() => saveItem(f.id)} disabled={isSaving} className="w-full py-6 bg-cyan-500 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest">🖼️ Publicar en Galería</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10 border-t border-white/5">
            <div className="bg-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500">Últimos Productos</h3>
              {products.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl">
                  <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                  <p className="text-[10px] font-bold uppercase truncate flex-1">{p.name}</p>
                  <button onClick={() => removeProduct(p.id)} className="text-red-500/50 hover:text-red-500">✕</button>
                </div>
              ))}
            </div>
            <div className="bg-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Últimos Galería</h3>
              <div className="flex gap-2">
                {gallery.slice(0, 4).map(item => (
                  <div key={item.id} className="w-12 h-12 rounded-lg overflow-hidden relative group">
                    <img src={item.url} className="w-full h-full object-cover" />
                    <button onClick={() => removeFromGallery(item.id)} className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-90 flex items-center justify-center text-[8px] font-black">Borrar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-4 space-y-10">
          <section className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 ml-4">Asistente AI</p>
            <AdminAgent />
          </section>

          <section className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] space-y-8">
            <h3 className="text-xl font-black uppercase tracking-tighter italic">Ventas <span className="text-pink-500">Social</span></h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">WhatsApp</label>
                <input type="text" value={social.whatsappNumber} onChange={e => setSocial({ ...social, whatsappNumber: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none" placeholder="+52..." />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Facebook</label>
                <input type="text" value={social.facebookStoreUrl} onChange={e => setSocial({ ...social, facebookStoreUrl: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none" placeholder="URL Tienda..." />
              </div>
              <button onClick={saveSocial} className="w-full py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all">Guardar Contactos</button>
            </div>
          </section>

          {/* QR GENERATOR */}
          <section className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] space-y-8 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition-all"></div>
            <h3 className="text-xl font-black uppercase tracking-tighter italic">QR <span className="text-cyan-400">Maestro</span></h3>

            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-3xl shadow-2xl">
                <QRCodeCanvas
                  value={qrUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "/logo.png", // Attempt to use a logo if exists
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              <div className="w-full space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 text-center block">URL de Destino</label>
                <input
                  type="text"
                  value={qrUrl}
                  onChange={e => setQrUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] text-gray-400 outline-none focus:border-cyan-400 focus:text-white transition-all"
                />
              </div>

              <button
                onClick={downloadQR}
                className="w-full py-5 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-cyan-600 transition-all shadow-lg"
              >
                📥 Descargar para Imprimir
              </button>
              <p className="text-[8px] text-gray-600 text-center uppercase font-bold tracking-widest">Genera QRs para tus bolsas o tarjetas</p>
            </div>
          </section>
        </div>

      </main>
    </div>
  );
};

export default Admin;
