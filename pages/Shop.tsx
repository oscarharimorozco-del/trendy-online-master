
import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { Product } from '../types';

const Shop: React.FC = () => {
  const { products } = useProducts();
  const [activeCategory, setActiveCategory] = useState<string>('Todo');
  const [activeSize, setActiveSize] = useState<string | null>(null);

  const categories = ['Todo', 'Polos', 'Playeras', 'Accesorios', 'Cuadros', 'Pinturas', 'Videos'];
  const sizes = ['S', 'M', 'L', 'XL', '2XL'];

  const waNumber = localStorage.getItem('wa_number') || '+521234567890';

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'Todo' ? true : p.category === activeCategory;
      if (['Accesorios', 'Cuadros', 'Pinturas', 'Videos'].includes(activeCategory)) return matchCat;
      return matchCat && (!activeSize || p.sizes?.includes(activeSize));
    });
  }, [products, activeCategory, activeSize]);

  return (
    <div className="space-y-16 animate-fade-in pb-20">
      <header className="flex flex-col lg:flex-row justify-between items-end gap-10 border-b border-white/5 pb-16">
        <div className="max-w-xl">
          <h1 className="text-8xl font-black tracking-tighter uppercase leading-[0.8] mb-4">Gihart <span className="text-gradient">Catalog</span></h1>
          <p className="text-gray-500 text-lg">Moda masculina premium. Importación directa.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                if (['Accesorios', 'Cuadros', 'Pinturas', 'Videos'].includes(cat) || cat === 'Todo') setActiveSize(null);
                else setActiveSize('M');
              }}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'accent-gradient shadow-xl' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-12">
        {/* FILTROS */}
        {(!['Accesorios', 'Cuadros', 'Pinturas', 'Videos'].includes(activeCategory)) && activeCategory !== 'Todo' && (
          <aside className="xl:w-72 space-y-8 shrink-0">
            <div className="glass p-8 rounded-[2.5rem] border-white/10 sticky top-28">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-pink-500 mb-6 text-center">Filtrar por Talla</h3>
              <div className="grid grid-cols-2 gap-2">
                {sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveSize(s)}
                    className={`py-4 rounded-xl text-[10px] font-black border transition-all ${activeSize === s ? 'accent-gradient border-transparent text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-8 text-[9px] text-gray-600 text-center uppercase font-bold leading-relaxed">
                * Stock sujeto a disponibilidad inmediata.
              </p>
            </div>
          </aside>
        )}

        {/* PRODUCTOS */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
            {filtered.map(p => (
              <div key={p.id} className="group glass rounded-[2.5rem] overflow-hidden border-white/5 flex flex-col h-full hover:border-pink-500/30 transition-all shadow-2xl">
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase text-white tracking-widest border border-white/10">Gihart & Hersel</span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-xl leading-tight uppercase tracking-tighter">{p.name}</h3>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white">${p.price} <span className="text-[8px] text-gray-500">MXN</span></p>
                      {p.wholesalePrice && (
                        <div className="mt-1">
                          <p className="text-[10px] text-pink-500 font-black uppercase">Mayoreo: ${p.wholesalePrice}</p>
                          <p className="text-[7px] text-gray-600 font-black uppercase tracking-tighter">(A partir de 6 piezas)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 flex flex-wrap gap-1">
                    {p.sizes?.map(s => (
                      <span key={s} className="text-[8px] font-black bg-white/5 px-2 py-1 rounded border border-white/5 text-gray-400 uppercase">{s}</span>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 italic line-clamp-2 mb-8 leading-relaxed">"{p.description}"</p>

                  <div className="mt-auto">
                    <a
                      href={`https://wa.me/${waNumber.replace('+', '')}?text=Hola! Me interesa: ${p.name}. Talla: ${activeSize || 'Verificar'}.`}
                      target="_blank"
                      className="w-full py-4 accent-gradient text-center rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all block text-white shadow-xl shadow-pink-500/10"
                    >
                      Consultar Disponibilidad
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-40 glass rounded-[3rem] border-dashed border-white/10 border-2">
              <h3 className="text-xl font-bold text-gray-700 italic uppercase tracking-widest">Sin stock en esta selección</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
