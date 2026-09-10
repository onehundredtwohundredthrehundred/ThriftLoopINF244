import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Store,
  UserCheck,
  Tag,
  ShoppingBag
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export const OrderTrackerModal: React.FC = () => {
  const { activeTrackingOrder, closeOrderTracking, orders, setActiveTrackingOrder } = useCart();
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);

  useBodyScrollLock(!!activeTrackingOrder);

  // Check if current user is seller
  const isSeller = currentUser?.role === 'seller';

  // Deduplicate orders
  const uniqueOrders: Order[] = Array.from(new Map<string, Order>(orders.map(o => [o.id, o])).values());

  // Filter 1: Orders placed by the current user (Your Orders)
  const myOrders = uniqueOrders.filter(ord => {
    if (!currentUser) return true; // Show session orders for guest
    return (
      ord.buyerId === currentUser.id ||
      (!!ord.buyerEmail && !!currentUser.email && ord.buyerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
      (!!ord.shippingAddress?.fullName && !!currentUser.name && ord.shippingAddress.fullName.toLowerCase() === currentUser.name.toLowerCase())
    );
  });

  // Filter 2: Orders containing items sold by the current user (Ordered From You)
  const ordersFromMe = uniqueOrders.filter(ord => {
    if (!currentUser || !isSeller) return false;
    return (
      ord.sellerIds?.includes(currentUser.id) ||
      ord.items.some(
        i => i.product.sellerId === currentUser.id ||
        (currentUser.boutiqueName && i.product.sellerBoutique === currentUser.boutiqueName)
      )
    );
  });

  // Tab state for sellers: 'my_orders' or 'ordered_from_you'
  const [activeCategory, setActiveCategory] = useState<'my_orders' | 'ordered_from_you'>(() => {
    if (isSeller && activeTrackingOrder) {
      const inFromMe = ordersFromMe.some(o => o.id === activeTrackingOrder.id);
      const inMy = myOrders.some(o => o.id === activeTrackingOrder.id);
      if (inFromMe && !inMy) return 'ordered_from_you';
    }
    return 'my_orders';
  });

  // Active list of orders for the current selected category or view
  const categoryOrders = isSeller 
    ? (activeCategory === 'ordered_from_you' ? ordersFromMe : myOrders)
    : myOrders;

  // Sync active tracking order when category changes if needed
  useEffect(() => {
    if (activeTrackingOrder && categoryOrders.length > 0) {
      if (!categoryOrders.some(o => o.id === activeTrackingOrder.id)) {
        setActiveTrackingOrder(categoryOrders[0]);
      }
    }
  }, [activeCategory]);

  if (!activeTrackingOrder) return null;

  const handleCopyTracking = () => {
    if (activeTrackingOrder?.courier?.trackingNumber) {
      navigator.clipboard.writeText(activeTrackingOrder.courier.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Check if the currently displayed order was sold by current user
  const isSoldByMe = !!currentUser && !!activeTrackingOrder && (
    activeTrackingOrder.sellerIds?.includes(currentUser.id) ||
    activeTrackingOrder.items.some(
      i => i.product.sellerId === currentUser.id || 
      (currentUser.role === 'seller' && currentUser.boutiqueName === i.product.sellerBoutique)
    )
  );

  return (
    <div 
      id="order-tracker-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOrderTracking();
      }}
    >
      <div 
        id="order-tracker-container"
        className="relative w-full max-w-2xl sm:max-w-3xl bg-[#FDFBF7] rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 px-4 sm:px-6 py-3.5 sm:py-4 text-amber-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-900/80 flex items-center justify-center text-amber-300 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sans text-base sm:text-lg font-bold text-white">Order Tracking</h2>
              <p className="text-[11px] sm:text-xs text-stone-300 font-sans mt-0.5">
                {isSoldByMe ? 'Track your outbound delivery status' : 'Track your order delivery status'}
              </p>
            </div>
          </div>
          <button
            id="close-order-tracker-btn"
            onClick={closeOrderTracking}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Header Bar for Sellers (Your Orders vs. Ordered From You) */}
        {isSeller && (
          <div className="bg-stone-900/95 border-t border-stone-800 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-200 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('my_orders');
                  if (myOrders.length > 0 && (!activeTrackingOrder || !myOrders.some(o => o.id === activeTrackingOrder.id))) {
                    setActiveTrackingOrder(myOrders[0]);
                  }
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCategory === 'my_orders'
                    ? 'bg-amber-100 text-amber-950 shadow-xs font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Your Orders</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeCategory === 'my_orders' ? 'bg-amber-900 text-amber-100' : 'bg-stone-700 text-stone-300'
                }`}>
                  {myOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('ordered_from_you');
                  if (ordersFromMe.length > 0 && (!activeTrackingOrder || !ordersFromMe.some(o => o.id === activeTrackingOrder.id))) {
                    setActiveTrackingOrder(ordersFromMe[0]);
                  }
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCategory === 'ordered_from_you'
                    ? 'bg-amber-100 text-amber-950 shadow-xs font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Ordered From You</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeCategory === 'ordered_from_you' ? 'bg-amber-900 text-amber-100' : 'bg-stone-700 text-stone-300'
                }`}>
                  {ordersFromMe.length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Order Selector Tabs */}
        {categoryOrders.length > 0 && (
          <div className="bg-stone-100 px-4 sm:px-6 py-2 border-b border-stone-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="text-stone-500 font-semibold uppercase text-[10px] tracking-wider shrink-0 font-sans">Orders:</span>
            {categoryOrders.map((ord, idx) => {
              const isOrdSoldByMe = !!currentUser && (
                ord.sellerIds?.includes(currentUser.id) ||
                ord.items.some(
                  i => i.product.sellerId === currentUser.id || 
                  (currentUser.role === 'seller' && currentUser.boutiqueName === i.product.sellerBoutique)
                )
              );

              return (
                <button
                  key={`${ord.id}-${idx}`}
                  onClick={() => setActiveTrackingOrder(ord)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer font-sans shrink-0 ${
                    activeTrackingOrder?.id === ord.id
                      ? 'bg-stone-900 text-amber-200 shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                  }`}
                >
                  {isOrdSoldByMe ? (
                    <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Package className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  )}
                  <span>#{ord.orderNumber}</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    (₱{ord.total?.toLocaleString()})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 min-h-0 overflow-y-auto">
          
          {/* Empty State if no orders exist for selected category */}
          {categoryOrders.length === 0 ? (
            <div className="py-8 sm:py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto">
                {activeCategory === 'ordered_from_you' ? <Store className="w-6 h-6" /> : <Package className="w-6 h-6" />}
              </div>
              <h3 className="font-sans text-base sm:text-lg font-bold text-stone-900">
                {activeCategory === 'ordered_from_you' ? 'No Orders Placed From Your Boutique' : 'No Orders Placed Yet'}
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed font-sans">
                {activeCategory === 'ordered_from_you' 
                  ? 'When customers purchase items from your vintage inventory, their shipping tracking will appear here.'
                  : 'You have not placed any orders yet.'}
              </p>
            </div>
          ) : activeTrackingOrder ? (
            <>

              {/* Top Status Hero Card */}
              <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs space-y-3 sm:space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {activeTrackingOrder.courier?.provider || 'LoopExpress Courier'}
                      </span>
                      {activeTrackingOrder.paymentIntentId && (
                        <span className="text-[10px] font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1" title={activeTrackingOrder.paymentIntentId}>
                          <Check className="w-3 h-3 text-emerald-600" />
                          Stripe: {activeTrackingOrder.paymentIntentId.startsWith('pi_') ? activeTrackingOrder.paymentIntentId.slice(0, 18) + '...' : activeTrackingOrder.paymentIntentId}
                        </span>
                      )}
                    </div>
                    <h3 className="font-sans text-lg sm:text-xl font-bold text-stone-950 mt-1">
                      Order #{activeTrackingOrder.orderNumber}
                    </h3>
                  </div>

                  {/* Tracking Number copy button */}
                  {activeTrackingOrder.courier?.trackingNumber && (
                    <button
                      id="copy-tracking-number-btn"
                      onClick={handleCopyTracking}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold text-stone-800 transition-colors self-start sm:self-auto cursor-pointer font-sans"
                      title="Copy tracking code"
                    >
                      <span>{activeTrackingOrder.courier.trackingNumber}</span>
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                    </button>
                  )}
                </div>

                {/* Current Hub & Estimated Delivery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-sans">
                  <div className="bg-stone-50 p-3 sm:p-3.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">Current Sorting Facility</span>
                    <p className="font-bold text-stone-900 mt-0.5 flex items-center gap-1 text-xs sm:text-sm text-amber-950">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-800 shrink-0" />
                      <span>{activeTrackingOrder.courier?.currentHub || 'Sorting Hub'}</span>
                    </p>
                  </div>

                  <div className="bg-stone-50 p-3 sm:p-3.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">Estimated Delivery</span>
                    <p className="font-bold text-stone-900 mt-0.5 flex items-center gap-1 text-xs sm:text-sm text-emerald-950">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0" />
                      <span>{activeTrackingOrder.courier?.estimatedDelivery || 'In Transit'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline of Checkpoints */}
              <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs font-sans">
                <h4 className="font-sans text-sm sm:text-base font-bold text-stone-900 mb-4 sm:mb-5 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-800" /> Shipment Checkpoints Roadmap
                </h4>

                <div className="space-y-5 sm:space-y-6 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {activeTrackingOrder.courier?.timeline?.map((step, idx) => (
                    <div key={idx} className="relative">
                      {/* Bullet */}
                      <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.completed
                          ? step.isCurrent
                            ? 'bg-amber-800 text-white ring-4 ring-amber-100 animate-pulse'
                            : 'bg-emerald-600 text-white'
                          : 'bg-stone-200 text-stone-500'
                      }`}>
                        {step.completed ? '✓' : idx + 1}
                      </div>

                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-0.5 gap-0.5">
                          <h5 className={`font-bold ${step.isCurrent ? 'text-amber-900 text-xs sm:text-sm' : 'text-stone-900'}`}>
                            {step.status}
                            {step.isCurrent && (
                              <span className="ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                                Active Scan
                              </span>
                            )}
                          </h5>
                          <span className="text-[10px] sm:text-[11px] font-medium text-stone-500">{step.timestamp}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-stone-600">{step.location}</p>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items In Parcel */}
              <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs font-sans">
                <h4 className="font-sans text-sm sm:text-base font-bold text-stone-900 mb-3 flex flex-wrap items-center justify-between gap-1">
                  <span>Garments In This Shipment</span>
                  <span className="text-xs font-semibold text-stone-600">Paid Total: ₱{activeTrackingOrder.total?.toLocaleString()}</span>
                </h4>

                <div className="divide-y divide-stone-100">
                  {activeTrackingOrder.items?.map((item, itemIdx) => {
                    const isMyItem = !!currentUser && (
                      item.product.sellerId === currentUser.id ||
                      (currentUser.role === 'seller' && currentUser.boutiqueName === item.product.sellerBoutique)
                    );

                    return (
                      <div key={`${item.product?.id || itemIdx}-${itemIdx}`} className="py-3 flex items-center justify-between gap-3 text-xs font-sans">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <img
                            src={item.product?.images?.[0]}
                            alt={item.product?.title || 'Garment'}
                            className="w-10 h-12 sm:w-12 sm:h-14 object-cover rounded bg-stone-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-bold text-stone-900 truncate text-xs sm:text-sm">{item.product?.title}</p>
                              {isMyItem && (
                                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300 shrink-0">
                                  Your Listing
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
                              {item.product?.era} • Size {item.product?.size} • {item.product?.condition} • <span className="font-bold text-stone-700">Qty: {item.quantity || 1}</span>
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-amber-800 font-medium mt-0.5 truncate">
                              Boutique: {item.product?.sellerBoutique}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-sans font-bold text-stone-950 block text-xs sm:text-sm">₱{((item.quantity || 1) * item.priceAtPurchase)?.toLocaleString()}</span>
                          {item.quantity && item.quantity > 1 ? (
                            <span className="text-[10px] text-stone-400 block">₱{item.priceAtPurchase?.toLocaleString()} ea</span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-semibold">Verified Paid</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Recipient Address Box */}
              {activeTrackingOrder.shippingAddress && (
                <div className="p-3.5 sm:p-4 bg-stone-100/80 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1 font-sans">
                  <p className="font-bold text-stone-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-800" />
                    <span>{isSoldByMe ? 'Customer Delivery Address:' : 'Recipient Address:'}</span>
                  </p>
                  <p className="font-semibold text-stone-950">{activeTrackingOrder.shippingAddress.fullName} • {activeTrackingOrder.shippingAddress.phone}</p>
                  <p className="text-stone-600">{activeTrackingOrder.shippingAddress.street}, {activeTrackingOrder.shippingAddress.city}, {activeTrackingOrder.shippingAddress.province} {activeTrackingOrder.shippingAddress.zipCode}</p>
                </div>
              )}
            </>
          ) : null}

        </div>
      </div>
    </div>
  );
};

