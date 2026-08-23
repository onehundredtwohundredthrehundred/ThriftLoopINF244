import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  Truck, 
  CheckCircle2, 
  ShoppingBag, 
  Loader2,
  Smartphone,
  Wallet
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CheckoutModal: React.FC = () => {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    cart, 
    subtotal, 
    shippingFee, 
    discount, 
    total, 
    processCheckout 
  } = useCart();
  const { currentUser } = useAuth();

  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [street, setStreet] = useState(currentUser?.address?.street || '');
  const [city, setCity] = useState(currentUser?.address?.city || '');
  const [province, setProvince] = useState(currentUser?.address?.province || 'Metro Manila');
  const [zipCode, setZipCode] = useState(currentUser?.address?.zipCode || '');

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

  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'gcash' | 'maya' | 'paypal' | 'cod'>('gcash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  if (!isCheckoutOpen) return null;

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
      // Simulate real-time payment gateway verification & inventory lock
      await new Promise(resolve => setTimeout(resolve, 1400));
      await processCheckout({
        fullName,
        phone,
        street,
        city,
        province,
        zipCode,
        paymentMethod
      });
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage('Checkout failed. Please try again.');
    }
  };

  return (
    <div 
      id="checkout-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) setIsCheckoutOpen(false);
      }}
    >
      <div 
        id="checkout-container"
        className="relative w-full max-w-3xl bg-[#FDFBF7] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 px-6 py-4 text-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-serif text-lg font-bold text-white">ThriftLoop Secure Gateway</h2>
              <p className="text-[11px] text-stone-400 font-mono">256-Bit Encrypted Payment</p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmitCheckout} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left: Shipping & Payment Method */}
            <div className="md:col-span-7 space-y-5">
              
              {/* Shipping Address */}
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-800" /> Courier Delivery Information
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Recipient Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Maya Chen"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Mobile Contact</label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+63 917 000 0000"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        required
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="1227"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Street Address / Unit / Building</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Unit 402, Salcedo Park Towers"
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Makati City"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Province / Region</label>
                      <input
                        type="text"
                        required
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="Metro Manila"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Gateway Selector */}
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-800" /> Integrated Payment Gateway
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('gcash')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'gcash'
                        ? 'bg-blue-50 border-blue-600 font-bold text-blue-900 ring-1 ring-blue-600'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    <span className="text-xs block">GCash QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('maya')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'maya'
                        ? 'bg-emerald-50 border-emerald-600 font-bold text-emerald-900 ring-1 ring-emerald-600'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Wallet className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <span className="text-xs block">Maya</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'bg-amber-50 border-amber-800 font-bold text-amber-950 ring-1 ring-amber-800'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mx-auto mb-1 text-amber-800" />
                    <span className="text-xs block">Visa / MC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      paymentMethod === 'cod'
                        ? 'bg-stone-200 border-stone-800 font-bold text-stone-900 ring-1 ring-stone-800'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <Truck className="w-4 h-4 mx-auto mb-1 text-stone-700" />
                    <span className="text-xs block">Cash On Del.</span>
                  </button>
                </div>

                {/* Sub-form based on method */}
                {paymentMethod === 'credit_card' && (
                  <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded font-mono text-stone-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">Expiry</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded font-mono text-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">CVC / CVV</label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded font-mono text-stone-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(paymentMethod === 'gcash' || paymentMethod === 'maya') && (
                  <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold font-mono">
                      ✓
                    </div>
                    <p className="text-stone-600 text-[11px]">
                      Instant e-wallet handshake simulated. Order will reserve garment upon payment.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Right: Order Summary */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
                <h4 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100 flex items-center justify-between">
                  <span>Order Items</span>
                  <span className="text-xs font-mono text-stone-500">
                    {cart.reduce((s, i) => s + (i.quantity || 1), 0)} items ({cart.length} unique)
                  </span>
                </h4>

                <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-2.5 text-xs">
                      <img
                        src={item.product?.images?.[0]}
                        alt={item.product.title}
                        className="w-12 h-14 object-cover rounded bg-stone-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-900 truncate">{item.product.title}</p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {item.product.era} • Size {item.product.size} • <span className="font-bold text-stone-700">Qty: {item.quantity || 1}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-stone-950 block">₱{((item.quantity || 1) * item.product.price)?.toLocaleString()}</span>
                        {item.quantity > 1 && (
                          <span className="text-[9px] text-stone-400 font-mono block">₱{item.product.price?.toLocaleString()} ea</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-stone-900">₱{subtotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Express Courier Transit</span>
                    <span className="font-semibold text-stone-900">
                      {shippingFee === 0 ? <span className="text-emerald-700">FREE</span> : `₱${shippingFee?.toLocaleString()}`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Promo Discount</span>
                      <span>-₱{discount?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-stone-950 pt-2 border-t border-stone-200">
                    <span>Total Due</span>
                    <span className="font-serif text-xl text-amber-950">₱{total?.toLocaleString()}</span>
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
                )}

                <button
                  id="submit-payment-btn"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-stone-950 hover:bg-amber-950 text-amber-50 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Processing Payment & Reserving Item...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Confirm & Pay ₱{total?.toLocaleString()}</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-stone-400 font-mono">
                  Guaranteed 1-of-1 Vault reservation upon authorization
                </p>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};
