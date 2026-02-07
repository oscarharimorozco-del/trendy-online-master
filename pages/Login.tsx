import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'trendy2024') {
      // Usar localStorage para persistencia tras cerrar el navegador
      localStorage.setItem('trendy_is_admin', 'true');
      onLoginSuccess();
      navigate('/admin');
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 animate-fade-in">
      <div className="glass p-10 md:p-16 rounded-[4rem] w-full max-w-md border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 accent-gradient rounded-full blur-[80px] opacity-20"></div>
        
        <div className="text-center mb-12 relative z-10">
          <div className="accent-gradient w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-pink-500/30 rotate-6">
            <span className="text-white font-black text-3xl">TO</span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Panel <span className="text-gradient">Master</span></h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Introduce la clave secreta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8 relative z-10">
          <div className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full bg-white/5 border ${error ? 'border-red-500' : 'border-white/10'} rounded-[2rem] px-8 py-6 text-sm focus:outline-none focus:border-cyan-500 transition-all text-center tracking-[0.6em] placeholder:tracking-normal`}
              placeholder="••••••••"
              autoFocus
            />
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-500">
                <span className="text-[10px] font-black uppercase tracking-widest">Contraseña Incorrecta</span>
              </div>
            )}
          </div>

          <button 
            type="submit"
            className="w-full py-6 accent-gradient rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-pink-500/20 hover:scale-[1.03] transition-all text-white"
          >
            Entrar al Control
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;