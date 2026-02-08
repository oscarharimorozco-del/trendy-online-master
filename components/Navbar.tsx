
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Cart } from './Cart';

interface NavbarProps {
  isAdmin: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isAdmin }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { cartCount } = useCart();

  return (
    <>
      <nav className="sticky top-0 z-50 glass border-b border-white/5 selection:bg-pink-500">
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

            <button
              onClick={() => setCartOpen(true)}
              className="relative p-3 bg-white/5 rounded-2xl group hover:bg-white/10 transition-all"
              aria-label="Abrir carrito"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-pink-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="2" /></svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-pink-500/30">
                  {cartCount}
                </span>
              )}
            </button>

            {isAdmin && (
              <div className="flex items-center gap-4">
                <Link to="/admin" className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-6 py-3 rounded-full hover:bg-cyan-400/20 transition-all shadow-lg shadow-cyan-400/10">
                  Admin Maestro
                </Link>
              </div>
            )}
          </div>

          {/* Menú móvil */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 bg-white/5 rounded-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="2" /></svg>
              {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-[8px] font-black rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="absolute top-24 left-0 right-0 glass border-b border-white/10 py-6 px-4 flex flex-col gap-4 animate-fade-in md:hidden">
            <Link to="/shop" className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>Colección</Link>
            <Link to="/gallery" className="text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-white/10" onClick={() => setMenuOpen(false)}>Galería</Link>
            {isAdmin && <Link to="/admin" className="text-cyan-400 text-[11px] font-black uppercase tracking-widest py-3 px-4 rounded-xl hover:bg-cyan-400/20" onClick={() => setMenuOpen(false)}>Admin</Link>}
          </div>
        )}
      </nav>

      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
};
