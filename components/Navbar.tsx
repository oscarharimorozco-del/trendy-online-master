
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  isAdmin: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isAdmin }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="container mx-auto px-4 h-24 flex items-center justify-between">
        <div className="flex items-center gap-4 group">
          <Link
            to={isAdmin ? "/admin" : "/login"}
            className={`accent-gradient p-3 rounded-2xl rotate-3 group-hover:rotate-0 transition-all duration-700 shadow-xl shadow-pink-500/20 ${isAdmin ? 'ring-2 ring-cyan-400' : ''}`}
          >
            <span className="text-white font-black text-2xl tracking-tighter">TO</span>
          </Link>
          <Link to="/" className="text-3xl font-extrabold tracking-tighter group flex items-baseline">
            Trendy<span className="text-gradient group-hover:brightness-150 transition-all">Online</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-10">
          <Link to="/shop" className={`text-[11px] font-black uppercase tracking-widest transition-all ${location.pathname === '/shop' ? 'text-pink-500 scale-110' : 'text-gray-400 hover:text-white'}`}>Colección</Link>
          <Link to="/gallery" className={`text-[11px] font-black uppercase tracking-widest transition-all ${location.pathname === '/gallery' ? 'text-pink-500 scale-110' : 'text-gray-400 hover:text-white'}`}>Galería</Link>

          <div className="h-4 w-[1px] bg-white/10 mx-2"></div>

          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-400 hover:text-[#1877F2] transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" /></svg>
          </a>

          {isAdmin && (
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-6 py-3 rounded-full hover:bg-cyan-400/20 transition-all shadow-lg shadow-cyan-400/10">
                Admin Maestro
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('trendy_is_admin');
                  window.location.reload();
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-full hover:bg-red-500 hover:text-white transition-all"
              >
                Salir
              </button>
            </div>
          )}
        </div>

        {/* Menú móvil: hamburguesa + panel */}
        <div className="md:hidden flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-12 h-12 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
          {menuOpen && (
            <div className="absolute top-24 left-0 right-0 glass border-b border-white/10 py-6 px-4 flex flex-col gap-4 animate-fade-in">
              <Link to="/shop" className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>Colección</Link>
              <Link to="/gallery" className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>Galería</Link>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-white/10">Facebook</a>
              {isAdmin && <Link to="/admin" className="text-cyan-400 text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-cyan-400/20" onClick={() => setMenuOpen(false)}>Admin</Link>}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
