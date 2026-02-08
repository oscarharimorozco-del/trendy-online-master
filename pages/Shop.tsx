
import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { Product } from '../types';

const Shop: React.FC = () => {
  const { products } = useProducts();
  const { addToCart } = useCart();
  const [searchParams] = React.useMemo(() => [new URLSearchParams(window.location.hash.split('?')[1] || '')], [window.location.hash]);
  const initialGender = searchParams.get('gender') || 'Todo';

  const [activeCategory, setActiveCategory] = useState<string>('Todo');
  const [activeGender, setActiveGender] = useState<string>(initialGender);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  const categories = ['Todo', 'Polos', 'Playeras', 'Accesorios', 'Cuadros', 'Pinturas', 'Videos'];
  const genders = ['Todo', 'Hombre', 'Mujer', 'Unisex'];
  const sizes = ['S', 'M', 'L', 'XL', '2XL'];

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'Todo' ? true : p.category === activeCategory;
      const matchGender = activeGender === 'Todo' ? true : p.gender === activeGender;
      if (['Accesorios', 'Cuadros', 'Pinturas', 'Videos'].includes(activeCategory)) return matchCat;
      return matchCat && matchGender && (!activeSize || p.sizes?.includes(activeSize));
    });
  }, [products, activeCategory, activeGender, activeSize]);

  const handleAddToCart = (product: Product) => {
    const size = selectedSizes[product.id] || (product.sizes?.[0]) || 'N/A';
    addToCart(product, size);

    // Feedback visual simple
    const btn = document.getElementById(`btn-${product.id}`);
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = "¡AÑADIDO!";
      btn.classList.add('bg-green-600');
      setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-green-600');
      }, 1000);
    }
  };

  return (
    <div className="space-y-16 animate-fade-in pb-20 selection:bg-pink-500">
      <header className="flex flex-col lg:flex-row justify-between items-end gap-10 border-b border-white/5 pb-16">
        <div className="max-w-xl">
          <h1 className="text-8xl font-black tracking-tighter uppercase leading-[0.8] mb-4">Gihart <span className="text-gradient">Catalog</span></h1>
          <p className="text-gray-500 text-lg uppercase font-black tracking-widest text-[10px]">Moda masculina premium. Importación directa.</p>
        </div>
        <div className="flex flex-col gap-6 w-full lg:w-auto">
          <div className="flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 self-end">
            {genders.map(g => (
              <button
                key={g}
                onClick={() => setActiveGender(g)}
                className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeGender === g ? 'bg-white text-black shadow-xl scale-105' : 'text-gray-500 hover:text-white'}`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  if (['Accesorios', 'Cuadros', 'Pinturas', 'Videos'].includes(cat) || cat === 'Todo') setActiveSize(null);
                  else if (!activeSize) setActiveSize('M');
                }}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'accent-gradient shadow-xl' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-12">
        {/* FILTROS LATERALES */}
        {(!['Accesorios', 'Cuadros', 'Pinturas', 'Videos'].includes(activeCategory)) && activeCategory !== 'Todo' && (
          <aside className="xl:w-72 space-y-8 shrink-0">
            <div className="glass p-8 rounded-[3.5rem] border-white/10 sticky top-28 bg-white/[0.02]">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500 mb-6 text-center">Talla Global</h3>
              <div className="grid grid-cols-2 gap-2">
                {sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={`py-4 rounded-2xl text-[10px] font-black border transition-all ${activeSize === s ? 'accent-gradient border-transparent text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* PRODUCTOS */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-10">
            {filtered.map(p => (
              <div key={p.id} className="group flex flex-col h-full transition-all duration-500 hover:translate-y-[-10px]">
                <div className="aspect-[3/4] rounded-[3rem] overflow-hidden relative shadow-2xl border border-white/5">
                  <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                    <p className="text-[10px] text-white/60 font-medium leading-relaxed italic">"{p.description}"</p>
                  </div>
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <span className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-full text-[8px] font-black uppercase text-white tracking-[0.3em] border border-white/10 shadow-2xl">Premium Collection</span>
                    {p.isPromotion && (
                      <span className="bg-yellow-500 text-black px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.2em] animate-pulse shadow-lg shadow-yellow-500/50 flex items-center gap-2">
                        <span className="text-sm">⚡</span> PROMOCIÓN
                      </span>
                    )}
                    {p.isSoldOut && (
                      <span className="bg-red-500 text-white px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-500/50 flex items-center gap-2">
                        <span className="text-sm">🚫</span> AGOTADO
                      </span>
                    )}
                  </div>
                </div>

                <div className={`pt-8 px-4 flex flex-col flex-1 space-y-6 ${p.isSoldOut ? 'opacity-50 grayscale' : ''}`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-2xl uppercase tracking-tighter leading-none mb-2">{p.name}</h3>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{p.category} | {p.gender}</p>
                      </div>
                      <div className="text-right">
                        {p.isPromotion && p.promoPrice ? (
                          <>
                            <p className="text-3xl font-black text-yellow-500 italic tracking-tighter leading-none">${p.promoPrice}</p>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-tighter mt-1 line-through opacity-50">${p.price}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-3xl font-black text-white italic tracking-tighter leading-none">${p.price}</p>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter mt-1">Precio Unitario</p>
                          </>
                        )}
                      </div>
                    </div>

                    {p.wholesalePrice && (
                      <div className="flex justify-between items-center py-3 px-4 bg-cyan-400/5 rounded-2xl border border-cyan-400/20 group-hover:bg-cyan-400/10 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">Mayoreo</span>
                          <span className="text-[7px] font-bold text-cyan-400/60 uppercase">Después de 6 pzas</span>
                        </div>
                        <span className="text-2xl font-black text-cyan-400 italic tracking-tighter">${p.wholesalePrice}</span>
                      </div>
                    )}
                  </div>

                  {/* Selector de Tallas */}
                  {p.sizes && p.sizes.length > 0 && (
                    <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                      {p.sizes.map(s => (
                        <button
                          key={s}
                          disabled={p.isSoldOut}
                          onClick={() => setSelectedSizes(prev => ({ ...prev, [p.id]: s }))}
                          className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all ${(selectedSizes[p.id] || p.sizes[0]) === s ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    {p.isSoldOut ? (
                      <div className="w-full py-5 bg-white/5 text-gray-500 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-center border border-white/5">
                        Producto Agotado
                      </div>
                    ) : (
                      <button
                        id={`btn-${p.id}`}
                        onClick={() => handleAddToCart(p)}
                        className="w-full py-5 bg-white text-black rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-pink-500 hover:text-white transition-all transform active:scale-95"
                      >
                        Añadir al Carrito
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-40 bg-white/[0.02] rounded-[4rem] border-dashed border-white/5 border-2 flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center opacity-20">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="1" /></svg>
              </div>
              <h3 className="text-xl font-black text-gray-700 uppercase tracking-widest">Sin coincidencias</h3>
              <button onClick={() => setActiveCategory('Todo')} className="text-pink-500 text-[10px] font-black uppercase hover:underline">Ver todo el catálogo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
