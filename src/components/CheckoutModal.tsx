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
  const [phone, setPhone] = useState(() => {
    if (currentUser?.phone) {
      return currentUser.phone.replace(/[^0-9]/g, '').slice(0, 11);
    }
    return '';
  });
  const [street, setStreet] = useState(currentUser?.address?.street || '');
  
  const [province, setProvince] = useState<string>(() => {
    if (currentUser?.address?.province && PH_LOCATION_DATA[currentUser.address.province]) {
      return currentUser.address.province;
    }
    return "";
  });

  const [city, setCity] = useState<string>(() => {
    if (currentUser?.address?.city) return currentUser.address.city;
    return "";
  });

  const [zipCode, setZipCode] = useState<string>(() => {
    if (currentUser?.address?.zipCode) return currentUser.address.zipCode;
    return "";
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'maya'>('gcash');

  // Cancel Confirmation Popup State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelQuantities, setCancelQuantities] = useState<Record<string, number>>({});

  useBodyScrollLock(isCheckoutOpen);

  // Update fields if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setFullName(currentUser.name);
      if (currentUser.phone) {
        setPhone(currentUser.phone.replace(/[^0-9]/g, '').slice(0, 11));
      }
      if (currentUser.address?.street) setStreet(currentUser.address.street);

      const userProv = currentUser.address?.province;
      if (userProv && PH_LOCATION_DATA[userProv]) {
        setProvince(userProv);
        const cities = PH_LOCATION_DATA[userProv];
        const userCity = currentUser.address?.city;
        const matchedCity = cities.find(c => c.name.toLowerCase() === userCity?.toLowerCase());
        if (matchedCity) {
          setCity(matchedCity.name);
          setZipCode(matchedCity.zip);
        } else if (cities.length > 0) {
          setCity(cities[0].name);
          setZipCode(cities[0].zip);
        }
      }
    }
  }, [currentUser]);

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
    if (!newCity) {
      setZipCode('');
      return;
    }
    const cities = PH_LOCATION_DATA[province] || [];
    const matched = cities.find(c => c.name === newCity);
    if (matched) {
      setZipCode(matched.zip);
    } else {
      setZipCode('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(digitsOnly);
  };

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

      // Call PayRex API Integration Endpoint with selected payment method
      const payrexRes = await fetch('/api/payrex/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: generatedOrderId,
          items: cart,
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

      const payrexData = await payrexRes.json();

      // Register order record in Firestore database
      await processCheckout({
        fullName,
        phone,
        street,
        city,
        province,
        zipCode,
        paymentMethod: selectedPaymentMethod
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
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans cursor-pointer"
                        >
                          <option value="">-- Select Province / Region --</option>
                          {Object.keys(PH_LOCATION_DATA).map(provName => (
                            <option key={provName} value={provName}>
                              {provName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1 font-sans">Street Address / Unit / Building</label>
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Unit 402, Salcedo Park Towers, HV Dela Costa St"
                        className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                      />
                    </div>

                    {/* City Dropdown and Postal Code (Auto-filled) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1 font-sans">
                          City
                        </label>
                        <select
                          required
                          disabled={!province}
                          value={city}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg font-sans transition-colors ${
                            !province
                              ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                              : 'bg-white border-stone-300 text-stone-900 focus:ring-1 focus:ring-amber-800 cursor-pointer'
                          }`}
                        >
                          {!province ? (
                            <option value="">Select Province first</option>
                          ) : (
                            <>
                              <option value="">-- Select City --</option>
                              {currentCitiesList.map(c => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
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
                      <CreditCard className="w-4 h-4 text-amber-800" /> Choose Payment Method
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* GCash Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('gcash')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between text-left cursor-pointer ${
                        selectedPaymentMethod === 'gcash'
                          ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          G
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPaymentMethod === 'gcash' ? 'border-blue-600 bg-blue-600' : 'border-stone-300'
                        }`}>
                          {selectedPaymentMethod === 'gcash' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <div>
                        <span className="font-sans font-bold text-xs text-stone-900 block">GCash</span>
                        <span className="text-[10px] text-stone-500 block font-sans">E-Wallet Instant Transfer</span>
                      </div>
                    </button>

                    {/* Maya Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('maya')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between text-left cursor-pointer ${
                        selectedPaymentMethod === 'maya'
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          M
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPaymentMethod === 'maya' ? 'border-emerald-600 bg-emerald-600' : 'border-stone-300'
                        }`}>
                          {selectedPaymentMethod === 'maya' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <div>
                        <span className="font-sans font-bold text-xs text-stone-900 block">Maya</span>
                        <span className="text-[10px] text-stone-500 block font-sans">E-Wallet & Card Transfer</span>
                      </div>
                    </button>
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
                          <span className="font-sans">Pay ₱{total?.toLocaleString()} via {selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya'}</span>
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
