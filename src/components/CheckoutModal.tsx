import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Truck, 
  Loader2, 
  AlertTriangle, 
  XCircle, 
  Minus, 
  Plus, 
  CreditCard, 
  CheckCircle2
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

const stripePromise = loadStripe(
  (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYoooJ8b5J2XlFY7N069cUP4'
);

export interface CityPostalMapping {
  name: string;
  zip: string;
}

export const PH_LOCATION_DATA: Record<string, CityPostalMapping[]> = {
  "Metro Manila (NCR)": [
    { name: "Makati City", zip: "1200" },
    { name: "Manila", zip: "1000" },
    { name: "Quezon City", zip: "1100" },
    { name: "Taguig City (BGC)", zip: "1630" },
    { name: "Pasig City", zip: "1600" },
    { name: "Mandaluyong City", zip: "1550" },
    { name: "Parañaque City", zip: "1700" },
    { name: "Pasay City", zip: "1300" },
    { name: "Muntinlupa City", zip: "1770" },
    { name: "Caloocan City", zip: "1400" },
    { name: "Las Piñas City", zip: "1740" },
    { name: "Marikina City", zip: "1800" },
    { name: "Valenzuela City", zip: "1440" },
    { name: "San Juan City", zip: "1500" },
    { name: "Malabon City", zip: "1470" },
    { name: "Navotas City", zip: "1485" },
    { name: "Pateros", zip: "1620" }
  ],
  "Cavite": [
    { name: "Bacoor City", zip: "4102" },
    { name: "Imus City", zip: "4103" },
    { name: "Dasmariñas City", zip: "4114" },
    { name: "General Trias City", zip: "4107" },
    { name: "Tagaytay City", zip: "4120" },
    { name: "Silang", zip: "4118" },
    { name: "Kawit", zip: "4104" }
  ],
  "Laguna": [
    { name: "Santa Rosa City", zip: "4026" },
    { name: "Calamba City", zip: "4027" },
    { name: "Biñan City", zip: "4024" },
    { name: "San Pedro City", zip: "4023" },
    { name: "Los Baños", zip: "4030" },
    { name: "Cabuyao City", zip: "4025" }
  ],
  "Rizal": [
    { name: "Antipolo City", zip: "1870" },
    { name: "Cainta", zip: "1900" },
    { name: "Taytay", zip: "1920" },
    { name: "Binangonan", zip: "1940" },
    { name: "San Mateo", zip: "1850" }
  ],
  "Bulacan": [
    { name: "Malolos City", zip: "3000" },
    { name: "Meycauayan City", zip: "3020" },
    { name: "San Jose del Monte City", zip: "3023" },
    { name: "Marilao", zip: "3019" },
    { name: "Bocaue", zip: "3018" }
  ],
  "Pampanga": [
    { name: "Angeles City", zip: "2000" },
    { name: "San Fernando City", zip: "2000" },
    { name: "Mabalacat City", zip: "2010" },
    { name: "Guagua", zip: "2003" }
  ],
  "Batangas": [
    { name: "Batangas City", zip: "4200" },
    { name: "Lipa City", zip: "4217" },
    { name: "Tanauan City", zip: "4232" },
    { name: "Nasugbu", zip: "4231" }
  ],
  "Cebu": [
    { name: "Cebu City", zip: "6000" },
    { name: "Mandaue City", zip: "6014" },
    { name: "Lapu-Lapu City", zip: "6015" },
    { name: "Talisay City", zip: "6045" }
  ],
  "Davao del Sur": [
    { name: "Davao City", zip: "8000" },
    { name: "Digos City", zip: "8002" }
  ],
  "Iloilo": [
    { name: "Iloilo City", zip: "5000" },
    { name: "Oton", zip: "5020" }
  ],
  "Benguet": [
    { name: "Baguio City", zip: "2600" },
    { name: "La Trinidad", zip: "2601" }
  ],
  "Pangasinan": [
    { name: "Dagupan City", zip: "2400" },
    { name: "San Carlos City", zip: "2420" },
    { name: "Urdaneta City", zip: "2428" }
  ]
};

const CheckoutModalInner: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();

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

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');

  const [selectedPaymentMethod] = useState<'card'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cancel Confirmation Popup State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelQuantities, setCancelQuantities] = useState<Record<string, number>>({});

  useBodyScrollLock(isCheckoutOpen);

  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    if (!newProvince) {
      setCity('');
      setZipCode('');
      return;
    }
    const cities = PH_LOCATION_DATA[newProvince] || [];
    if (cities.length > 0) {
      setCity(cities[0].name);
      setZipCode(cities[0].zip);
    } else {
      setCity('');
      setZipCode('');
    }
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const cities = PH_LOCATION_DATA[province] || [];
    const matched = cities.find(c => c.name === newCity);
    if (matched) {
      setZipCode(matched.zip);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    let formattedVal = rawVal;
    
    if (rawVal.length > 0 && !rawVal.startsWith('0')) {
      formattedVal = '0' + rawVal;
    }
    if (formattedVal.length > 2 && !formattedVal.startsWith('09')) {
      formattedVal = '09' + formattedVal.slice(2);
    }
    
    setPhone(formattedVal.slice(0, 11));
  };

  const totalItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleOpenCancelModal = () => {
    const initialQuantities: Record<string, number> = {};
    cart.forEach(item => {
      initialQuantities[item.product.id] = 1;
    });
    setCancelQuantities(initialQuantities);
    setIsCancelModalOpen(true);
  };

  const handleCancelQuantityChange = (productId: string, delta: number, maxQty: number) => {
    setCancelQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.min(maxQty, Math.max(0, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handleConfirmPartialCancel = () => {
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

    if (!fullName.trim()) {
      setErrorMessage('Please enter recipient full name.');
      return;
    }

    if (!phone.trim() || phone.length < 11 || !phone.startsWith('09')) {
      setErrorMessage('Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g., 09171234567).');
      return;
    }

    if (!street.trim() || !city.trim() || !province.trim()) {
      setErrorMessage('Please fill in complete street and city delivery details.');
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

      // Call Stripe PaymentIntent Backend API Endpoint
      const stripeRes = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: generatedOrderId,
          items: cart.map(item => ({
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            quantity: item.quantity || 1,
          })),
          shippingFee,
          total,
          paymentMethod: selectedPaymentMethod,
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

      const paymentIntentData = await stripeRes.json();

      if (!paymentIntentData.success && paymentIntentData.error) {
        throw new Error(paymentIntentData.error);
      }

      const clientSecret = paymentIntentData.clientSecret;
      let confirmedPaymentIntentId = paymentIntentData.paymentIntentId;

      // Handle Stripe Elements card confirmation if live card element is populated
      if (selectedPaymentMethod === 'card' && stripe && elements && clientSecret && !clientSecret.includes('_secret_demo')) {
        const cardElement = elements.getElement(CardElement);
        if (cardElement) {
          const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: cardElement as any,
              billing_details: {
                name: fullName,
                phone,
              },
            },
          });

          if (error) {
            setErrorMessage(error.message || 'Payment confirmation failed with card.');
            setIsProcessing(false);
            return;
          }

          if (paymentIntent) {
            confirmedPaymentIntentId = paymentIntent.id;
          }
        }
      } else {
        // Confirm PaymentIntent via backend handler for sandbox/e-wallets
        const confirmRes = await fetch('/api/stripe/confirm-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntentData.paymentIntentId
          })
        });
        const confirmData = await confirmRes.json();
        if (confirmData.paymentIntentId) {
          confirmedPaymentIntentId = confirmData.paymentIntentId;
        }
      }

      // Register order record in Firestore database
      await processCheckout({
        fullName,
        phone,
        street,
        city,
        province,
        zipCode,
        paymentMethod: `stripe_${selectedPaymentMethod}`,
        paymentIntentId: confirmedPaymentIntentId || `pi_stripe_${Date.now()}`
      });

      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Stripe Gateway connection issue. Please try again.');
    }
  };

  const totalUnitsToCancel = (Object.values(cancelQuantities) as number[]).reduce((a: number, b: number) => a + b, 0);
  const currentCitiesList = PH_LOCATION_DATA[province] || [];

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
          <form onSubmit={handleSubmitCheckout} autoComplete="off" className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
            
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
                      <label className="block font-semibold text-stone-700 mb-1 font-sans">
                        Recipient Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Recipient full name"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">
                          Mobile Contact
                        </label>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={handlePhoneChange}
                          placeholder="09171234567"
                          maxLength={11}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans tracking-wide"
                        />
                        <span className="text-[10px] text-stone-500 font-sans mt-0.5 block">
                          11-digit PH mobile (e.g. 09171234567)
                        </span>
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">
                          Province / Region
                        </label>
                        <select
                          required
                          value={province}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                        >
                          <option value="">Select Province / Region</option>
                          {Object.keys(PH_LOCATION_DATA).map((provKey) => (
                            <option key={provKey} value={provKey}>
                              {provKey}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1 font-sans">
                        House / Building / Street Address
                      </label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="e.g. Unit 4B, Eastwood Parkview Tower 1, Orchard Rd"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">
                          City / Municipality
                        </label>
                        <select
                          required
                          disabled={!province}
                          value={city}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans disabled:bg-stone-100 disabled:text-stone-400"
                        >
                          {!province ? (
                            <option value="">Select Province first</option>
                          ) : (
                            <>
                              <option value="">Select City / Municipality</option>
                              {currentCitiesList.map((cityObj) => (
                                <option key={cityObj.name} value={cityObj.name}>
                                  {cityObj.name}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          required
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          placeholder="Postal Code"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Choose Payment Method */}
                <div className="space-y-3 font-sans pt-2 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans text-sm font-bold text-stone-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-800" /> Credit / Debit Card Payment
                    </h3>
                    <span className="text-[11px] font-sans font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      Powered by Stripe
                    </span>
                  </div>

                  {/* Render Stripe Card Element */}
                  <div className="p-3.5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2 font-sans">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 font-sans">
                        Card Details
                      </label>
                    </div>
                    <div className="p-3 border border-stone-300 rounded-xl bg-stone-50/50 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-600 focus-within:border-indigo-600 transition-all">
                      <CardElement
                        options={{
                          disableLink: true,
                          style: {
                            base: {
                              color: "#1c1917",
                              fontFamily: "system-ui, -apple-system, sans-serif",
                              fontSmoothing: "antialiased",
                              fontSize: "14px",
                              "::placeholder": {
                                color: "#a8a29e"
                              }
                            },
                            invalid: {
                              color: "#dc2626",
                              iconColor: "#dc2626"
                            }
                          }
                        }}
                      />
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
                      className="w-full py-3.5 px-4 bg-stone-950 hover:bg-amber-950 text-amber-50 font-sans font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
                          <span className="font-sans leading-tight">Processing Stripe Payment...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-sans leading-tight">Pay ₱{total?.toLocaleString()} with Credit / Debit Card</span>
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
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 font-sans">
                <h3 className="text-base font-bold text-stone-900 font-sans">Cancel or Adjust Order Items?</h3>
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  Reduce item quantities or cancel individual reserved garments from this order.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-2.5 max-h-56 overflow-y-auto font-sans">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block font-sans">
                Select quantities to cancel:
              </span>
              {cart.map(item => {
                const cancelQty = cancelQuantities[item.product.id] || 0;
                const maxQty = item.quantity || 1;
                return (
                  <div key={item.product.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-stone-200 text-xs font-sans">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <img 
                        src={item.product?.images?.[0]} 
                        alt={item.product.title} 
                        className="w-8 h-10 object-cover rounded bg-stone-100 shrink-0" 
                      />
                      <div className="truncate">
                        <p className="font-semibold text-stone-900 truncate font-sans">{item.product.title}</p>
                        <p className="text-[10px] text-stone-500 font-sans">Reserved: {maxQty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-sans">
                      <button
                        type="button"
                        onClick={() => handleCancelQuantityChange(item.product.id, -1, maxQty)}
                        className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-stone-900 min-w-[20px] text-center font-sans">
                        {cancelQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelQuantityChange(item.product.id, 1, maxQty)}
                        className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Keep All Reserved Items
              </button>
              <button
                type="button"
                onClick={handleCancelAll}
                className="w-full sm:w-auto px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Entire Bag
              </button>
              <button
                type="button"
                onClick={handleConfirmPartialCancel}
                disabled={totalUnitsToCancel === 0}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
              >
                Confirm Cancellation ({totalUnitsToCancel})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const CheckoutModal: React.FC = () => {
  const { isCheckoutOpen } = useCart();

  if (!isCheckoutOpen) return null;

  return (
    <Elements stripe={stripePromise}>
      <CheckoutModalInner />
    </Elements>
  );
};
