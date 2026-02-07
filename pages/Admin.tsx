
import React, { useState, useRef, useEffect } from 'react';
import { Product, CategoryType, GenderType, SocialConfig } from '../types';
import { useProducts } from '../context/ProductContext';
import { AdminAgent } from '../components/AdminAgent';
import { supabase } from '../services/supabase';
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
  const { addProduct, addToGallery } = useProducts();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const manualUploadRef = useRef<HTMLInputElement>(null);

  // Estados para Entrada Directa (Manual)
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState<number>(450);
  const [manualWholesale, setManualWholesale] = useState<number>(350);
  const [manualImg, setManualImg] = useState('');
  const [manualCategory, setManualCategory] = useState<CategoryType>('Polos');
  const [manualGender, setManualGender] = useState<GenderType>('Hombre');
  const [isSaving, setIsSaving] = useState(false);

  const [social, setSocial] = useState<SocialConfig>({
    facebookStoreUrl: localStorage.getItem('fb_store_url') || '',
    whatsappNumber: localStorage.getItem('wa_number') || '+521'
  });

  const categories: CategoryType[] = ['Polos', 'Playeras', 'Accesorios', 'Cuadros', 'Pinturas', 'Videos'];
  const genders: GenderType[] = ['Hombre', 'Mujer', 'Unisex'];
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
          description: "Nueva pieza de colección Master Edition."
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

  const saveAll = async () => {
    setIsSaving(true);
    try {
      for (const f of pendingFiles) {
        let finalUrl = f.src;

        // Si es una imagen/video local (base64), subir a Supabase Storage
        if (f.src.startsWith('data:')) {
          const fileExt = f.src.split(';')[0].split('/')[1];
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${f.target}/${fileName}`;

          // Convertir base64 a Blob
          const base64Data = f.src.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: f.src.split(';')[0].split(':')[1] });

          const { data, error } = await supabase.storage
            .from('imagenes')
            .upload(filePath, blob);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('imagenes')
            .getPublicUrl(filePath);

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
            category: f.category
          });
        }
      }
      setPendingFiles([]);
      alert("Inventario sincronizado con éxito.");
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`Error al subir archivos: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveManual = async () => {
    if (!manualName || !manualPrice) return alert("Nombre y precio obligatorios");

    setIsSaving(true);
    try {
      let finalUrl = manualImg;

      // Si es una imagen local (base64), subir a Supabase Storage
      if (manualImg.startsWith('data:')) {
        const fileExt = manualImg.split(';')[0].split('/')[1];
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `shop/${fileName}`;

        const base64Data = manualImg.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: manualImg.split(';')[0].split(':')[1] });

        const { error } = await supabase.storage.from('imagenes').upload(filePath, blob);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('imagenes').getPublicUrl(filePath);
        finalUrl = publicUrl;
      }

      await addProduct({
        name: manualName,
        price: manualPrice,
        wholesalePrice: manualWholesale,
        category: manualCategory,
        gender: manualGender,
        image: finalUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
        description: "Carga manual estratégica.",
        sizes: ['M', 'L']
      });

      setManualName('');
      setManualImg('');
      alert("¡Pieza añadida con éxito!");
    } catch (e: any) {
      console.error(e);
      alert(`Error al guardar el producto: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveSocial = () => {
    localStorage.setItem('fb_store_url', social.facebookStoreUrl);
    localStorage.setItem('wa_number', social.whatsappNumber);
    alert("Configuración de contacto guardada.");
  };

  return (
    <div className="space-y-12 pb-20 animate-fade-in max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-center gap-8 glass p-8 rounded-[2.5rem] border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="accent-gradient p-4 rounded-2xl rotate-3 shadow-xl">
            <span className="text-white font-black text-2xl uppercase">Master</span>
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Control <span className="text-gradient">Total</span></h1>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gihart & Hersel Group 2025</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onLogout} className="glass border-red-500/20 px-8 py-3 rounded-2xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10 transition-all">Desconectarse</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-12">
          {/* ENTRADA DIRECTA (MANUAL) */}
          <section className="glass p-10 rounded-[3rem] border-white/5 space-y-8 bg-gradient-to-br from-white/[0.02] to-transparent">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">Entrada <span className="text-cyan-400">Directa</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Producto</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="Ej: Polo Obsidian Black"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Precio Menudeo</label>
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={e => setManualPrice(Number(e.target.value))}
                      placeholder="450"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Precio Mayoreo (+6 pzs)</label>
                    <input
                      type="number"
                      value={manualWholesale}
                      onChange={e => setManualWholesale(Number(e.target.value))}
                      placeholder="350"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Género</label>
                  <div className="flex gap-2">
                    {genders.map(g => (
                      <button
                        key={g}
                        onClick={() => setManualGender(g)}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-bold uppercase transition-all ${manualGender === g ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Categoría</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(c => (
                      <button
                        key={c}
                        onClick={() => setManualCategory(c)}
                        className={`py-3 rounded-xl text-[8px] font-bold uppercase transition-all ${manualCategory === c ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Foto del Producto</label>
                    <button
                      onClick={() => manualUploadRef.current?.click()}
                      className="text-[8px] font-black text-cyan-400 uppercase tracking-widest hover:underline"
                    >
                      {manualImg.startsWith('data:') ? '✓ Foto Cargada' : '+ Subir Archivo'}
                    </button>
                    <input
                      type="file"
                      ref={manualUploadRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setManualImg(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    value={manualImg.startsWith('data:') ? 'Imagen local seleccionada...' : manualImg}
                    onChange={e => setManualImg(e.target.value)}
                    placeholder="Pega un link o usa el botón de arriba"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  {manualImg.startsWith('data:') && (
                    <div className="mt-2 relative group w-20 h-20">
                      <img src={manualImg} className="w-20 h-20 object-cover rounded-lg border border-white/10" />
                      <button onClick={() => setManualImg('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[8px] flex items-center justify-center">✕</button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!manualName) return alert("Escribe un nombre primero");
                      const resp = await geminiService.chat([], `Genera una descripción de lujo para un producto llamado ${manualName} de categoría ${manualCategory}.`, "");
                      alert("Sugerencia AI:\n\n" + resp.text);
                    }}
                    className="flex-1 py-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-[8px] font-black uppercase text-pink-500 hover:bg-pink-500 transition-all hover:text-white"
                  >
                    Sugerir Reseña
                  </button>
                  <button
                    onClick={async () => {
                      if (!manualName) return alert("Escribe un nombre y precio");
                      const resp = await geminiService.chat([], `Crea un post de Marketplace para ${manualName} con precio ${manualPrice}. Sin marcas.`, "");
                      alert("Post copiado al portapapeles.");
                      if (resp.text) navigator.clipboard.writeText(resp.text);
                    }}
                    className="flex-1 py-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[8px] font-black uppercase text-cyan-400 hover:bg-cyan-400 transition-all hover:text-black"
                  >
                    Post FB
                  </button>
                </div>

                <button
                  onClick={saveManual}
                  disabled={isSaving}
                  className={`w-full py-5 accent-gradient text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-cyan-500/10 ${isSaving ? 'opacity-50 cursor-not-wait' : ''}`}
                >
                  {isSaving ? 'Guardando...' : 'Registrar en el Sistema'}
                </button>
              </div>
              <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-8 flex flex-col justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-cyan-400/10 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" /></svg>
                </div>
                <h3 className="text-xs font-black uppercase tracking-tighter">Creación Rápida</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                  Ideal para piezas sin fotos nuevas o para actualizar stock rápidamente desde el móvil.
                </p>
              </div>
            </div>
          </section>

          {/* GESTIÓN DE INVENTARIO */}
          <section className="glass p-10 rounded-[3rem] border-white/5 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Inventario <span className="text-pink-500">Tienda</span></h2>
              <span className="bg-pink-500/10 text-pink-500 px-4 py-1 rounded-full text-[9px] font-black uppercase">{useProducts().products.length} Productos</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {useProducts().products.map(p => (
                <div key={p.id} className="glass p-5 rounded-[2rem] border-white/5 flex gap-5 items-center group hover:bg-white/[0.03] transition-all">
                  <img src={p.image} className="w-20 h-20 rounded-2xl object-cover shadow-2xl" />
                  <div className="flex-1">
                    <p className="text-[11px] font-black uppercase tracking-tighter leading-none mb-1">{p.name}</p>
                    <p className="text-[10px] text-pink-500 font-black">${p.price} <span className="text-gray-600">MXN</span></p>
                    <div className="flex gap-1 mt-2">
                      <span className="text-[7px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-gray-400">{p.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => useProducts().removeProduct(p.id)}
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    title="Eliminar producto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" strokeWidth="2" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* GESTIÓN DE GALERÍA */}
          <section className="glass p-10 rounded-[3rem] border-white/5 space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Contenido <span className="text-cyan-400">Galería</span></h2>
              <span className="bg-cyan-400/10 text-cyan-400 px-4 py-1 rounded-full text-[9px] font-black uppercase">{useProducts().gallery.length} Archivos</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {useProducts().gallery.map(item => (
                <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/5">
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" muted loop autoPlay />
                  ) : (
                    <img src={item.url} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <button
                      onClick={() => useProducts().removeFromGallery(item.id)}
                      className="p-2 bg-red-500 rounded-lg text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" strokeWidth="2" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CARGADOR MULTIMODAL */}
          <section className="glass p-10 rounded-[3rem] border-white/5 space-y-8 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Carga <span className="text-pink-500">Masiva</span></h2>
              {pendingFiles.length > 0 && (
                <button onClick={saveAll} className="accent-gradient px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all text-white">
                  Sincronizar {pendingFiles.length} Piezas
                </button>
              )}
            </div>

            <div
              onClick={() => uploadInputRef.current?.click()}
              className="aspect-[4/1] border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition-all bg-white/5 group"
            >
              <svg className="w-8 h-8 text-cyan-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="1.5" /></svg>
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Arrastra o haz clic para subir</span>
              <input type="file" ref={uploadInputRef} multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelection} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingFiles.map(f => (
                <div key={f.id} className="glass p-6 rounded-[2.5rem] border-white/10 space-y-6 relative group overflow-hidden">
                  <button onClick={() => setPendingFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute top-4 right-4 bg-red-500 w-8 h-8 rounded-full text-white text-[10px] font-black z-20">✕</button>
                  <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/5 mb-4 relative">
                    {f.src.startsWith('data:video') ? (
                      <video src={f.src} className="w-full h-full object-cover" muted loop autoPlay />
                    ) : (
                      <img src={f.src} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <select
                        value={f.target}
                        onChange={e => updatePending(f.id, { target: e.target.value as any })}
                        className="bg-white text-black text-[9px] font-black uppercase px-4 py-2 rounded-full outline-none"
                      >
                        <option value="shop">Ir a Tienda</option>
                        <option value="gallery">Ir a Galería</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                      value={f.name}
                      onChange={e => updatePending(f.id, { name: e.target.value })}
                      placeholder="Nombre de la pieza"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-white outline-none focus:border-pink-500"
                    />

                    {f.target === 'shop' ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-500 uppercase ml-2">Menudeo MXN</label>
                            <input type="number" value={f.price} onChange={e => updatePending(f.id, { price: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-500 uppercase ml-2">Mayoreo MXN <span className="text-pink-500">(+6 pzs)</span></label>
                            <input type="number" value={f.wholesalePrice} onChange={e => updatePending(f.id, { wholesalePrice: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Categoría</label>
                          <div className="flex flex-wrap gap-2">
                            {categories.map(c => (
                              <button
                                key={c}
                                onClick={() => updatePending(f.id, { category: c })}
                                className={`px-3 py-2 rounded-lg text-[8px] font-bold uppercase transition-all ${f.category === c ? 'bg-pink-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'}`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Género</label>
                          <div className="flex gap-2">
                            {genders.map(g => (
                              <button
                                key={g}
                                onClick={() => updatePending(f.id, { gender: g })}
                                className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all ${f.gender === g ? 'bg-cyan-500 text-black shadow-lg' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>

                        {!['Accesorios', 'Cuadros', 'Pinturas', 'Videos'].includes(f.category) && (
                          <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tallas</label>
                            <div className="flex justify-between gap-1">
                              {sizeOptions.map(s => (
                                <button
                                  key={s}
                                  onClick={() => toggleSize(f.id, s)}
                                  className={`flex-1 py-2 rounded-lg text-[9px] font-black border transition-all ${f.sizes.includes(s) ? 'bg-white text-black border-transparent shadow-lg' : 'bg-white/5 border-white/5 text-gray-600'}`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t border-white/5 space-y-3">
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const resp = await geminiService.chat([], `Genera una descripción corta y elegante para una ${f.category} llamada ${f.name} de género ${f.gender}. Sé muy persuasivo.`, "");
                                updatePending(f.id, { description: resp.text || f.description });
                              }}
                              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase text-pink-500 hover:bg-pink-500/10 transition-all flex items-center justify-center gap-2"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 7.5L14 10L11.5 12.5L9 10L11.5 7.5ZM19 12L21 14L19 16L17 14L19 12ZM7 14L9 16L7 18L5 16L7 14ZM11.5 3L13.1 6.4L16.5 8L13.1 9.6L11.5 13L9.9 9.6L6.5 8L9.9 6.4L11.5 3Z" /></svg>
                              Reseña AI
                            </button>
                            <button
                              onClick={async () => {
                                const resp = await geminiService.chat([], `Genera una publicación para Facebook Marketplace de una ${f.category} llamada ${f.name}. PRECIO: ${f.price}. No menciones marcas si hay logos, enfócate en calidad premium y exclusividad. Usa emojis.`, "");
                                alert("Copiado al portapapeles: \n\n" + resp.text);
                                if (resp.text) navigator.clipboard.writeText(resp.text);
                              }}
                              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase text-cyan-400 hover:bg-cyan-400/10 transition-all flex items-center justify-center gap-2"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17 2H7C5.89543 2 5 2.89543 5 4V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V4C19 2.89543 18.1046 2 -17 2ZM17 20H7V4H17V20ZM12 18C13.1046 18 14 17.1046 14 16C14 14.8954 13.1046 14 12 14C10.8954 14 10 14.8954 10 16C10 17.1046 10.8954 18 12 18Z" /></svg>
                              Post Marketplace
                            </button>
                          </div>
                          <textarea
                            value={f.description}
                            onChange={e => updatePending(f.id, { description: e.target.value })}
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-gray-400 outline-none focus:border-pink-500 resize-none"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="bg-cyan-400/5 border border-cyan-400/10 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest text-center">Modo Galería Activo</p>
                        <p className="text-[8px] text-gray-500 uppercase font-bold text-center mt-2">Se guardará solo como contenido visual (Lookbook)</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-10">
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 ml-4">Asistente Inteligente</h3>
            <AdminAgent />
          </section>

          {/* CONFIG SOCIAL */}
          <section className="glass p-8 rounded-[2.5rem] border-white/10 space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tighter italic">Configuración <span className="text-gradient">Redes</span></h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">WhatsApp de Ventas</label>
                <input
                  type="text"
                  value={social.whatsappNumber}
                  onChange={e => setSocial({ ...social, whatsappNumber: e.target.value })}
                  placeholder="+52..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">URL Facebook Store</label>
                <input
                  type="text"
                  value={social.facebookStoreUrl}
                  onChange={e => setSocial({ ...social, facebookStoreUrl: e.target.value })}
                  placeholder="https://facebook.com/tienda"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              <button
                onClick={saveSocial}
                className="w-full py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 hover:text-white transition-all shadow-xl"
              >
                Guardar Configuración
              </button>
            </div>
          </section>

          {/* MANUAL RAPIDO */}
          <div className="bg-pink-500/10 border border-pink-500/20 p-6 rounded-[2rem] space-y-4">
            <h4 className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Tip de Maestro</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed font-bold uppercase italic">
              "Para un catálogo impecable, usa fotos en fondo neutro. El agente detectará automáticamente los colores si lo activas."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
