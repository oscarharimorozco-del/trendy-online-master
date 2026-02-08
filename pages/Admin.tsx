import React, { useState, useRef } from 'react';
import { CategoryType, GenderType, SocialConfig } from '../types';
import { useProducts } from '../context/ProductContext';
import { AdminAgent } from '../components/AdminAgent';
import { supabase } from '../services/supabase';

interface PendingFile {
  id: string; src: string; name: string; target: 'shop' | 'gallery';
  price: number; wholesalePrice: number; promoPrice: number; category: CategoryType;
  gender: GenderType; sizes: string[]; description: string;
  isPromotion: boolean;
  isFeatured: boolean;
}

const Admin: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { addProduct, updateProduct, addToGallery, products, gallery, removeProduct, removeFromGallery, updateGalleryItem } = useProducts();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [social, setSocial] = useState<SocialConfig>({
    facebookStoreUrl: localStorage.getItem('fb_store_url') || '',
    whatsappNumber: localStorage.getItem('wa_number') || '+521'
  });

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
          target: 'shop', price: 450, wholesalePrice: 350, promoPrice: 399,
          category: 'Polos', gender: 'Hombre', sizes: ['M', 'L'],
          description: "Nueva pieza exclusiva.",
          isPromotion: false,
          isFeatured: false
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const updatePending = (id: string, updates: Partial<PendingFile>) => {
    setPendingFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const saveItem = async (id: string) => {
    const f = pendingFiles.find(x => x.id === id);
    if (!f) return;
    setIsSaving(true);
    try {
      let finalUrl = f.src;
      if (f.src.startsWith('data:')) {
        const fileExt = f.src.split(';')[0].split('/')[1];
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
        const filePath = `${f.target}/${fileName}`;
        const base64Data = f.src.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: f.src.split(';')[0].split(':')[1] });
        const { error } = await supabase.storage.from('imagenes').upload(filePath, blob);
        if (error) throw error;
        finalUrl = supabase.storage.from('imagenes').getPublicUrl(filePath).data.publicUrl;
      }
      if (f.target === 'shop') {
        const { id, src, target, isFeatured, ...cleanProduct } = f;
        await addProduct({ ...cleanProduct, image: finalUrl });
      } else {
        await addToGallery({ url: finalUrl, type: f.src.startsWith('data:video') ? 'video' : 'image', name: f.name, category: 'Videos', isFeatured: f.isFeatured });
      }
      setPendingFiles(prev => prev.filter(x => x.id !== id));
      alert("¡Publicado!");
    } catch (e: any) {
      alert(`Error en la nube: ${e.message || 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10 space-y-12">
      <header className="max-w-6xl mx-auto flex justify-between items-center bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center font-black text-2xl rotate-3 shadow-lg shadow-pink-500/20">M</div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Master <span className="text-pink-500">Center</span></h1>
        </div>
        <button onClick={onLogout} className="px-6 py-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Salir</button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <section
            onClick={() => uploadInputRef.current?.click()}
            className="group bg-white/5 border-2 border-dashed border-white/10 rounded-[3rem] p-12 flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-all"
          >
            <div className="p-5 bg-pink-500/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" /></svg>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Click para Subir Producto o Galería</p>
            <input type="file" ref={uploadInputRef} multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelection} />
          </section>

          <div className="space-y-10">
            {pendingFiles.length > 1 && (
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-wrap items-center justify-between gap-6 animate-slide-up">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-10 bg-pink-500 rounded-full"></div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Edición en Lote ({pendingFiles.length})</h3>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => setPendingFiles(prev => prev.map(f => ({ ...f, gender: 'Hombre' })))} className="px-4 py-2 rounded-lg text-[9px] font-black uppercase bg-black hover:bg-white/10 transition-all text-gray-400">Todo Hombre</button>
                  <button onClick={() => setPendingFiles(prev => prev.map(f => ({ ...f, gender: 'Mujer' })))} className="px-4 py-2 rounded-lg text-[9px] font-black uppercase bg-black hover:bg-white/10 transition-all text-gray-400">Todo Mujer</button>
                  <button
                    onClick={() => { if (confirm("¿Publicar todos los pendientes?")) pendingFiles.forEach(f => saveItem(f.id)); }}
                    className="bg-white text-black px-8 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-pink-500 hover:text-white transition-all shadow-lg"
                  >
                    Publicar Todo
                  </button>
                </div>
              </div>
            )}

            {pendingFiles.map(f => (
              <div key={f.id} className="bg-white/[0.02] border border-white/10 p-10 rounded-[4rem] animate-slide-up relative space-y-10">
                <button onClick={() => setPendingFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute top-8 right-10 text-gray-600 hover:text-white text-3xl">✕</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-black border border-white/5 shadow-2xl relative">
                      {f.src.startsWith('data:video') ? <video src={f.src} className="w-full h-full object-cover" autoPlay muted loop /> : <img src={f.src} className="w-full h-full object-cover" />}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-xl ${f.target === 'shop' ? 'bg-pink-500' : 'bg-cyan-500'}`}>{f.target === 'shop' ? 'Tienda' : 'Galería'}</span>
                        <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase border border-white/10">{f.gender}</span>
                        {f.isPromotion && <span className="bg-yellow-500 px-3 py-1 rounded-full text-[8px] font-black uppercase text-black animate-pulse shadow-lg">Promo ⚡</span>}
                        {f.isFeatured && <span className="bg-purple-500 px-3 py-1 rounded-full text-[8px] font-black uppercase text-white shadow-lg">Presentación ⭐</span>}
                      </div>
                    </div>
                    {f.target === 'shop' && (
                      <input type="text" value={f.name} onChange={e => updatePending(f.id, { name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center font-bold outline-none focus:border-pink-500" placeholder="Nombre de la pieza" />
                    )}
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => updatePending(f.id, { target: 'shop' })} className={`py-5 rounded-2xl text-[10px] font-black uppercase border transition-all ${f.target === 'shop' ? 'bg-pink-500 border-transparent shadow-lg shadow-pink-500/20' : 'bg-white/5 text-gray-500 border-white/5'}`}>🛍️ Tienda</button>
                      <button onClick={() => updatePending(f.id, { target: 'gallery' })} className={`py-5 rounded-2xl text-[10px] font-black uppercase border transition-all ${f.target === 'gallery' ? 'bg-cyan-500 border-transparent shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-gray-500 border-white/5'}`}>🖼️ Galería</button>
                    </div>

                    {f.target === 'gallery' && (
                      <button
                        onClick={() => updatePending(f.id, { isFeatured: !f.isFeatured })}
                        className={`w-full py-6 rounded-[2rem] border text-[10px] font-black uppercase tracking-widest transition-all ${f.isFeatured ? 'bg-purple-600 border-transparent text-white shadow-xl shadow-purple-600/30' : 'bg-white/5 border-white/10 text-gray-500 hover:text-purple-400'}`}
                      >
                        {f.isFeatured ? '⭐ Imagen de Presentación (Gallery)' : 'Marcar como Presentación'}
                      </button>
                    )}

                    {f.target === 'shop' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-2">
                            <p className="text-[7px] font-black uppercase text-gray-600 tracking-tighter ml-2">Público</p>
                            <input type="number" value={f.price} onChange={e => updatePending(f.id, { price: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-black text-pink-500 text-center outline-none focus:border-pink-500" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[7px] font-black uppercase text-gray-600 tracking-tighter ml-2">Mayoreo</p>
                            <input type="number" value={f.wholesalePrice} onChange={e => updatePending(f.id, { wholesalePrice: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-black text-cyan-400 text-center outline-none focus:border-cyan-400" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[7px] font-black uppercase text-yellow-500 tracking-tighter ml-2">Promo</p>
                            <input type="number" value={f.promoPrice} onChange={e => updatePending(f.id, { promoPrice: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-black text-yellow-500 text-center outline-none focus:border-yellow-500" />
                          </div>
                        </div>
                        <button
                          onClick={() => updatePending(f.id, { isPromotion: !f.isPromotion })}
                          className={`w-full py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${f.isPromotion ? 'bg-yellow-500 border-transparent text-black shadow-lg shadow-yellow-500/30' : 'bg-white/5 border-white/10 text-gray-500 hover:text-yellow-500'}`}
                        >
                          {f.isPromotion ? '⚡ Promo ACTIVADA' : 'Marcar como Promo'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      <p className="text-[8px] font-black uppercase text-gray-500 tracking-widest text-center">Género</p>
                      <div className="flex gap-2">
                        {(['Hombre', 'Mujer', 'Unisex'] as GenderType[]).map(g => (
                          <button key={g} onClick={() => updatePending(f.id, { gender: g })} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${f.gender === g ? 'bg-white text-black border-transparent shadow-xl' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'}`}>{g}</button>
                        ))}
                      </div>
                    </div>

                    {f.target === 'shop' && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {sizeOptions.map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              const newSizes = f.sizes.includes(s) ? f.sizes.filter(x => x !== s) : [...f.sizes, s];
                              updatePending(f.id, { sizes: newSizes });
                            }}
                            className={`w-10 h-10 rounded-lg text-[10px] font-black border transition-all ${f.sizes.includes(s) ? 'bg-pink-500 border-transparent text-white scale-110 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => saveItem(f.id)} disabled={isSaving} className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-xs uppercase hover:bg-pink-500 hover:text-white transition-all shadow-2xl active:scale-95">Publicar Ahora</button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/5">
            <div className="bg-white/5 p-8 rounded-[3rem] space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500 text-center">Stock en Tienda</h3>
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className={`flex flex-col gap-4 bg-black/40 p-5 rounded-[2rem] border transition-all ${p.isPromotion ? 'border-yellow-500/30' : 'border-white/5'} ${p.isSoldOut ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={p.image} className="w-16 h-16 rounded-2xl object-cover" />
                        {p.isPromotion && <span className="absolute -top-2 -right-2 text-xs bg-yellow-500 rounded-full p-1 leading-none shadow-lg">⚡</span>}
                        {p.isSoldOut && <span className="absolute -top-2 -left-2 text-xs bg-red-500 rounded-full p-1 leading-none shadow-lg">🚫</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black uppercase truncate">{p.name}</p>
                        <p className="text-[9px] text-gray-500 font-bold tracking-widest">{p.gender} | {p.category}</p>
                        <div className="flex gap-2 mt-1">
                          <p className="text-[10px] text-pink-500 font-black">${p.price}</p>
                          <p className="text-[10px] text-cyan-400 font-black">M: ${p.wholesalePrice}</p>
                        </div>
                      </div>
                      <button onClick={() => { if (confirm("¿Borrar permanentemente?")) removeProduct(p.id); }} className="p-3 text-red-500/40 hover:text-red-500 transition-colors">✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 flex flex-col gap-2 bg-black/20 p-3 rounded-2xl border border-white/5">
                        <p className="text-[7px] font-black uppercase text-gray-500 ml-1">Precio Promoción</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={p.promoPrice || 0}
                            onChange={e => updateProduct(p.id, { promoPrice: Number(e.target.value) })}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-yellow-500 outline-none focus:border-yellow-500"
                          />
                          <button
                            onClick={() => updateProduct(p.id, { isPromotion: !p.isPromotion })}
                            className={`px-4 rounded-xl text-[8px] font-black uppercase border transition-all ${p.isPromotion ? 'bg-yellow-500 border-transparent text-black shadow-lg' : 'bg-white/5 border-white/10 text-gray-500'}`}
                          >
                            {p.isPromotion ? '⚡ ACTIVO' : 'ACTIVAR'}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => updateProduct(p.id, { isSoldOut: !p.isSoldOut })}
                        className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${p.isSoldOut ? 'bg-red-500 border-transparent text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-500'}`}
                      >
                        {p.isSoldOut ? '🚫 Agotado' : 'Disponible'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 p-8 rounded-[3rem] space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 text-center">Panel de Galería</h3>
              <div className="grid grid-cols-4 gap-2">
                {gallery.map(item => (
                  <div key={item.id} className={`aspect-square rounded-xl overflow-hidden relative group border transition-all ${item.isFeatured ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-white/5'}`}>
                    <img src={item.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 p-1">
                      <button onClick={() => removeFromGallery(item.id)} className="bg-red-600 text-[6px] font-black px-2 py-1 rounded w-full">BORRAR</button>
                      <button onClick={() => updateGalleryItem(item.id, { isFeatured: !item.isFeatured })} className="bg-purple-600 text-[6px] font-black px-2 py-1 rounded w-full">{item.isFeatured ? 'NO DESTACAR' : 'DESTACAR'}</button>
                    </div>
                    {item.isFeatured && <span className="absolute top-1 right-1 text-[8px] drop-shadow-lg">⭐</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <AdminAgent />
          <section className="bg-white/5 p-10 rounded-[3rem] space-y-6 border border-white/10">
            <h3 className="text-xl font-black italic">Sales <span className="text-pink-500">Social</span></h3>
            <div className="space-y-4">
              <input type="text" value={social.whatsappNumber} onChange={e => setSocial({ ...social, whatsappNumber: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold" placeholder="WhatsApp" />
              <button onClick={() => { localStorage.setItem('wa_number', social.whatsappNumber); alert("¡WhatsApp guardado!"); }} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase rounded-2xl hover:bg-pink-500 hover:text-white transition-colors">Guardar WhatsApp</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Admin;
