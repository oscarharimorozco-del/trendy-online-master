
import React from 'react';
import { useProducts } from '../context/ProductContext';

const Gallery: React.FC = () => {
  const { gallery, removeFromGallery } = useProducts();
  const isAdmin = localStorage.getItem('trendy_is_admin') === 'true';

  return (
    <div className="space-y-16 animate-fade-in pb-20">
      <header className="text-center space-y-6">
        <h1 className="text-8xl font-black tracking-tighter uppercase leading-none">Trendy <span className="text-gradient">Gallery</span></h1>
        <p className="text-gray-500 text-xl font-light tracking-widest uppercase">Capturando la esencia del estilo maestro.</p>
      </header>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {gallery.map((item) => (
            <div key={item.id} className="group relative rounded-[3rem] overflow-hidden bg-white/5 border border-white/10 aspect-[4/5] shadow-2xl transition-all hover:scale-[1.02] hover:shadow-pink-500/20">
              {item.type === 'image' ? (
                <img 
                  src={item.url} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" 
                />
              ) : (
                <video 
                  src={item.url} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  aria-label={item.name}
                />
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-12">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.5em] mb-2">Exclusivo Trendy</span>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{item.name.split('.')[0]}</h3>
                
                {isAdmin && (
                  <button 
                    onClick={() => removeFromGallery(item.id)}
                    className="mt-6 self-start bg-red-500/80 p-3 rounded-xl hover:bg-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-40 glass rounded-[4rem] border-dashed border-white/10 max-w-4xl mx-auto">
          <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-10 animate-float">
            <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-3xl font-black text-gray-500 uppercase tracking-tighter italic">Revelando la Visión...</h3>
          <p className="text-gray-700 text-sm mt-4 font-bold uppercase tracking-widest">Contenido exclusivo en proceso de curaduría.</p>
        </div>
      )}
    </div>
  );
};

export default Gallery;
