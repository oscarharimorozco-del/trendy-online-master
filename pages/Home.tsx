
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { geminiService } from '../services/geminiService';

const Home: React.FC = () => {
  const [tip, setTip] = useState('Elevando el estilo masculino...');
  const [tipLoading, setTipLoading] = useState(true);

  useEffect(() => {
    setTipLoading(true);
    geminiService.getQuickSuggestion("mens high fashion trends").then(t => {
      setTip(t ?? 'Elevando el estilo masculino...');
      setTipLoading(false);
    }).catch(() => {
      setTip('El arte y la moda definen tu legado.');
      setTipLoading(false);
    });
  }, []);

  return (
    <div className="space-y-32 pb-20 overflow-x-hidden">
      {/* Marquee Superior */}
      <div className="bg-white/5 border-y border-white/5 py-4 overflow-hidden select-none">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-20">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-[10px] font-black uppercase tracking-[0.8em] text-white/40 flex items-center gap-4">
              <span className="text-pink-500">✦</span> TRENDY ONLINE 2025 MASTER COLLECTION <span className="text-cyan-400">✦</span> LUXURY APPAREL
            </span>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative rounded-3xl md:rounded-[50px] overflow-hidden h-[500px] md:h-[650px] lg:h-[750px] flex items-center group animate-fade-in">
        <img
          src="https://images.unsplash.com/photo-1550246140-5119ae4790b8?auto=format&fit=crop&q=80&w=2000"
          alt="Estilo de lujo masculino"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-50 scale-110 group-hover:scale-100 transition-transform duration-[4000ms] ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
        <div className="relative z-10 max-w-4xl mx-4 md:mx-8 lg:ml-16 space-y-8 md:space-y-12">
          <div className="animate-float">
            <span className="accent-gradient text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl">
              Nivel Maestro 2025 <span className="opacity-50 ml-2">| BUILD 2.5 - READY</span>
            </span>
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black tracking-tighter leading-[0.8] drop-shadow-2xl">
            FORJA TU <br />
            <span className="text-gradient">LEGADO.</span>
          </h1>
          <p className="text-2xl text-gray-300 max-w-xl font-light leading-relaxed">
            La curaduría perfecta para el hombre que no busca destacar, sino ser recordado.
          </p>
          <div className="flex flex-wrap gap-6">
            <Link to="/shop?gender=Hombre" className="accent-gradient text-white px-10 md:px-14 py-6 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-pink-500/30 ring-2 ring-white/10 flex items-center gap-4 group/btn">
              <span>Hombre</span>
              <svg className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeWidth="3" strokeLinecap="round" /></svg>
            </Link>
            <Link to="/shop?gender=Mujer" className="bg-white/5 backdrop-blur-xl border border-white/10 text-white px-10 md:px-14 py-6 rounded-full font-black text-sm uppercase tracking-widest hover:bg-white/10 hover:scale-105 transition-all flex items-center gap-4 group/btn">
              <span>Mujer</span>
              <svg className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeWidth="3" strokeLinecap="round" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Style Tip Banner */}
      <section className="glass rounded-[40px] p-16 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-80 h-80 accent-gradient rounded-full blur-[120px] opacity-10 group-hover:opacity-30 transition-all duration-1000"></div>
        <div className="accent-gradient p-6 rounded-[2rem] shadow-2xl shadow-pink-500/40 rotate-12 group-hover:rotate-0 transition-transform">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-cyan-400 font-black uppercase tracking-[0.5em] text-[11px] mb-4">Insider Insight</h4>
          {tipLoading ? (
            <p className="text-2xl md:text-4xl text-white/60 font-black tracking-tighter leading-none animate-pulse">Cargando insight...</p>
          ) : (
            <p className="text-2xl md:text-4xl text-white font-black tracking-tighter leading-none">&ldquo;{tip}&rdquo;</p>
          )}
        </div>
      </section>

      {/* Featured Grid */}
      <section>
        <div className="flex justify-between items-end mb-20">
          <div className="space-y-2">
            <h2 className="text-6xl font-black tracking-tighter uppercase italic">Essential <span className="text-gradient">Drops</span></h2>
            <p className="text-gray-500 text-lg uppercase font-bold tracking-widest">Limitados. Premium. Únicos.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { name: "Polos Luxury", img: "https://images.unsplash.com/photo-1598533022411-ad4b23659397?auto=format&fit=crop&q=80&w=800", cat: "Polos" },
            { name: "Essential Tees", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800", cat: "Playeras" },
            { name: "Masters Gear", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800", cat: "Accesorios" },
          ].map((item, idx) => (
            <div key={idx} className="group relative">
              <div className="aspect-[4/5] rounded-[40px] overflow-hidden mb-8 bg-white/5 border border-white/5 shadow-2xl">
                <img src={item.img} alt={item.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-12">
                  <Link to="/shop" className="w-full py-5 glass text-white rounded-2xl font-black text-xs uppercase tracking-widest text-center hover:bg-white hover:text-black transition-all">
                    Ver {item.cat}
                  </Link>
                </div>
              </div>
              <h3 className="text-3xl font-black tracking-tighter">{item.name}</h3>
              <p className="text-gray-600 font-black text-[10px] uppercase tracking-widest mt-1">Calidad Garantizada</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
