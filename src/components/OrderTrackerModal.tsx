import React, { useState } from 'react';
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
  Tag
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

  if (!activeTrackingOrder) return null;

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(activeTrackingOrder.courier.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if active tracking order contains items sold by current user/boutique
  const isSoldByMe = !!currentUser && (
    activeTrackingOrder.sellerIds?.includes(currentUser.id) ||
    activeTrackingOrder.items.some(
      i => i.product.sellerId === currentUser.id || 
      (currentUser.role === 'seller' && currentUser.boutiqueName === i.product.sellerBoutique)
    )
  );

  const uniqueOrders: Order[] = Array.from(new Map<string, Order>(orders.map(o => [o.id, o])).values());

  return (
    <div 
      id="order-tracker-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOrderTracking();
      }}
    >
      <div 
        id="order-tracker-container"
        className="relative w-full max-w-3xl bg-[#FDFBF7] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 px-6 py-4 text-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-900/80 flex items-center justify-center text-amber-300">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Live Courier Logistics Tracking</h2>
              <p className="text-[11px] text-stone-400 font-mono">
                {isSoldByMe ? 'Boutique Outbound Dispatch & Delivery Route' : 'Customer Parcel Logistics Hub Updates'}
              </p>
            </div>
          </div>
          <button
            id="close-order-tracker-btn"
            onClick={closeOrderTracking}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Selector Tab if multiple orders exist */}
        {uniqueOrders.length > 1 && (
          <div className="bg-stone-100 px-6 py-2.5 border-b border-stone-200 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-stone-500 font-semibold uppercase text-[10px] font-mono shrink-0">Orders:</span>
            {uniqueOrders.map((ord, idx) => {
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
                  className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeTrackingOrder.id === ord.id
                      ? 'bg-stone-900 text-amber-200 font-bold shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-200'
                  }`}
                >
                  {isOrdSoldByMe ? (
                    <Store className="w-3 h-3 text-amber-500 shrink-0" />
                  ) : (
                    <Package className="w-3 h-3 text-stone-400 shrink-0" />
                  )}
                  <span>#{ord.orderNumber}</span>
                  {isOrdSoldByMe && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 bg-amber-950 text-amber-200 rounded">
                      Sold by you
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Main Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Seller Perspective Notice Banner if viewing as Curator */}
          {isSoldByMe && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-800 shrink-0" />
                <span>
                  <strong className="font-semibold">Boutique Outbound Dispatch:</strong> This order contains piece(s) sold from your vintage collection.
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                Curator View
              </span>
            </div>
          )}

          {/* Top Status Hero Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {activeTrackingOrder.courier.provider}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    ✓ PayRex Gateway Secured
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-950 mt-1">
                  Order #{activeTrackingOrder.orderNumber}
                </h3>
              </div>

              {/* Tracking Number copy pill */}
              <button
                id="copy-tracking-number-btn"
                onClick={handleCopyTracking}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-mono text-stone-800 transition-colors self-start sm:self-auto"
                title="Copy tracking code"
              >
                <span>{activeTrackingOrder.courier.trackingNumber}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              </button>
            </div>

            {/* Current Hub & Estimated Delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Current Sorting Facility</span>
                <p className="font-bold text-stone-900 mt-0.5 flex items-center gap-1 text-sm text-amber-950">
                  <MapPin className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>{activeTrackingOrder.courier.currentHub}</span>
                </p>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Estimated Delivery</span>
                <p className="font-bold text-stone-900 mt-0.5 flex items-center gap-1 text-sm text-emerald-950">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{activeTrackingOrder.courier.estimatedDelivery}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Timeline of Checkpoints */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h4 className="font-serif text-base font-bold text-stone-900 mb-5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-800" /> Shipment Checkpoints Roadmap
            </h4>

            <div className="space-y-6 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {activeTrackingOrder.courier?.timeline?.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Bullet */}
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step.completed
                      ? step.isCurrent
                        ? 'bg-amber-800 text-white ring-4 ring-amber-100 animate-pulse'
                        : 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-500'
                  }`}>
                    {step.completed ? '✓' : idx + 1}
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-0.5">
                      <h5 className={`font-bold ${step.isCurrent ? 'text-amber-900 text-sm' : 'text-stone-900'}`}>
                        {step.status}
                        {step.isCurrent && (
                          <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold">
                            Active Scan
                          </span>
                        )}
                      </h5>
                      <span className="text-[11px] font-mono text-stone-400">{step.timestamp}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-stone-600">{step.location}</p>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items In Parcel */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <h4 className="font-serif text-base font-bold text-stone-900 mb-3 flex items-center justify-between">
              <span>Garments In This Shipment</span>
              <span className="text-xs font-mono text-stone-500">Paid Total: ₱{activeTrackingOrder.total?.toLocaleString()}</span>
            </h4>

            <div className="divide-y divide-stone-100">
              {activeTrackingOrder.items.map((item, itemIdx) => {
                const isMyItem = !!currentUser && (
                  item.product.sellerId === currentUser.id ||
                  (currentUser.role === 'seller' && currentUser.boutiqueName === item.product.sellerBoutique)
                );

                return (
                  <div key={`${item.product.id}-${itemIdx}`} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.product?.images?.[0]}
                        alt={item.product.title}
                        className="w-12 h-14 object-cover rounded bg-stone-100"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-stone-900">{item.product.title}</p>
                          {isMyItem && (
                            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300">
                              Your Listing
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {item.product.era} • Size {item.product.size} • {item.product.condition} • <span className="font-bold text-stone-700">Qty: {item.quantity || 1}</span>
                        </p>
                        <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                          Boutique: {item.product.sellerBoutique}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-serif font-bold text-stone-950 block">₱{((item.quantity || 1) * item.priceAtPurchase)?.toLocaleString()}</span>
                      {item.quantity && item.quantity > 1 ? (
                        <span className="text-[9px] text-stone-400 font-mono block">₱{item.priceAtPurchase?.toLocaleString()} ea</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-mono">Verified Paid</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Recipient Address Box */}
          <div className="p-4 bg-stone-100/80 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
            <p className="font-bold text-stone-900 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-800" />
              <span>{isSoldByMe ? 'Customer Delivery Address:' : 'Recipient Address:'}</span>
            </p>
            <p className="font-semibold text-stone-950">{activeTrackingOrder.shippingAddress.fullName} • {activeTrackingOrder.shippingAddress.phone}</p>
            <p>{activeTrackingOrder.shippingAddress.street}, {activeTrackingOrder.shippingAddress.city}, {activeTrackingOrder.shippingAddress.province} {activeTrackingOrder.shippingAddress.zipCode}</p>
          </div>

        </div>
      </div>
    </div>
  );
};
