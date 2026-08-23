import React from 'react';
import { 
  X, 
  Trash2, 
  ArrowRight, 
  ShoppingBag, 
  Tag, 
  ShieldCheck, 
  Truck, 
  Check, 
  AlertTriangle,
  Plus,
  Minus
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';

export const CartDrawer: React.FC = () => {
  const { 
    cart, 
    isCartDrawerOpen, 
    setIsCartDrawerOpen, 
    removeFromCart, 
    updateQuantity,
    subtotal, 
    shippingFee, 
    discount, 
    total,
    discountCode,
    setDiscountCode,
    applyDiscountCode,
    setIsCheckoutOpen
  } = useCart();
  const { openProductDetail } = useInventory();
  const { currentUser, openAuthModal } = useAuth();
  const [promoMessage, setPromoMessage] = React.useState<{ text: string; success: boolean } | null>(null);

  if (!isCartDrawerOpen) return null;

  const hasOwnItemInCart = !!currentUser && cart.some(item => 
    item.product.sellerId === currentUser.id || 
    (currentUser.role === 'seller' && currentUser.boutiqueName === item.product.sellerBoutique)
  );

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const res = applyDiscountCode();
    setPromoMessage({ text: res.message, success: res.success });
  };

  const handleProceedToCheckout = () => {
    if (!currentUser) {
      setIsCartDrawerOpen(false);
      openAuthModal('login');
      return;
    }
    setIsCartDrawerOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div 
      id="cart-drawer-overlay"
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsCartDrawerOpen(false);
      }}
    >
      <div 
        id="cart-drawer-panel"
        className="w-full max-w-md bg-[#FDFBF7] h-full shadow-2xl flex flex-col justify-between border-l border-stone-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 bg-stone-900 text-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <h2 className="font-serif text-lg font-bold text-white">Your Vintage Bag</h2>
            <span className="text-xs bg-stone-800 text-amber-200 font-mono px-2 py-0.5 rounded-full">
              {cart.length} {cart.length === 1 ? 'piece' : 'pieces'}
            </span>
          </div>
          <button
            onClick={() => setIsCartDrawerOpen(false)}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <div className="w-16 h-16 rounded-full bg-stone-200/70 flex items-center justify-center mb-4 text-stone-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-800">Your bag is empty</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Vintage pieces in the Vault are 1-of-1. Explore our archive collection before they are claimed!
              </p>
              <button
                onClick={() => setIsCartDrawerOpen(false)}
                className="mt-5 px-5 py-2.5 bg-stone-900 hover:bg-amber-900 text-amber-50 text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                Browse Archive Collection
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div 
                key={item.product.id}
                className="bg-white p-3.5 rounded-xl border border-stone-200 flex gap-3 shadow-xs relative group"
              >
                <img
                  src={item.product?.images?.[0]}
                  alt={item.product.title}
                  onClick={() => {
                    openProductDetail(item.product);
                    setIsCartDrawerOpen(false);
                  }}
                  className="w-20 h-24 object-cover rounded-lg bg-stone-100 cursor-pointer"
                />
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mb-0.5">
                      <span className="text-amber-800 font-bold uppercase">{item.product.era}</span>
                      <span>Size {item.product.size}</span>
                    </div>
                    <h4 
                      onClick={() => {
                        openProductDetail(item.product);
                        setIsCartDrawerOpen(false);
                      }}
                      className="font-medium text-xs text-stone-900 line-clamp-2 hover:text-amber-800 cursor-pointer"
                    >
                      {item.product.title}
                    </h4>
                    <span className="text-[10px] text-stone-500 block truncate mt-0.5">
                      {item.product.condition}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2">
                    <div>
                      <span className="font-serif text-sm font-bold text-stone-950">
                        ₱{((item.quantity || 1) * item.product.price)?.toLocaleString()}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-[10px] text-stone-400 block font-mono">
                          ₱{item.product.price?.toLocaleString()} each
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.product.stock > 1 ? (
                        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, (item.quantity || 1) - 1)}
                            className="w-5 h-5 rounded bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-xs px-1.5 text-stone-900 min-w-[18px] text-center">
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, (item.quantity || 1) + 1)}
                            disabled={(item.quantity || 1) >= item.product.stock}
                            className="w-5 h-5 rounded bg-white hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                          Qty: 1
                        </span>
                      )}

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 transition-colors ml-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer / Checkout Calculation */}
        {cart.length > 0 && (
          <div className="p-5 bg-white border-t border-stone-200 space-y-4 shadow-lg">
            
            {/* Promo Code Input */}
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Promo Code (Try VINTAGE10)"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg uppercase font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
                <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-100 text-xs font-semibold rounded-lg transition-colors"
              >
                Apply
              </button>
            </form>

            {promoMessage && (
              <p className={`text-[11px] font-medium ${promoMessage.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                {promoMessage.text}
              </p>
            )}

            {/* Price Breakdown */}
            <div className="space-y-1.5 text-xs text-stone-600 pt-1 border-t border-stone-100">
              <div className="flex justify-between">
                <span>Subtotal (1-of-1 Curations)</span>
                <span className="font-semibold text-stone-900">₱{subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-stone-500" /> Express Shipping
                </span>
                <span className="font-semibold text-stone-900">
                  {shippingFee === 0 ? <span className="text-emerald-700">FREE</span> : `₱${shippingFee?.toLocaleString()}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Vault Promotion Applied</span>
                  <span>-₱{discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-stone-950 pt-2 border-t border-stone-200">
                <span>Total Amount</span>
                <span className="font-serif text-lg text-amber-950">₱{total?.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            {hasOwnItemInCart && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Remove your own vault items from the bag to proceed to checkout.</span>
              </div>
            )}

            <button
              id="proceed-checkout-btn"
              onClick={handleProceedToCheckout}
              disabled={hasOwnItemInCart}
              className="w-full py-3 bg-stone-950 hover:bg-amber-950 disabled:bg-stone-300 disabled:cursor-not-allowed text-amber-50 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 group"
            >
              <span>{currentUser ? `Proceed to Checkout • ₱${total?.toLocaleString()}` : 'Sign in to Checkout'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
              <span>Guaranteed 1-of-1 Item Reservation</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
