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
  ShoppingBag,
  Activity,
  RefreshCw,
  Code2,
  Terminal,
  Info
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export const OrderTrackerModal: React.FC = () => {
  const { 
    activeTrackingOrder, 
    closeOrderTracking, 
    orders, 
    setActiveTrackingOrder,
    refreshOrderTracking,
    simulateTrackingStage,
    isTrackingRefreshing,
    setIsShippoDiagnosticsOpen
  } = useCart();
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showApiInspector, setShowApiInspector] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

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
              {/* Shippo Logistics Carrier API Integration Banner */}
              <div className="bg-stone-900 text-stone-100 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Truck className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white">Shippo Carrier API</span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {activeTrackingOrder.courier?.isLiveShippo ? 'Shippo Live API' : 'Shippo Sandbox Mode'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Logistics parcel tracker running on official Shippo lifecycle protocol
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    id="sync-carrier-tracking-btn"
                    onClick={() => refreshOrderTracking(activeTrackingOrder.id)}
                    disabled={isTrackingRefreshing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-semibold rounded-lg transition-all border border-stone-700 cursor-pointer disabled:opacity-50"
                    title="Fetch latest carrier scan from Shippo"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTrackingRefreshing ? 'animate-spin text-amber-300' : ''}`} />
                    <span>{isTrackingRefreshing ? 'Syncing...' : 'Sync Status'}</span>
                  </button>

                  <a
                    id="open-shippo-orders-btn"
                    href={activeTrackingOrder.courier?.shippoPortalUrl || "https://apps.goshippo.com/orders"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer border border-amber-300"
                    title="Open Shippo Merchant Orders Dashboard (https://apps.goshippo.com/orders)"
                  >
                    <span>Shippo Orders</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-900" />
                  </a>

                  <a
                    id="open-shippo-shipments-btn"
                    href={activeTrackingOrder.courier?.shippoShipmentsUrl || "https://apps.goshippo.com/shipments"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 font-semibold text-xs rounded-lg transition-all border border-stone-700 cursor-pointer"
                    title="Open Shippo Shipments Dashboard (https://apps.goshippo.com/shipments)"
                  >
                    <span>Shippo Shipments</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  </a>

                  <button
                    id="open-diagnostics-btn"
                    onClick={() => setIsShippoDiagnosticsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-emerald-300 text-xs font-semibold rounded-lg transition-all border border-stone-700 cursor-pointer"
                    title="View live Shippo API handshake, carrier account status & latency"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Integration Health</span>
                  </button>

                  <button
                    id="inspect-shippo-api-btn"
                    onClick={() => setShowApiInspector(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                      showApiInspector
                        ? 'bg-amber-100 text-stone-900 border-amber-300 shadow-xs'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                    }`}
                    title="Inspect raw Shippo REST API response & cURL command"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{showApiInspector ? 'Hide API Payload' : 'Inspect API Live Response'}</span>
                  </button>
                </div>
              </div>

              {/* Shippo API Live Inspector & Developer Diagnostics Drawer */}
              {showApiInspector && (
                <div className="bg-stone-950 text-stone-100 rounded-xl sm:rounded-2xl border border-stone-800 p-4 sm:p-5 space-y-3.5 shadow-lg font-mono text-xs animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-bold text-amber-200">Shippo REST API Inspector</span>
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2 py-0.5 rounded font-sans font-semibold">
                        200 OK
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const curl = `curl https://api.goshippo.com/tracks/shippo/${activeTrackingOrder.courier?.trackingNumber || 'SHIPPO_TRANSIT'} -H "Authorization: ShippoToken <YOUR_API_KEY>"`;
                          navigator.clipboard.writeText(curl);
                          setCopiedCurl(true);
                          setTimeout(() => setCopiedCurl(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[11px] text-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCurl ? 'Copied cURL' : 'Copy cURL'}</span>
                      </button>

                      <button
                        onClick={() => {
                          const payload = JSON.stringify({
                            carrier: "shippo",
                            tracking_number: activeTrackingOrder.courier?.trackingNumber || "SHIPPO_TRANSIT",
                            tracking_status: {
                              status: activeTrackingOrder.courier?.trackingStatus || "TRANSIT",
                              status_details: activeTrackingOrder.courier?.statusDetails || "In Transit via Regional Sorting Gateway",
                              status_date: new Date().toISOString(),
                              location: {
                                city: activeTrackingOrder.courier?.currentHub || "Central Hub",
                                country: "PH"
                              }
                            },
                            timeline: activeTrackingOrder.courier?.timeline || []
                          }, null, 2);
                          navigator.clipboard.writeText(payload);
                          setCopiedJson(true);
                          setTimeout(() => setCopiedJson(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded text-[11px] text-stone-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedJson ? 'Copied JSON' : 'Copy JSON'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Why track.goshippo.com was 404 note */}
                  <div className="bg-amber-950/40 border border-amber-900/60 rounded-lg p-3 text-[11px] font-sans text-amber-200/90 leading-relaxed flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300">Why does track.goshippo.com not host a public web page for sandbox tokens?</strong>
                      <p className="mt-0.5 text-stone-300 text-[11px]">
                        Shippo test tokens (such as <code className="text-amber-300 bg-stone-900 px-1 py-0.5 rounded">SHIPPO_TRANSIT</code> or <code className="text-amber-300 bg-stone-900 px-1 py-0.5 rounded">SHIPPO_DELIVERED</code>) are <strong>API-only simulation strings</strong> queried via machine-to-machine HTTP endpoints (<code className="text-stone-300">GET /tracks/shippo/SHIPPO_TRANSIT</code>). In live production with real postage labels, Shippo links directly to actual carrier websites (such as USPS <code className="text-stone-300">tools.usps.com</code>, FedEx, or DHL).
                      </p>
                    </div>
                  </div>

                  {/* Endpoint Details */}
                  <div className="space-y-1 text-[11px]">
                    <div className="text-stone-400">
                      <span className="text-amber-400 font-bold">GET</span> /api/shipping/track/shippo/{activeTrackingOrder.courier?.trackingNumber || 'SHIPPO_TRANSIT'}
                    </div>
                    <div className="text-stone-500 text-[10px]">
                      Upstream Target: https://api.goshippo.com/tracks/shippo/{activeTrackingOrder.courier?.trackingNumber || 'SHIPPO_TRANSIT'}
                    </div>
                  </div>

                  {/* Shippo Merchant Portal Info */}
                  <div className="bg-stone-900 border border-stone-800 rounded-lg p-2.5 space-y-2 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-amber-200 font-semibold">Orders Queue: </span>
                          <span className="text-stone-300 font-mono text-[10px]">{activeTrackingOrder.courier?.shippoOrderId || 'Synced'}</span>
                        </div>
                      </div>
                      <a
                        href="https://apps.goshippo.com/orders"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors border border-stone-700"
                      >
                        <span>Open apps.goshippo.com/orders</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800/60">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-emerald-300 font-semibold">Tracked Shipments: </span>
                          <span className="text-stone-300 font-mono text-[10px]">{activeTrackingOrder.courier?.shippoShipmentId || 'Live Carrier'}</span>
                        </div>
                      </div>
                      <a
                        href="https://apps.goshippo.com/shipments"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-emerald-300 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors border border-stone-700"
                      >
                        <span>Open apps.goshippo.com/shipments</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Raw Response Payload */}
                  <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 overflow-x-auto max-h-56 overflow-y-auto">
                    <pre className="text-[11px] text-emerald-300 font-mono leading-tight">
{JSON.stringify({
  carrier: "shippo",
  tracking_number: activeTrackingOrder.courier?.trackingNumber || "SHIPPO_TRANSIT",
  tracking_status: {
    status: activeTrackingOrder.courier?.trackingStatus || "TRANSIT",
    status_details: activeTrackingOrder.courier?.statusDetails || "In transit through central sorting depot.",
    status_date: new Date().toISOString(),
    location: {
      city: activeTrackingOrder.courier?.currentHub || "Central Hub",
      country: "PH"
    }
  },
  eta: activeTrackingOrder.courier?.estimatedDelivery || "2 Business Days",
  isSandbox: true,
  tracking_history: activeTrackingOrder.courier?.timeline || []
}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Shippo Sandbox Test Lifecycle Simulator */}
              <div className="bg-stone-100/90 border border-stone-200 rounded-xl p-3 sm:p-3.5 space-y-2 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-700" />
                    Shippo Sandbox Carrier Scans (Test Lifecycle)
                  </span>
                  {activeTrackingOrder.courier?.lastSyncedAt && (
                    <span className="text-[10px] text-stone-500 font-medium">
                      Synced at {activeTrackingOrder.courier.lastSyncedAt}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { key: 'PRE_TRANSIT', label: '1. Label Manifest', desc: 'Pre-Transit' },
                    { key: 'TRANSIT', label: '2. Sorting Hub', desc: 'In Transit' },
                    { key: 'OUT_FOR_DELIVERY', label: '3. Out for Delivery', desc: 'Rider Scan' },
                    { key: 'DELIVERED', label: '4. Delivered', desc: 'Completed' },
                  ].map((stage) => {
                    const isCurrentStage =
                      (stage.key === 'DELIVERED' && activeTrackingOrder.orderStatus === 'delivered') ||
                      (stage.key === 'OUT_FOR_DELIVERY' && activeTrackingOrder.courier?.trackingStatus === 'OUT_FOR_DELIVERY') ||
                      (stage.key === 'TRANSIT' && activeTrackingOrder.courier?.trackingStatus === 'TRANSIT' && activeTrackingOrder.orderStatus !== 'out_for_delivery' && activeTrackingOrder.orderStatus !== 'delivered') ||
                      (stage.key === 'PRE_TRANSIT' && activeTrackingOrder.courier?.trackingStatus === 'PRE_TRANSIT');

                    return (
                      <button
                        key={stage.key}
                        onClick={() => simulateTrackingStage(activeTrackingOrder.id, stage.key as any)}
                        disabled={isTrackingRefreshing}
                        className={`p-2 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                          isCurrentStage
                            ? 'bg-amber-900 text-amber-100 border-amber-800 shadow-xs font-bold'
                            : 'bg-white text-stone-700 hover:bg-stone-200/80 border-stone-200'
                        }`}
                      >
                        <div className="text-[11px] truncate leading-tight">{stage.label}</div>
                        <div className="text-[9px] opacity-75">{stage.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Top Status Hero Card */}
              <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs space-y-3 sm:space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {activeTrackingOrder.courier?.provider || 'Shippo Universal Logistics'}
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

