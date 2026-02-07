
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Gallery from './pages/Gallery';
import { Navbar } from './components/Navbar';
import { ChatBot } from './components/ChatBot';
import { WhatsAppButton } from './components/WhatsAppButton';
import { ProductProvider } from './context/ProductContext';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const authStatus = localStorage.getItem('trendy_is_admin') === 'true';
    setIsAdmin(authStatus);
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem('trendy_is_admin', 'true');
    setIsAdmin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('trendy_is_admin');
    setIsAdmin(false);
  };

  return (
    <HashRouter>
      <ProductProvider>
        <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-pink-500 selection:text-white">
          <Navbar isAdmin={isAdmin} />
          
          <main className="container mx-auto px-4 py-8 flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route 
                path="/login" 
                element={isAdmin ? <Navigate to="/admin" replace /> : <Login onLoginSuccess={handleLoginSuccess} />} 
              />
              <Route 
                path="/admin" 
                element={isAdmin ? <Admin onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <WhatsAppButton />
          <ChatBot />

          <footer className="border-t border-white/5 py-20 bg-black/50 mt-20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="accent-gradient p-2 rounded-xl rotate-6 shadow-xl shadow-pink-500/20">
                      <span className="text-white font-black text-sm tracking-tighter">GH</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter">Gihart & Hersel</span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed max-w-xs uppercase font-bold tracking-widest">
                    Curaduría de moda masculina premium para el hombre que define su propia historia.
                  </p>
                  <div className="flex gap-4">
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white hover:text-black transition-all">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                    </a>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500">Navegación</h4>
                  <Link to="/shop" className="text-xs text-gray-500 hover:text-white transition-colors uppercase font-bold">Catálogo MXN</Link>
                  <Link to="/gallery" className="text-xs text-gray-500 hover:text-white transition-colors uppercase font-bold">Lookbook 2025</Link>
                </div>

                <div className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Privacidad</h4>
                  <Link to="/login" className="text-[10px] text-gray-800 hover:text-gray-500 transition-colors uppercase font-black">Acceso Propietario</Link>
                </div>

                <div className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-500">Sede</h4>
                  <p className="text-xs text-gray-500 uppercase font-bold">Distribución Nacional. <br/> Calidad Garantizada.</p>
                </div>
              </div>
              
              <div className="pt-10 border-t border-white/5 text-center">
                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.5em]">
                  &copy; 2025 GIHART & HERSEL GROUP. TODOS LOS DERECHOS RESERVADOS.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </ProductProvider>
    </HashRouter>
  );
};

export default App;
