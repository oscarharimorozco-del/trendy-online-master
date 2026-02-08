
import React from 'react';
import { useCart } from '../context/CartContext';

export const Cart: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();

    const handleCheckout = () => {
        const waNumber = localStorage.getItem('wa_number') || '+521';
        const message = `¡Hola! Me interesa comprar los siguientes productos de Gihart & Hersel:\n\n` +
            cart.map(item => `- ${item.name} (${item.selectedSize}) x${item.quantity}: $${item.price * item.quantity}`).join('\n') +
            `\n\n*Total: $${cartTotal}*`;

        window.open(`https://wa.me/${waNumber.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 max-w-full flex">
                <div className="w-screen max-w-md animate-slide-left">
                    <div className="h-full flex flex-col bg-[#080808] shadow-2xl border-l border-white/5 selection:bg-pink-500">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Tu <span className="text-pink-500">Carrito</span></h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" /></svg>
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <div className="p-8 bg-white/5 rounded-full">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="1" /></svg>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest">El carrito está vacío</p>
                                    <button onClick={onClose} className="text-[10px] text-pink-500 font-black uppercase hover:underline">Explorar Catálogo</button>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4 bg-white/[0.02] p-4 rounded-3xl border border-white/5 group relative overflow-hidden transition-all hover:bg-white/5">
                                        <div className="w-20 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">{item.name}</h3>
                                                    <button onClick={() => removeFromCart(item.id, item.selectedSize)} className="text-gray-600 hover:text-red-500 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" /></svg>
                                                    </button>
                                                </div>
                                                <p className="text-[9px] font-bold text-gray-500 uppercase mt-1">Talla: {item.selectedSize}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center bg-black/40 rounded-xl border border-white/5">
                                                    <button onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity - 1)} className="px-3 py-1 hover:text-pink-500">-</button>
                                                    <span className="px-2 text-[10px] font-bold">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, item.selectedSize, item.quantity + 1)} className="px-3 py-1 hover:text-pink-500">+</button>
                                                </div>
                                                <p className="font-black text-pink-500 text-sm">${item.price * item.quantity}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="p-8 bg-black/60 border-t border-white/5 space-y-6">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Resumen de compra</p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase">Subtotal {cart.length} artículos</p>
                                    </div>
                                    <p className="text-2xl font-black text-white italic tracking-tighter">${cartTotal}</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleCheckout}
                                        className="w-full py-5 bg-pink-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-pink-600/20 hover:bg-pink-500 transition-all flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        🚀 Finalizar en WhatsApp
                                    </button>
                                    <button
                                        onClick={clearCart}
                                        className="w-full py-3 text-[9px] text-gray-600 font-black uppercase hover:text-white transition-colors tracking-widest"
                                    >
                                        Vaciar Carrito
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
