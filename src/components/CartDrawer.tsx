import React from 'react';
import { ShoppingBag, X, Trash2, ArrowRight, ShieldCheck, Tag, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    subtotal,
    total,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    setIsCheckoutOpen,
    clearCart
  } = useCart();
  const { currentUser, openAuthModal } = useAuth();
  const { openProductDetail } = useInventory();

  if (!isCartDrawerOpen) return null;

  const hasOwnItemInCart = currentUser && currentUser.role === 'seller' && cart.some(item =>
    item.product.sellerId === currentUser.id ||
    (currentUser.boutiqueName && item.product.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase())
  );

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      setIsCartDrawerOpen(false);
      openAuthModal('login');
      return;
    }
    if (hasOwnItemInCart) {
      return;
    }
    setIsCartDrawerOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div
      id="cart-drawer-overlay"
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150 font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCartDrawerOpen(false);
      }}
    >
      <div
        id="cart-drawer-panel"
        className="w-full max-w-md bg-[#FDFBF7] h-full shadow-2xl flex flex-col justify-between border-l border-stone-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 bg-stone-900 text-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <h2 className="font-sans text-base sm:text-lg font-bold text-white tracking-tight">Your Vintage Bag</h2>
            <span className="text-xs bg-stone-800 text-amber-200 font-sans font-semibold px-2.5 py-0.5 rounded-full">
              {cart.length} {cart.length === 1 ? 'piece' : 'pieces'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                id="clear-vintage-bag-btn"
                onClick={clearCart}
                className="text-xs text-stone-400 hover:text-rose-300 transition-colors px-2 py-1 rounded hover:bg-stone-800/80 cursor-pointer"
                title="Remove all items from bag"
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <div className="w-16 h-16 rounded-full bg-stone-200/70 flex items-center justify-center mb-4 text-stone-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-sans text-lg font-bold text-stone-800">Your bag is empty</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xs font-sans">
                Vintage pieces in the Vault are 1-of-1. Explore the boutique and see if anything catches your interest!
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex gap-3.5 items-start relative group"
              >
                <img
                  src={item.product.images?.[0]}
                  alt={item.product.title}
                  className="w-20 h-20 object-cover rounded-xl border border-stone-100 shrink-0 cursor-pointer"
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    openProductDetail(item.product);
                  }}
                />

                <div className="flex-1 min-w-0 font-sans">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md inline-block mb-1">
                        {item.product.sellerBoutique}
                      </span>
                      <h4
                        className="text-xs sm:text-sm font-bold text-stone-900 truncate hover:text-amber-900 cursor-pointer"
                        onClick={() => {
                          setIsCartDrawerOpen(false);
                          openProductDetail(item.product);
                        }}
                      >
                        {item.product.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                    <span className="bg-stone-100 px-1.5 py-0.5 rounded font-medium">{item.product.size}</span>
                    <span>•</span>
                    <span>{item.product.era}</span>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-stone-100">
                    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                      <button
                        onClick={() => updateQuantity(item.product.id, (item.quantity || 1) - 1)}
                        className="px-2 py-1 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                        disabled={(item.quantity || 1) <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-stone-800">{item.quantity || 1}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, (item.quantity || 1) + 1)}
                        className="px-2 py-1 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                        disabled={(item.quantity || 1) >= (item.product.stock ?? 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-sans text-sm font-bold text-stone-900">
                      ₱{(item.product.price * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 bg-white border-t border-stone-200 space-y-4 font-sans">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>₱{subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Express Delivery</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  Calculated at Checkout
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-950 pt-2 border-t border-stone-200">
                <span>Total Amount</span>
                <span className="font-sans text-lg font-bold text-amber-950">₱{total?.toLocaleString()}</span>
              </div>
            </div>

            {hasOwnItemInCart && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-900 text-xs font-sans">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Remove your own vault items from the bag to proceed to checkout.</span>
              </div>
            )}

            <button
              id="proceed-checkout-btn"
              onClick={handleProceedToCheckout}
              disabled={hasOwnItemInCart}
              className="w-full py-3 bg-stone-950 hover:bg-amber-950 disabled:bg-stone-300 disabled:cursor-not-allowed text-amber-50 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 group font-sans cursor-pointer"
            >
              <span>{currentUser ? `Proceed to Checkout • ₱${total?.toLocaleString()}` : 'Sign in to Checkout'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
