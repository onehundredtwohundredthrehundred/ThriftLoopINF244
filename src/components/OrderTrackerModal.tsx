import React, { useState, useEffect } from 'react';
import { X, Truck, Package, CheckCircle2, Clock, MapPin, ShieldCheck, Check, ExternalLink, ChevronRight, AlertCircle, Store, Tag, ShoppingBag, RefreshCw, Navigation, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';
export const OrderTrackerModal: React.FC = () => {
    const { activeTrackingOrder, closeOrderTracking, orders, setActiveTrackingOrder, refreshOrderTracking, isTrackingRefreshing } = useCart();
    const { currentUser } = useAuth();
    useBodyScrollLock(!!activeTrackingOrder);
    const isSeller = currentUser?.role === 'seller';
    const isLalamoveOrder = (ord: Order) => Boolean(ord?.courier?.isLalamove ||
        ord?.courier?.carrier === 'lalamove' ||
        ord?.courier?.lalamoveOrderId ||
        (ord?.courier?.provider && ord.courier.provider.toLowerCase().includes('lalamove')));
    const lalamoveOrders = orders.filter(isLalamoveOrder);
    const uniqueOrders: Order[] = Array.from(new Map<string, Order> (lalamoveOrders.map(o => [o.id, o])).values());
    const myOrders = uniqueOrders.filter(ord => {
        if (!currentUser)
            return true;
        return (ord.buyerId === currentUser.id ||
            (!!ord.buyerEmail && !!currentUser.email && ord.buyerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
            (!!ord.shippingAddress?.fullName && !!currentUser.name && ord.shippingAddress.fullName.toLowerCase() === currentUser.name.toLowerCase()));
    });
    const ordersFromMe = uniqueOrders.filter(ord => {
        if (!currentUser || !isSeller)
            return false;
        return (ord.sellerIds?.includes(currentUser.id) ||
            ord.items.some(i => i.product.sellerId === currentUser.id ||
                (currentUser.boutiqueName && i.product.sellerBoutique === currentUser.boutiqueName)));
    });
    const [activeCategory, setActiveCategory] = useState<'my_orders' | 'ordered_from_you'> (() => {
        if (isSeller && activeTrackingOrder) {
            const inFromMe = ordersFromMe.some(o => o.id === activeTrackingOrder.id);
            const inMy = myOrders.some(o => o.id === activeTrackingOrder.id);
            if (inFromMe && !inMy)
                return 'ordered_from_you';
        }
        return 'my_orders';
    });
    const categoryOrders = isSeller
        ? (activeCategory === 'ordered_from_you' ? ordersFromMe : myOrders)
        : myOrders;
    useEffect(() => {
        if (activeTrackingOrder && categoryOrders.length > 0) {
            if (!categoryOrders.some(o => o.id === activeTrackingOrder.id)) {
                setActiveTrackingOrder(categoryOrders[0]);
            }
        }
    }, [activeCategory]);
    useEffect(() => {
        if (activeTrackingOrder?.id && activeTrackingOrder.courier?.isLalamove) {
            refreshOrderTracking(activeTrackingOrder.id);
        }
    }, [activeTrackingOrder?.id]);
    if (!activeTrackingOrder)
        return null;
    const isSoldByMe = !!currentUser && !!activeTrackingOrder && (activeTrackingOrder.sellerIds?.includes(currentUser.id) ||
        activeTrackingOrder.items.some(i => i.product.sellerId === currentUser.id ||
            (currentUser.role === 'seller' && currentUser.boutiqueName === i.product.sellerBoutique)));
    const isDelivered = (activeTrackingOrder.orderStatus as string) === 'delivered' ||
        (activeTrackingOrder.orderStatus as string) === 'completed' ||
        String(activeTrackingOrder.courier?.trackingStatus || '').toUpperCase() === 'DELIVERED' ||
        String(activeTrackingOrder.courier?.trackingStatus || '').toUpperCase() === 'COMPLETED' ||
        String(activeTrackingOrder.courier?.lalamoveStatus || '').toUpperCase() === 'COMPLETED' ||
        String(activeTrackingOrder.courier?.lalamoveStatus || '').toUpperCase() === 'DELIVERED';
    const isOutForDelivery = isDelivered ||
        activeTrackingOrder.orderStatus === 'out_for_delivery' ||
        String(activeTrackingOrder.courier?.trackingStatus || '').toUpperCase() === 'OUT_FOR_DELIVERY' ||
        String(activeTrackingOrder.courier?.lalamoveStatus || '').toUpperCase() === 'PICKED_UP';
    const isInTransit = isOutForDelivery ||
        (activeTrackingOrder.orderStatus === 'in_transit' && String(activeTrackingOrder.courier?.lalamoveStatus || '').toUpperCase() !== 'ASSIGNING_DRIVER') ||
        String(activeTrackingOrder.courier?.trackingStatus || '').toUpperCase() === 'TRANSIT' ||
        String(activeTrackingOrder.courier?.lalamoveStatus || '').toUpperCase() === 'ON_GOING';
    return (<div id="order-tracker-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200" onClick={(e) => {
            if (e.target === e.currentTarget)
                closeOrderTracking();
        }}>
      <div id="order-tracker-container" className="relative w-full max-w-2xl sm:max-w-3xl bg-[#FDFBF7] rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans" onClick={(e) => e.stopPropagation()}>
        <div className="bg-stone-900 px-4 sm:px-6 py-3.5 sm:py-4 text-amber-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-900/80 flex items-center justify-center text-amber-300 shrink-0">
              <Truck className="w-4 h-4"/>
            </div>
            <div>
              <h2 className="font-sans text-base sm:text-lg font-bold text-white">Order Tracking</h2>
              <p className="text-[11px] sm:text-xs text-stone-300 font-sans mt-0.5">
                {isSoldByMe ? 'Track your outbound delivery status' : 'Track your order delivery status'}
              </p>
            </div>
          </div>
          <button id="close-order-tracker-btn" onClick={closeOrderTracking} className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="bg-stone-950 border-t border-stone-800 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-200 shrink-0">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => {
            setActiveCategory('my_orders');
            if (myOrders.length > 0 && (!activeTrackingOrder || !myOrders.some(o => o.id === activeTrackingOrder.id))) {
                setActiveTrackingOrder(myOrders[0]);
            }
        }} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${activeCategory === 'my_orders'
            ? 'bg-amber-100 text-amber-950 shadow-xs font-bold'
            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'}`}>
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700 shrink-0"/>
                <span>Your Orders</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeCategory === 'my_orders' ? 'bg-amber-900 text-amber-100' : 'bg-stone-700 text-stone-300'}`}>
                  {myOrders.length}
                </span>
              </button>

              <button type="button" onClick={() => {
            setActiveCategory('ordered_from_you');
            if (ordersFromMe.length > 0 && (!activeTrackingOrder || !ordersFromMe.some(o => o.id === activeTrackingOrder.id))) {
                setActiveTrackingOrder(ordersFromMe[0]);
            }
        }} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${activeCategory === 'ordered_from_you'
            ? 'bg-amber-100 text-amber-950 shadow-xs font-bold'
            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'}`}>
                <Store className="w-3.5 h-3.5 text-amber-700 shrink-0"/>
                <span>Ordered From You</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeCategory === 'ordered_from_you' ? 'bg-amber-900 text-amber-100' : 'bg-stone-700 text-stone-300'}`}>
                  {ordersFromMe.length}
                </span>
              </button>
            </div>
          </div>

          {categoryOrders.length > 0 && (
            <div className="bg-stone-100 px-4 sm:px-6 py-2 border-b border-stone-200 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
              <span className="text-stone-500 font-semibold uppercase text-[10px] tracking-wider shrink-0 font-sans">Orders:</span>
              {categoryOrders.map((ord, idx) => {
                const isOrdSoldByMe = !!currentUser && (ord.sellerIds?.includes(currentUser.id) ||
                  ord.items.some(i => i.product.sellerId === currentUser.id ||
                    (currentUser.role === 'seller' && currentUser.boutiqueName === i.product.sellerBoutique)));
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
                    {isOrdSoldByMe ? (<Store className="w-3.5 h-3.5 text-amber-500 shrink-0"/>) : (<Package className="w-3.5 h-3.5 text-stone-400 shrink-0"/>)}
                    <span>#{ord.orderNumber}</span>
                    <span className="text-[10px] opacity-75 font-normal">
                      (₱{ord.total?.toLocaleString()})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 min-h-0 overflow-y-auto">

          {categoryOrders.length === 0 ? (<div className="py-8 sm:py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto">
                {activeCategory === 'ordered_from_you' ? <Store className="w-6 h-6"/> : <Package className="w-6 h-6"/>}
              </div>
              <h3 className="font-sans text-base sm:text-lg font-bold text-stone-900">
                {activeCategory === 'ordered_from_you' ? 'No Orders Placed From Your Boutique' : 'No Orders Placed Yet'}
              </h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed font-sans">
                {activeCategory === 'ordered_from_you'
            ? 'When customers purchase items from your vintage inventory, their shipping tracking will appear here.'
            : 'You have not placed any orders yet.'}
              </p>
            </div>) : activeTrackingOrder ? (<>

              <div className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 overflow-hidden shadow-xs font-sans">

                <div className="p-2.5 sm:p-4 bg-stone-900 text-stone-100 flex items-center justify-between gap-2 border-b border-stone-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-orange-600/30 text-orange-400 border border-orange-500/40 flex items-center justify-center shrink-0">
                      <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5"/>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                        Live Driver Tracking Map</h4>
                      <p className="text-[10px] sm:text-[11px] text-stone-300 truncate">
                        Order ID: <span className="font-mono text-stone-200 font-bold">{activeTrackingOrder.courier?.lalamoveOrderId || activeTrackingOrder.orderNumber}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
                    <button id="sync-carrier-tracking-btn" onClick={() => refreshOrderTracking(activeTrackingOrder.id)} disabled={isTrackingRefreshing} className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg transition-all border border-stone-700 cursor-pointer disabled:opacity-50" title="Sync latest delivery state">
                      <RefreshCw className={`w-3.5 h-3.5 ${isTrackingRefreshing ? 'animate-spin text-amber-300' : ''}`}/>
                      <span>{isTrackingRefreshing ? 'Syncing...' : 'Sync Status'}</span>
                    </button>
                    {activeTrackingOrder.courier?.lalamoveShareLink && (<a href={activeTrackingOrder.courier.lalamoveShareLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 sm:py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700 transition-colors" title="Open full Lalamove live tracker">
                        <span>Full Screen</span>
                        <ExternalLink className="w-3 h-3 text-orange-400"/>
                      </a>)}
                  </div>
                </div>

                {activeTrackingOrder.courier?.driver && (<div className="bg-stone-50 px-3 py-2 sm:px-3.5 sm:py-2.5 border-b border-stone-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-800 font-bold text-xs shrink-0">
                        🛵
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                            {activeTrackingOrder.courier.driver.name || 'Lalamove Courier Rider'}
                          </p>
                          {activeTrackingOrder.courier.driver.plateNumber && (<span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded shrink-0">
                              {activeTrackingOrder.courier.driver.plateNumber}
                            </span>)}
                        </div>
                      </div>
                    </div>

                    {activeTrackingOrder.courier.driver.phone && (<a href={`tel:${activeTrackingOrder.courier.driver.phone}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-800 font-semibold text-xs rounded-lg border border-stone-300 transition-colors shrink-0">
                        <Phone className="w-3 h-3 text-emerald-600"/>
                        <span>{activeTrackingOrder.courier.driver.phone}</span>
                      </a>)}
                  </div>)}

                <div className="relative w-full bg-stone-100 h-[460px] sm:h-[400px] overflow-hidden">

                  {(activeTrackingOrder.orderStatus === 'delivered' || activeTrackingOrder.courier?.trackingStatus === 'DELIVERED' || activeTrackingOrder.courier?.lalamoveStatus === 'COMPLETED') && (<div className="absolute top-2.5 left-2.5 right-2.5 z-20 bg-emerald-950/95 text-emerald-50 p-2.5 sm:p-3 rounded-xl border border-emerald-500/60 shadow-md flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-emerald-300 stroke-[3]"/>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-white truncate">
                            Driver Has Arrived
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-emerald-200/90 truncate">
                            Courier has arrived at destination • Package handed over to recipient
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 shrink-0">
                        Delivered
                      </span>
                    </div>)}

                  {['CANCELED', 'REJECTED', 'EXPIRED'].includes(String(activeTrackingOrder.courier?.lalamoveStatus || '').toUpperCase()) && (<div className="absolute top-2.5 left-2.5 right-2.5 z-20 bg-amber-950/95 text-amber-100 p-2.5 sm:p-3 rounded-xl border border-amber-500/60 shadow-md flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-4 h-4 text-amber-300 stroke-[2.5]"/>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-white truncate">
                            Driver Declined / Order Cancelled
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-amber-200/90 truncate">
                            The driver rejected or cancelled the request. Click "Sync Status" to re-match a courier.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 shrink-0">
                        Rejected
                      </span>
                    </div>)}

                  {activeTrackingOrder.courier?.lalamoveShareLink ? (<div className="relative w-full h-full bg-stone-100">
                      <iframe src={activeTrackingOrder.courier.lalamoveShareLink} title="Lalamove Live Driver Map" className="w-full h-full border-0" loading="lazy" allow="geolocation"/>
                    </div>) : (activeTrackingOrder.orderStatus === 'delivered' || activeTrackingOrder.courier?.trackingStatus === 'DELIVERED' || activeTrackingOrder.courier?.lalamoveStatus === 'COMPLETED') ? (<div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center h-full bg-stone-900 text-stone-200 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg">
                        <CheckCircle2 className="w-8 h-8"/>
                      </div>
                      <div className="max-w-md">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 inline-block mb-1.5">
                          Arrival Confirmed
                        </span>
                        <h5 className="font-bold text-base sm:text-lg text-white">Driver Has Arrived</h5>
                        <p className="text-xs text-stone-300 mt-1">
                          The driver has arrived and completed delivery to <span className="text-white font-medium">{activeTrackingOrder.shippingAddress?.street || 'your delivery address'}</span>.
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Electronic Proof of Delivery (e-POD) signed and registered.
                        </p>
                      </div>
                    </div>) : (<div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center h-full bg-stone-900 text-stone-300 space-y-3">
                      <Navigation className="w-8 h-8 text-orange-400 animate-pulse"/>
                      <div>
                        <p className="font-semibold text-sm text-stone-200">Connecting to Lalamove Driver GPS Feed</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">Live tracking map will load as soon as courier dispatch telemetry is synced.</p>
                      </div>
                      <button onClick={() => refreshOrderTracking(activeTrackingOrder.id)} disabled={isTrackingRefreshing} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${isTrackingRefreshing ? 'animate-spin' : ''}`}/>
                        <span>Sync Driver Status</span>
                      </button>
                    </div>)}
                </div>
              </div>

              <div className="bg-stone-100/90 border border-stone-200 rounded-xl p-3 sm:p-3.5 space-y-2.5 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                    Delivery Milestone Progression
                  </span>
                  {activeTrackingOrder.courier?.lastSyncedAt && (<span className="text-[10px] text-stone-500 font-medium">
                      Synced at {activeTrackingOrder.courier.lastSyncedAt}
                    </span>)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
            { key: 'PRE_TRANSIT', label: '1. Finding Driver', desc: 'Matching Nearby Driver' },
            { key: 'TRANSIT', label: '2. Driver Assigned', desc: 'Heading to Pickup Vault' },
            { key: 'OUT_FOR_DELIVERY', label: '3. Out for Delivery', desc: 'En Route to Recipient' },
            { key: 'DELIVERED', label: '4. Delivered', desc: 'Package Received' },
        ].map((stage) => {
            const isCompleted = (stage.key === 'DELIVERED' && isDelivered) ||
                (stage.key === 'OUT_FOR_DELIVERY' && isDelivered) ||
                (stage.key === 'TRANSIT' && isOutForDelivery) ||
                (stage.key === 'PRE_TRANSIT' && isInTransit);
            const isCurrentStage = !isDelivered && ((stage.key === 'OUT_FOR_DELIVERY' && isOutForDelivery) ||
                (stage.key === 'TRANSIT' && isInTransit && !isOutForDelivery) ||
                (stage.key === 'PRE_TRANSIT' && !isInTransit));
            return (<div key={stage.key} className={`p-2.5 rounded-lg text-left text-xs transition-all border select-none ${isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold shadow-2xs'
                    : isCurrentStage
                        ? 'bg-amber-900 text-amber-100 border-amber-800 shadow-xs font-bold ring-2 ring-amber-700/30'
                        : 'bg-white text-stone-500 border-stone-200 opacity-80'}`}>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[11px] truncate leading-tight">{stage.label}</span>
                          {isCompleted ? (<div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]"/>
                            </div>) : isCurrentStage ? (<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>) : (<span className="text-[9px] text-stone-600">Pending</span>)}
                        </div>
                        <div className={`text-[9px] ${isCompleted ? 'text-emerald-700 font-medium' : isCurrentStage ? 'text-amber-200' : 'text-stone-500'}`}>
                          {stage.desc}
                        </div>
                      </div>);
        })}
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs space-y-3 sm:space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {activeTrackingOrder.courier?.provider?.replace(/\s*\(.*?\)/g, '') || 'Lalamove Express Delivery'}
                      </span>
                    </div>
                    <h3 className="font-sans text-lg sm:text-xl font-bold text-stone-950 mt-1">
                      Order #{activeTrackingOrder.orderNumber}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-sans">
                  <div className="bg-stone-50 p-3 sm:p-3.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">Current Sorting Facility</span>
                    <p className="font-bold text-stone-900 mt-0.5 flex items-center gap-1 text-xs sm:text-sm text-amber-950">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-800 shrink-0"/>
                      <span>{activeTrackingOrder.courier?.currentHub || 'Sorting Hub'}</span>
                    </p>
                  </div>

                  <div className="bg-stone-50 p-3 sm:p-3.5 rounded-xl border border-stone-200">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">Estimated Delivery</span>
                    <p className="font-bold text-stone-900 mt-0.5 flex items-center gap-1 text-xs sm:text-sm text-emerald-950">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0"/>
                      <span>{activeTrackingOrder.courier?.estimatedDelivery || 'In Transit'}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs font-sans">
                <h4 className="font-sans text-sm sm:text-base font-bold text-stone-900 mb-4 sm:mb-5 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-800"/> Shipment Checkpoints Roadmap
                </h4>

                <div className="space-y-5 sm:space-y-6 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {activeTrackingOrder.courier?.timeline?.map((step, idx) => {
            const isLastStep = idx === (activeTrackingOrder.courier?.timeline?.length || 1) - 1;
            const isStepComplete = step.completed || (isDelivered && isLastStep);
            const isStepActive = step.isCurrent && !isDelivered;
            return (<div key={idx} className="relative">

                        <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isStepComplete
                    ? isStepActive
                        ? 'bg-amber-800 text-white ring-4 ring-amber-100 animate-pulse'
                        : 'bg-emerald-600 text-white'
                    : 'bg-stone-200 text-stone-500'}`}>
                          {isStepComplete ? '✓' : idx + 1}
                        </div>

                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-0.5 gap-0.5">
                            <h5 className={`font-bold ${isStepActive ? 'text-amber-900 text-xs sm:text-sm' : 'text-stone-900'}`}>
                              {step.status}
                              {isStepActive && (<span className="ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                                  Active Scan
                                </span>)}
                              {isDelivered && isLastStep && (<span className="ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">
                                  Delivered
                                </span>)}
                            </h5>
                            <span className="text-[10px] sm:text-[11px] font-medium text-stone-500">
                              {isDelivered && isLastStep && step.timestamp === 'Active Now' ? 'Completed' : step.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-stone-600">{step.location}</p>
                          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{step.description}</p>
                        </div>
                      </div>);
        })}
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-stone-200 shadow-xs font-sans">
                <h4 className="font-sans text-sm sm:text-base font-bold text-stone-900 mb-3 flex flex-wrap items-center justify-between gap-1">
                  <span>Garments In This Shipment</span>
                  <span className="text-xs font-semibold text-stone-600">Paid Total: ₱{activeTrackingOrder.total?.toLocaleString()}</span>
                </h4>

                <div className="divide-y divide-stone-100">
                  {activeTrackingOrder.items?.map((item, itemIdx) => {
            const isMyItem = !!currentUser && (item.product.sellerId === currentUser.id ||
                (currentUser.role === 'seller' && currentUser.boutiqueName === item.product.sellerBoutique));
            return (<div key={`${item.product?.id || itemIdx}-${itemIdx}`} className="py-3 flex items-center justify-between gap-3 text-xs font-sans">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <img src={item.product?.images?.[0]} alt={item.product?.title || 'Garment'} className="w-10 h-12 sm:w-12 sm:h-14 object-cover rounded bg-stone-100 shrink-0"/>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-bold text-stone-900 truncate text-xs sm:text-sm">{item.product?.title}</p>
                              {isMyItem && (<span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300 shrink-0">
                                  Your Listing
                                </span>)}
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
                          {item.quantity && item.quantity > 1 ? (<span className="text-[10px] text-stone-400 block">₱{item.priceAtPurchase?.toLocaleString()} ea</span>) : (<span className="text-[10px] text-emerald-700 font-semibold">Verified Paid</span>)}
                        </div>
                      </div>);
        })}
                </div>

                <div className="mt-3 pt-3 border-t border-stone-200 space-y-1.5 text-xs text-stone-600 font-sans">
                  <div className="flex justify-between items-center">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-stone-900">₱{activeTrackingOrder.subtotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Delivery Fee (Lalamove Express)</span>
                    <span className="font-semibold text-stone-900">
                      {activeTrackingOrder.shippingFee === 0 ? (<span className="text-emerald-700 font-bold">FREE</span>) : (`₱${activeTrackingOrder.shippingFee?.toLocaleString()}`)}
                    </span>
                  </div>
                  {activeTrackingOrder.discount ? (<div className="flex justify-between items-center text-emerald-700">
                      <span>Promo Discount</span>
                      <span className="font-semibold">-₱{activeTrackingOrder.discount.toLocaleString()}</span>
                    </div>) : null}
                  <div className="flex justify-between items-center pt-2 border-t border-stone-100 text-stone-950 font-bold text-xs sm:text-sm">
                    <span>Paid Total</span>
                    <span className="text-sm font-bold text-stone-950">₱{activeTrackingOrder.total?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {activeTrackingOrder.shippingAddress && (<div className="p-3.5 sm:p-4 bg-stone-100/80 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1 font-sans">
                  <p className="font-bold text-stone-900">
                    {isSoldByMe ? 'Customer Delivery Address:' : 'Recipient Address:'}
                  </p>
                  <p className="font-semibold text-stone-950">{activeTrackingOrder.shippingAddress.fullName} • {activeTrackingOrder.shippingAddress.phone}</p>
                  <p className="text-stone-600">{activeTrackingOrder.shippingAddress.street}, {activeTrackingOrder.shippingAddress.city}, {activeTrackingOrder.shippingAddress.province} {activeTrackingOrder.shippingAddress.zipCode}</p>
                </div>)}
            </>) : null}
        </div>
      </div>
    </div>
  );
};
