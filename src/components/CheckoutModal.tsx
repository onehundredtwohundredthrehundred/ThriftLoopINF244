import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Truck, 
  Loader2,
  Smartphone,
  AlertTriangle,
  Trash2,
  XCircle,
  Minus,
  Plus,
  CreditCard,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export const CheckoutModal: React.FC = () => {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    cart, 
    subtotal, 
    shippingFee, 
    total, 
    processCheckout,
    removeFromCart,
    updateQuantity,
    clearCart,
    setIsCartDrawerOpen
  } = useCart();
  const { currentUser } = useAuth();

  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [street, setStreet] = useState(currentUser?.address?.street || '');
  const [city, setCity] = useState(currentUser?.address?.city || '');
  const [province, setProvince] = useState(currentUser?.address?.province || 'Metro Manila');
  const [zipCode, setZipCode] = useState(currentUser?.address?.zipCode || '');

  // Cancel Confirmation Popup State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelQuantities, setCancelQuantities] = useState<Record<string, number>>({});

  useBodyScrollLock(isCheckoutOpen);

  // Update fields if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setFullName(currentUser.name);
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.address?.street) setStreet(currentUser.address.street);
      if (currentUser.address?.city) setCity(currentUser.address.city);
      if (currentUser.address?.province) setProvince(currentUser.address.province);
      if (currentUser.address?.zipCode) setZipCode(currentUser.address.zipCode);
    }
  }, [currentUser]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isCheckoutOpen) return null;

  const totalItemCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);

  const handleOpenCancelModal = () => {
    const initial: Record<string, number> = {};
    cart.forEach(item => {
      initial[item.product.id] = item.quantity || 1;
    });
    setCancelQuantities(initial);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancellation = () => {
    let anyRemovedOrDecreased = false;
    
    cart.forEach(item => {
      const cancelQty = cancelQuantities[item.product.id] || 0;
      const currentQty = item.quantity || 1;
      
      if (cancelQty >= currentQty) {
        removeFromCart(item.product.id);
        anyRemovedOrDecreased = true;
      } else if (cancelQty > 0) {
        updateQuantity(item.product.id, currentQty - cancelQty);
        anyRemovedOrDecreased = true;
      }
    });

    const remainingItemsCount = cart.reduce((sum, item) => {
      const cancelQty = cancelQuantities[item.product.id] || 0;
      const currentQty = item.quantity || 1;
      return sum + Math.max(0, currentQty - cancelQty);
    }, 0);

    setIsCancelModalOpen(false);

    if (remainingItemsCount <= 0 || !anyRemovedOrDecreased) {
      setIsCheckoutOpen(false);
      setIsCartDrawerOpen(true);
    }
  };

  const handleCancelAll = () => {
    clearCart();
    setIsCancelModalOpen(false);
    setIsCheckoutOpen(false);
    setIsCartDrawerOpen(true);
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || !phone.trim() || !street.trim() || !city.trim()) {
      setErrorMessage('Please fill in complete delivery details.');
      return;
    }

    const hasOwnItem = currentUser && cart.some(item => 
      item.product.sellerId === currentUser.id || 
      (currentUser.role === 'seller' && currentUser.boutiqueName === item.product.sellerBoutique)
    );

    if (hasOwnItem) {
      setErrorMessage('Your bag contains items from your own vault collection. Please remove them before paying.');
      return;
    }

    setIsProcessing(true);

    try {
      const generatedOrderId = `ord_${Date.now()}`;

      // Call PayRex API Integration Endpoint
      const payrexRes = await fetch('/api/payrex/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: generatedOrderId,
          items: cart,
          shippingFee,
          total,
          shippingAddress: {
            fullName,
            phone,
            street,
            city,
            province,
            zipCode
          }
        })
      });

      const payrexData = await payrexRes.json();

      // Register order record in Firestore database
      await processCheckout({
        fullName,
        phone,
        street,
        city,
        province,
        zipCode,
        paymentMethod: 'gcash'
      });

      setIsProcessing(false);

      if (payrexData.checkoutUrl) {
        // Redirect customer to PayRex payment gateway session URL
        window.location.href = payrexData.checkoutUrl;
      }
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage('Payment Gateway connection issue. Please try again.');
    }
  };

  const totalUnitsToCancel = (Object.values(cancelQuantities) as number[]).reduce((a: number, b: number) => a + b, 0);

  return (
    <>
      <div 
        id="checkout-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 font-sans"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isProcessing) setIsCheckoutOpen(false);
        }}
      >
        <div 
          id="checkout-container"
          className="relative w-full max-w-3xl bg-[#FDFBF7] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-stone-900 px-6 py-4 text-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="font-sans text-base sm:text-lg font-bold text-white tracking-tight">Confirm Payment & Details</h2>
            </div>
            {!isProcessing && (
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content Form */}
          <form onSubmit={handleSubmitCheckout} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Left: Shipping & Payment Method */}
              <div className="md:col-span-7 space-y-5">
                
                {/* Shipping Address */}
                <div>
                  <h3 className="font-sans text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-800" /> Courier Delivery Information
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1 font-sans">Recipient Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Maya Chen"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">Mobile Contact</label>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+63 917 000 0000"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">Postal Code</label>
                        <input
                          type="text"
                          required
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          placeholder="1227"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1 font-sans">Street Address / Unit / Building</label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Unit 402, Salcedo Park Towers"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">City</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Makati City"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">Province / Region</label>
                        <input
                          type="text"
                          required
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          placeholder="Metro Manila"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integration 2: Payment Gateway Selector (PayRex API) */}
                <div className="space-y-2 font-sans">
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5 text-amber-600" /> System Integration 2: Payment Gateway
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      PayRex REST API Active
                    </span>
                  </div>

                  <div className="p-4 bg-stone-900 text-white rounded-2xl border-2 border-stone-800 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                          <CreditCard className="w-5 h-5 text-stone-950" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-sm text-white block">PayRex Payment Gateway</span>
                            <span className="text-[9px] bg-amber-400 text-stone-950 font-mono font-bold px-1.5 py-0.2 rounded">Sandbox</span>
                          </div>
                          <span className="font-sans text-[11px] text-stone-300 block">GCash • Maya • QR Ph • Visa / Mastercard</span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    </div>

                    <div className="p-2.5 bg-stone-950/80 rounded-xl border border-stone-800 text-[10px] text-stone-400 font-mono flex items-center justify-between">
                      <span className="text-amber-300/90 truncate">API Key: pk_test_GxXYUz...</span>
                      <span className="text-emerald-400 font-semibold">200 OK Connection</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right: Order Summary */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3 font-sans">
                  <h4 className="font-sans text-base font-bold text-stone-900 pb-2 border-b border-stone-100 flex items-center justify-between">
                    <span className="font-sans font-bold text-stone-900">Order Items</span>
                    <span className="text-xs font-sans font-medium text-stone-500">
                      {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                    </span>
                  </h4>

                  <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-2.5 text-xs font-sans">
                        <img
                          src={item.product?.images?.[0]}
                          alt={item.product.title}
                          className="w-12 h-14 object-cover rounded bg-stone-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-sans font-semibold text-stone-900 truncate">{item.product.title}</p>
                          <p className="text-[10px] text-stone-500 font-sans">
                            {item.product.era} • Size {item.product.size} • <span className="font-sans font-bold text-stone-700">Qty: {item.quantity || 1}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-sans font-bold text-stone-950 block">₱{((item.quantity || 1) * item.product.price)?.toLocaleString()}</span>
                          {item.quantity > 1 && (
                            <span className="text-[9px] text-stone-400 font-sans block">₱{item.product.price?.toLocaleString()} ea</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs text-stone-600 font-sans">
                    <div className="flex justify-between">
                      <span className="font-sans">Subtotal</span>
                      <span className="font-sans font-semibold text-stone-900">₱{subtotal?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans">Express Courier Transit</span>
                      <span className="font-sans font-semibold text-stone-900">
                        {shippingFee === 0 ? <span className="text-emerald-700 font-sans">FREE</span> : `₱${shippingFee?.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-stone-950 pt-2 border-t border-stone-200">
                      <span className="font-sans">Total Due</span>
                      <span className="font-sans text-xl font-bold text-amber-950">₱{total?.toLocaleString()}</span>
                    </div>
                  </div>

                  {errorMessage && (
                    <p className="text-xs text-rose-600 font-medium font-sans">{errorMessage}</p>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      id="submit-payment-btn"
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-3.5 bg-stone-950 hover:bg-amber-950 text-amber-50 font-sans font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                          <span className="font-sans">Processing Payment & Reserving Item...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span className="font-sans">Confirm & Pay ₱{total?.toLocaleString()}</span>
                        </>
                      )}
                    </button>

                    <button
                      id="cancel-checkout-order-btn"
                      type="button"
                      disabled={isProcessing}
                      onClick={handleOpenCancelModal}
                      className="w-full py-2.5 px-4 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 font-sans font-semibold rounded-xl text-xs transition-colors border border-stone-200 hover:border-rose-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-stone-500" />
                      <span>Cancel Order / Items</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>

      {/* Cancel Order / Items Confirmation Popup Modal */}
      {isCancelModalOpen && (
        <div 
          id="cancel-confirmation-overlay"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
          onClick={() => setIsCancelModalOpen(false)}
        >
          <div 
            id="cancel-confirmation-container"
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden font-sans p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-sans text-base sm:text-lg font-bold text-stone-950">
                  Cancel Checkout & Remove Items
                </h3>
                <p className="text-xs text-stone-600 font-sans mt-0.5">
                  Specify which item quantities to cancel. Cancelled items will be removed from your bag.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of items to adjust cancellation */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1 border-y border-stone-100 py-3 font-sans">
              {cart.map(item => {
                const maxQty = item.quantity || 1;
                const cancelQty = cancelQuantities[item.product.id] ?? maxQty;
                const remainingQty = maxQty - cancelQty;

                return (
                  <div 
                    key={item.product.id} 
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product?.images?.[0]}
                        alt={item.product.title}
                        className="w-12 h-14 object-cover rounded bg-stone-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-semibold text-xs text-stone-900 truncate">
                          {item.product.title}
                        </p>
                        <p className="text-[11px] text-stone-500 font-sans">
                          {item.product.era} • Size {item.product.size} • ₱{item.product.price?.toLocaleString()} ea
                        </p>
                        <p className="text-[11px] font-sans font-bold text-stone-700">
                          In Bag: {maxQty} {maxQty === 1 ? 'piece' : 'pieces'}
                        </p>
                      </div>

                      {/* Cancel Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg p-1 shadow-2xs shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCancelQuantities(prev => ({
                              ...prev,
                              [item.product.id]: Math.max(0, (prev[item.product.id] ?? maxQty) - 1)
                            }));
                          }}
                          disabled={cancelQty <= 0}
                          className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Reduce cancel quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <div className="text-center px-1">
                          <span className="font-sans font-bold text-xs text-rose-700 block min-w-[20px]">
                            {cancelQty}
                          </span>
                          <span className="text-[9px] text-stone-400 block font-sans">cancel</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCancelQuantities(prev => ({
                              ...prev,
                              [item.product.id]: Math.min(maxQty, (prev[item.product.id] ?? maxQty) + 1)
                            }));
                          }}
                          disabled={cancelQty >= maxQty}
                          className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Increase cancel quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Status note */}
                    <div className="text-[11px] font-sans flex items-center justify-between pt-1 border-t border-stone-200/60">
                      {cancelQty === maxQty ? (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Will be completely removed from bag
                        </span>
                      ) : cancelQty > 0 ? (
                        <span className="text-amber-800 font-medium">
                          Cancelling {cancelQty} • <strong className="text-stone-900">{remainingQty} unit(s) will stay in bag</strong>
                        </span>
                      ) : (
                        <span className="text-stone-500 font-medium">
                          No cancellation (all {maxQty} will stay in bag)
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setCancelQuantities(prev => ({
                            ...prev,
                            [item.product.id]: cancelQty === maxQty ? 0 : maxQty
                          }));
                        }}
                        className="text-[10px] text-stone-600 hover:text-stone-900 underline font-sans cursor-pointer"
                      >
                        {cancelQty === maxQty ? 'Keep in bag' : 'Cancel all of this item'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                id="confirm-cancellation-btn"
                onClick={handleConfirmCancellation}
                disabled={totalUnitsToCancel <= 0}
                className="w-full py-3 bg-rose-700 hover:bg-rose-800 text-white font-sans font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {totalUnitsToCancel > 0 
                    ? `Confirm Cancellation (${totalUnitsToCancel} ${totalUnitsToCancel === 1 ? 'unit' : 'units'})`
                    : 'Select Quantities to Cancel'}
                </span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  id="cancel-all-bag-btn"
                  onClick={handleCancelAll}
                  className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-rose-50 text-rose-700 hover:text-rose-800 font-sans font-semibold rounded-xl text-xs transition-colors border border-stone-200 hover:border-rose-200 text-center cursor-pointer"
                >
                  Cancel All & Empty Bag
                </button>

                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white font-sans font-semibold rounded-xl text-xs transition-colors text-center cursor-pointer"
                >
                  Keep Items & Return
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
