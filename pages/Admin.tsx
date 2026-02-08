import React, { useState, useRef } from 'react';
import { CategoryType, GenderType, SocialConfig, AspectRatio, ImageSize } from '../types';
import { useProducts } from '../context/ProductContext';
import { AdminAgent } from '../components/AdminAgent';
import { supabase } from '../services/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import { geminiService } from '../services/geminiService';

interface PendingFile {
  id: string; src: string; name: string; target: 'shop' | 'gallery';
  price: number; wholesalePrice: number; category: CategoryType;
  gender: GenderType; sizes: string[]; description: string;
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
          target: 'shop', price: 450, wholesalePrice: 350,
          category: 'Polos', gender: 'Hombre', sizes: ['M', 'L'],
          description: "Nueva pieza exclusiva."
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
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${f.target}/${fileName}`;
        const base64Data = f.src.split(',')[1];
        const blob = new Blob([atob(base64Data).split("").map(c => c.charCodeAt(0))], { type: f.src.split(';')[0].split(':')[1] });
        const { error } = await supabase.storage.from('imagenes').upload(filePath, blob);
        if (error) throw error;
        finalUrl = supabase.storage.from('imagenes').getPublicUrl(filePath).data.publicUrl;
      }
      if (f.target === 'shop') {
        await addProduct({ ...f, image: finalUrl });
      } else {
        await addToGallery({ url: finalUrl, type: f.src.startsWith('data:video') ? 'video' : 'image', name: f.name, category: 'Videos' });
      }
      setPendingFiles(prev => prev.filter(x => x.id !== id));
      alert("¡Publicado!");
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10 space-y-12">
      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex justify-between items-center bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center font-black text-2xl rotate-3 shadow-lg shadow-pink-500/20">M</div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Master <span className="text-pink-500">Center</span></h1>
        </div>
        <button onClick={onLogout} className="px-6 py-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Salir</button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* UPLOADER CENTRAL */}
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

          {/* LISTA DE PENDIENTES (MODO MANUAL) */}
          <div className="space-y-10">
            {pendingFiles.map(f => (
              <div key={f.id} className="bg-white/[0.02] border border-white/10 p-10 rounded-[4rem] animate-slide-up relative">
                <button onClick={() => setPendingFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute top-8 right-10 text-gray-600 hover:text-white text-3xl">✕</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-black border border-white/5 shadow-2xl">
                      {f.src.startsWith('data:video') ? <video src={f.src} className="w-full h-full object-cover" autoPlay muted loop /> : <img src={f.src} className="w-full h-full object-cover" />}
                    </div>
                    <input type="text" value={f.name} onChange={e => updatePending(f.id, { name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center font-bold" />
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => updatePending(f.id, { target: 'shop' })} className={`py-5 rounded-2xl text-[10px] font-black uppercase border ${f.target === 'shop' ? 'bg-pink-500 border-transparent' : 'bg-white/5 text-gray-500 border-white/5'}`}>🛍️ Tienda</button>
                      <button onClick={() => updatePending(f.id, { target: 'gallery' })} className={`py-5 rounded-2xl text-[10px] font-black uppercase border ${f.target === 'gallery' ? 'bg-cyan-500 border-transparent' : 'bg-white/5 text-gray-500 border-white/5'}`}>🖼️ Galería</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={f.price} onChange={e => updatePending(f.id, { price: Number(e.target.value) })} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-black text-pink-500 text-center" />
                      <input type="number" value={f.wholesalePrice} onChange={e => updatePending(f.id, { wholesalePrice: Number(e.target.value) })} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-black text-cyan-400 text-center" />
                    </div>
                    <button onClick={() => saveItem(f.id)} disabled={isSaving} className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-xs uppercase hover:bg-pink-500 hover:text-white transition-all">Publicar Ahora</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* LISTA DE EXISTENCIAS (GESTIÓN MANUAL) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/5">
            <div className="bg-white/5 p-8 rounded-[3rem] space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500">Stock en Tienda</h3>
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5 group">
                    <img src={p.image} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase truncate">{p.name}</p>
                      <p className="text-[9px] text-pink-500 font-bold">${p.price}</p>
                    </div>
                    <button onClick={() => removeProduct(p.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 transition-all">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 p-8 rounded-[3rem] space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">Panel de Galería</h3>
              <div className="grid grid-cols-4 gap-2">
                {gallery.map(item => (
                  <div key={item.id} className="aspect-square rounded-xl overflow-hidden relative group border border-white/5">
                    <img src={item.url} className="w-full h-full object-cover" />
                    <button onClick={() => removeFromGallery(item.id)} className="absolute inset-0 bg-red-600/80 items-center justify-center flex opacity-0 group-hover:opacity-100 transition-all text-[8px] font-black">BORRAR</button>
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
              <button onClick={() => {
                localStorage.setItem('wa_number', social.whatsappNumber);
                alert("WhatsApp guardado");
              }} className="w-full py-4 bg-white text-black font-black text-[10px] uppercase rounded-2xl hover:bg-pink-500 hover:text-white transition-colors">Guardar WhatsApp</button>
            </div>
          </section>

          <section className="bg-white/5 p-10 rounded-[3rem] space-y-6 border border-white/10">
            <h3 className="text-xl font-black italic">IA <span className="text-cyan-400">Settings</span></h3>
            <p className="text-[9px] text-gray-500 uppercase font-black leading-relaxed">Si el agente deja de responder, pega una nueva clave de Gemini aquí:</p>
            <div className="space-y-4">
              <input
                type="password"
                defaultValue={localStorage.getItem('custom_gemini_key') || ''}
                onBlur={(e) => {
                  if (e.target.value) {
                    localStorage.setItem('custom_gemini_key', e.target.value);
                    alert("Clave de IA actualizada. Refresca la página.");
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-cyan-400"
                placeholder="Pega tu nueva API Key aquí..."
              />
              <button
                onClick={() => {
                  localStorage.removeItem('custom_gemini_key');
                  window.location.reload();
                }}
                className="w-full py-2 text-[9px] text-gray-600 font-black uppercase hover:text-white transition-colors"
              >
                Restablecer a clave original
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Admin;
