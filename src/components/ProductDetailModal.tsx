import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Ruler, 
  Store, 
  Truck, 
  Sparkles, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Minus,
  Maximize2
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CONDITIONS } from '../data/mockData';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export const ProductDetailModal: React.FC = () => {
  const { selectedProduct, isDetailModalOpen, setIsDetailModalOpen, openSellerProfile } = useInventory();
  const { addToCart, updateQuantity, cart, setIsCartDrawerOpen } = useCart();
  const { currentUser } = useAuth();
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Hover zoom state
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Fullscreen Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Lock body scroll when modal or lightbox is active
  useBodyScrollLock(isDetailModalOpen && !!selectedProduct);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPos({ x, y });
  };

  useEffect(() => {
    if (selectedProduct && isDetailModalOpen) {
      const inCart = cart.find(i => i.product.id === selectedProduct.id);
      setSelectedQuantity(inCart ? (inCart.quantity || 1) : 1);
      setActiveImageIdx(0);
      setIsLightboxOpen(false);
    }
  }, [selectedProduct?.id, isDetailModalOpen]);

  if (!isDetailModalOpen || !selectedProduct) return null;

  const inCartItem = cart.find(item => item.product.id === selectedProduct.id);
  const isInCart = !!inCartItem;
  const currentInCartQty = inCartItem?.quantity || 1;
  const isQtyChanged = isInCart && selectedQuantity !== currentInCartQty;
  const isSold = selectedProduct.status === 'sold' || (selectedProduct.stock !== undefined && selectedProduct.stock <= 0);
  const defaultSellerIds = new Set(['user_seller_01', 'user_seller_02', 'curator']);
  const isOwnProduct = !!currentUser && (
    currentUser.id === selectedProduct.sellerId || 
    (currentUser.role === 'seller' && currentUser.boutiqueName && selectedProduct.sellerBoutique?.toLowerCase() === currentUser.boutiqueName.toLowerCase()) ||
    (currentUser.role === 'seller' && defaultSellerIds.has(selectedProduct.sellerId))
  );
  const conditionConfig = CONDITIONS.find(c => c.grade === selectedProduct.condition) || CONDITIONS[1];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSellerClick = () => {
    if (!selectedProduct) return;
    openSellerProfile({
      sellerId: selectedProduct.sellerId,
      sellerBoutique: selectedProduct.sellerBoutique,
      sellerName: selectedProduct.sellerName,
      sellerAvatar: selectedProduct.sellerAvatar,
    });
  };

  return (
    <>
      <div 
        id="product-detail-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsDetailModalOpen(false);
        }}
      >
        <div 
          id="product-detail-container"
          className="relative w-full max-w-4xl bg-[#FDFBF7] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Bar */}
          <div className="bg-stone-900 px-6 py-3.5 text-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-900/60 border border-amber-700/60 text-amber-100 text-[10px] font-sans font-bold uppercase rounded tracking-wider">
                {selectedProduct.era} Vintage
              </span>
            </div>
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 p-4 sm:p-8 max-h-[85vh] overflow-y-auto">
            
            {/* Left Column: Image Gallery & Inspection */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* MOBILE ONLY: Brand, Stock Status, Share & Title Above Image */}
              <div className="block lg:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-900 text-xs uppercase tracking-wider font-sans">
                      {selectedProduct.brand}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className={`text-[11px] font-sans px-2.5 py-0.5 rounded-full font-semibold border ${
                      isSold
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : selectedProduct.stock > 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50/90 text-amber-950 border-amber-300/80'
                    }`}>
                      {isSold
                        ? '✕ Sold Out (0 in stock)'
                        : selectedProduct.stock > 1
                        ? `${selectedProduct.stock} Pieces Available`
                        : '1 Piece Available'}
                    </span>
                  </div>

                  <button 
                    onClick={handleShare}
                    className="text-stone-500 hover:text-stone-900 flex items-center gap-1 text-[11px] font-sans cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copyFeedback ? 'Link Copied!' : 'Share'}</span>
                  </button>
                </div>

                <h2 className="font-sans text-xl sm:text-2xl font-bold text-stone-950 leading-tight">
                  {selectedProduct.title}
                </h2>
              </div>

              {/* Primary Large Image with Hover Zoom & Click to Fullscreen */}
              <div 
                className="relative aspect-4/5 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-inner group cursor-pointer select-none"
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
                onClick={() => setIsLightboxOpen(true)}
                title="Click to view full screen"
              >
                <img
                  src={selectedProduct.images?.[activeImageIdx] || selectedProduct?.images?.[0] || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80'}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover transition-transform duration-100 ease-out pointer-events-none"
                  style={
                    isZooming
                      ? {
                          transform: 'scale(2.2)',
                          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        }
                      : {
                          transform: 'scale(1)',
                          transformOrigin: 'center center',
                        }
                  }
                />
                
                {/* Previous / Next buttons if multiple images */}
                {selectedProduct?.images?.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx(prev => (prev === 0 ? selectedProduct?.images?.length - 1 : prev - 1));
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-stone-800 rounded-full shadow-md backdrop-blur-xs transition-all z-20 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx(prev => (prev === selectedProduct?.images?.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white text-stone-800 rounded-full shadow-md backdrop-blur-xs transition-all z-20 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Status Badge (Only when sold out) */}
                {isSold && (
                  <div className="absolute top-3 left-3 z-20 pointer-events-none">
                    <span className="px-3 py-1 bg-rose-800 text-white font-bold text-xs rounded-lg uppercase tracking-wider shadow-md font-sans">
                      Archived / Sold Out
                    </span>
                  </div>
                )}

                {/* Zoom & Fullscreen Hint Indicator */}
                <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
                  <span className="px-2.5 py-1 bg-stone-900/85 backdrop-blur-xs text-amber-100 text-[11px] font-sans font-medium rounded-lg flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="w-3 h-3 text-amber-400" />
                    <span>{isZooming ? 'Click for Fullscreen' : 'Hover to Zoom • Click Fullscreen'}</span>
                  </span>
                </div>
              </div>

              {/* Thumbnail selector */}
              {selectedProduct?.images?.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {selectedProduct.images?.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIdx === idx ? 'border-amber-800 shadow-xs scale-102' : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* MOBILE ONLY: Price Block Above Seller Profile */}
              <div className="block lg:hidden">
                <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-sans text-2xl sm:text-3xl font-bold text-stone-950">
                        ₱{selectedProduct.price?.toLocaleString()}
                      </span>
                      {selectedProduct.isOnSale && selectedProduct.regularPrice && (
                        <span className="text-base text-rose-700 font-semibold line-through font-sans">
                          ₱{selectedProduct.regularPrice?.toLocaleString()}
                        </span>
                      )}
                      {selectedProduct.isOnSale && (
                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded uppercase tracking-wider font-sans">
                          {selectedProduct.regularPrice && selectedProduct.regularPrice > selectedProduct.price
                            ? `${Math.round(((selectedProduct.regularPrice - selectedProduct.price) / selectedProduct.regularPrice) * 100)}% OFF`
                            : 'On Sale'}
                        </span>
                      )}
                    </div>
                    {selectedProduct.originalRetailEstimate && (
                      <span className="text-xs text-stone-500 font-sans font-medium mt-1">
                        Est. Original Retail: ₱{selectedProduct.originalRetailEstimate?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Seller Boutique & Click to Filter */}
              <button
                type="button"
                id="seller-profile-filter-btn"
                onClick={handleSellerClick}
                className="w-full bg-white hover:bg-amber-50/70 p-4 rounded-xl border border-stone-200 hover:border-amber-300 flex items-center justify-between transition-all group cursor-pointer text-left shadow-2xs"
                title={`View all items from ${selectedProduct.sellerBoutique}`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={selectedProduct.sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                    alt={selectedProduct.sellerBoutique}
                    className="w-10 h-10 rounded-full object-cover border border-stone-300 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <p className="text-[10px] text-stone-500 font-sans font-semibold uppercase tracking-wider">Seller</p>
                    <p className="text-xs font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                      {selectedProduct.sellerBoutique}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 group-hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                  <Store className="w-3.5 h-3.5" />
                  <span>Visit →</span>
                </span>
              </button>

            </div>

            {/* Right Column: Garment Specs & Action */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* DESKTOP ONLY: Brand, Share & Unique Archive Badge and Title */}
              <div className="hidden lg:block">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-900 text-xs uppercase tracking-wider font-sans">
                      {selectedProduct.brand}
                    </span>
                    <span className="text-stone-300">•</span>
                    {/* Archive status badge moved above title */}
                    <span className={`text-[11px] font-sans px-2.5 py-0.5 rounded-full font-semibold border ${
                      isSold
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : selectedProduct.stock > 1
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50/90 text-amber-950 border-amber-300/80'
                    }`}>
                      {isSold
                        ? '✕ Sold Out (0 in stock)'
                        : selectedProduct.stock > 1
                        ? `${selectedProduct.stock} Pieces Available`
                        : '1 Piece Available'}
                    </span>
                  </div>

                  <button 
                    onClick={handleShare}
                    className="text-stone-500 hover:text-stone-900 flex items-center gap-1 text-[11px] font-sans cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copyFeedback ? 'Link Copied!' : 'Share'}</span>
                  </button>
                </div>

                <h2 className="font-sans text-2xl sm:text-3xl font-bold text-stone-950 leading-tight">
                  {selectedProduct.title}
                </h2>
              </div>

              {/* DESKTOP ONLY: Clean Price block */}
              <div className="hidden lg:block p-4 bg-white rounded-xl border border-stone-200">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-sans text-3xl font-bold text-stone-950">
                      ₱{selectedProduct.price?.toLocaleString()}
                    </span>
                    {selectedProduct.isOnSale && selectedProduct.regularPrice && (
                      <span className="text-base text-rose-700 font-semibold line-through font-sans">
                        ₱{selectedProduct.regularPrice?.toLocaleString()}
                      </span>
                    )}
                    {selectedProduct.isOnSale && (
                      <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded uppercase tracking-wider font-sans">
                        {selectedProduct.regularPrice && selectedProduct.regularPrice > selectedProduct.price
                          ? `${Math.round(((selectedProduct.regularPrice - selectedProduct.price) / selectedProduct.regularPrice) * 100)}% OFF`
                          : 'On Sale'}
                      </span>
                    )}
                  </div>
                  {selectedProduct.originalRetailEstimate && (
                    <span className="text-xs text-stone-500 font-sans font-medium mt-1">
                      Est. Original Retail: ₱{selectedProduct.originalRetailEstimate?.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Condition Transparency Box */}
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-bold uppercase text-amber-900 tracking-wider">
                    Item Condition:
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${conditionConfig.badgeColor}`}>
                    {selectedProduct.condition}
                  </span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed font-sans">
                  {selectedProduct.conditionNotes}
                </p>

                {/* Wear & Tear Checklist */}
                {selectedProduct.wearDetails?.length > 0 && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <p className="text-[11px] font-bold text-amber-950 mb-1 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 text-amber-700" /> Additional Item Note(s):
                    </p>
                    <ul className="space-y-1 text-[11px] text-stone-700 font-sans">
                      {selectedProduct.wearDetails?.map((detail, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Precise Measurements Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2 flex items-center gap-1.5 font-sans">
                  <Ruler className="w-3.5 h-3.5 text-stone-600" /> Item Measurement(s)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {selectedProduct.measurements?.chest && (
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-500 block uppercase font-sans font-medium">Pit to Pit (Chest)</span>
                      <span className="font-bold text-stone-900 font-sans">{selectedProduct.measurements?.chest}</span>
                    </div>
                  )}
                  {selectedProduct.measurements?.length && (
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-500 block uppercase font-sans font-medium">Back Length</span>
                      <span className="font-bold text-stone-900 font-sans">{selectedProduct.measurements?.length}</span>
                    </div>
                  )}
                  {selectedProduct.measurements?.shoulders && (
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-500 block uppercase font-sans font-medium">Shoulder Span</span>
                      <span className="font-bold text-stone-900 font-sans">{selectedProduct.measurements?.shoulders}</span>
                    </div>
                  )}
                  {selectedProduct.measurements?.waist && (
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-500 block uppercase font-sans font-medium">Waist</span>
                      <span className="font-bold text-stone-900 font-sans">{selectedProduct.measurements?.waist}</span>
                    </div>
                  )}
                  {selectedProduct.measurements?.inseam && (
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                      <span className="text-[10px] text-stone-500 block uppercase font-sans font-medium">Inseam</span>
                      <span className="font-bold text-stone-900 font-sans">{selectedProduct.measurements?.inseam}</span>
                    </div>
                  )}
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-500 block uppercase font-sans font-medium">Tagged Size</span>
                    <span className="font-bold text-stone-900 font-sans">{selectedProduct.size}</span>
                  </div>
                </div>
              </div>

              {/* Fabric Composition, Style, Color & Tags */}
              <div className="text-xs text-stone-600 space-y-2 font-sans bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                {selectedProduct.clothingType && (
                  <p><span className="font-semibold text-stone-900">Style:</span> {selectedProduct.clothingType}</p>
                )}
                {selectedProduct.color && (
                  <p><span className="font-semibold text-stone-900">Color / Wash:</span> {selectedProduct.color}</p>
                )}
                {selectedProduct.fabric && (
                  <p><span className="font-semibold text-stone-900">Fabric Composition:</span> {selectedProduct.fabric}</p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedProduct.tags?.map(tag => (
                    <span key={tag} className="text-[11px] font-sans font-medium bg-stone-200/80 px-2 py-0.5 rounded text-stone-700">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quantity Selector for Multi-Piece Stock */}
              {!isSold && !isOwnProduct && (selectedProduct.stock > 1) && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center justify-between font-sans">
                  <div>
                    <span className="text-xs font-bold text-stone-900 block">
                      {isInCart ? 'Adjust Quantity in Bag' : 'Purchase Quantity'}
                    </span>
                    <span className="text-[11px] text-stone-600">
                      {isInCart 
                        ? `Currently in bag: ${inCartItem?.quantity || 1} of ${selectedProduct.stock} pieces` 
                        : `${selectedProduct.stock} Pieces Available`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg p-1 shadow-2xs">
                    <button
                      type="button"
                      id="detail-decrease-qty-btn"
                      onClick={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                      disabled={selectedQuantity <= 1}
                      className="w-7 h-7 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-sans font-bold text-sm px-2 text-stone-900 min-w-[28px] text-center">
                      {selectedQuantity}
                    </span>
                    <button
                      type="button"
                      id="detail-increase-qty-btn"
                      onClick={() => setSelectedQuantity(q => Math.min(selectedProduct.stock, q + 1))}
                      disabled={selectedQuantity >= selectedProduct.stock}
                      className="w-7 h-7 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Add to Bag / Update Quantity Action Button */}
              <div className="pt-2 font-sans">
                {isSold ? (
                  <button
                    disabled
                    className="w-full py-3.5 bg-stone-200 text-stone-500 font-bold rounded-xl text-sm cursor-not-allowed text-center"
                  >
                    This Piece Has Been Sold (Sold Out)
                  </button>
                ) : isOwnProduct ? (
                  <div 
                    id="own-product-curator-notice"
                    className="w-full py-3.5 px-4 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl text-center shadow-xs"
                  >
                    <p className="text-xs font-medium font-sans">
                      You are the curator of this piece. Sellers cannot purchase their own listing.
                    </p>
                  </div>
                ) : isInCart ? (
                  isQtyChanged ? (
                    <button
                      id="modal-update-bag-qty-btn"
                      onClick={() => {
                        updateQuantity(selectedProduct.id, selectedQuantity);
                        setIsDetailModalOpen(false);
                        setIsCartDrawerOpen(true);
                      }}
                      className="w-full py-3.5 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 bg-stone-950 hover:bg-amber-950 text-amber-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>
                        Update Bag Quantity ({selectedQuantity} {selectedQuantity === 1 ? 'unit' : 'units'}) • ₱{(selectedProduct.price * selectedQuantity)?.toLocaleString()}
                      </span>
                    </button>
                  ) : (
                    <button
                      id="modal-view-bag-btn"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        setIsCartDrawerOpen(true);
                      }}
                      className="w-full py-3.5 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 bg-stone-950 hover:bg-amber-950 text-amber-50 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                      <span>
                        {selectedProduct.stock > 1 
                          ? `Already in Bag (${currentInCartQty} ${currentInCartQty === 1 ? 'piece' : 'pieces'}) • View Bag`
                          : 'Already in Bag • View Bag'}
                      </span>
                    </button>
                  )
                ) : (
                  <button
                    id="modal-add-to-bag-btn"
                    onClick={() => {
                      const res = addToCart(selectedProduct, selectedProduct.stock > 1 ? selectedQuantity : 1);
                      if (res.success) setIsDetailModalOpen(false);
                    }}
                    className="w-full py-3.5 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 bg-stone-950 hover:bg-amber-950 text-amber-50 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      Add to Vintage Bag • ₱{(selectedProduct.price * (selectedProduct.stock > 1 ? selectedQuantity : 1))?.toLocaleString()}
                      {selectedProduct.stock > 1 && selectedQuantity > 1 ? ` (${selectedQuantity} units)` : ''}
                    </span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Interactive Fullscreen Image Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-60 bg-stone-950/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 text-amber-50 animate-in fade-in duration-200 font-sans select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Control Bar */}
          <div 
            className="flex items-center justify-between z-10 bg-stone-900/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {selectedProduct?.images?.length > 1 && (
                <span className="text-xs text-amber-200/90 font-medium px-2.5 py-1 bg-stone-800 rounded-lg border border-stone-700">
                  Image {activeImageIdx + 1} of {selectedProduct?.images?.length}
                </span>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl border border-stone-700 transition-colors cursor-pointer"
              title="Close Fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Main High-Res Image */}
          <div 
            className="relative flex-1 flex items-center justify-center overflow-auto my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedProduct.images?.[activeImageIdx] || selectedProduct?.images?.[0] || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80'}
              alt={selectedProduct.title}
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {/* Left / Right Arrow Controls */}
            {selectedProduct?.images?.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx(prev => (prev === 0 ? selectedProduct?.images?.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full shadow-2xl border border-stone-700 transition-all cursor-pointer"
                  title="Previous Image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx(prev => (prev === selectedProduct?.images?.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full shadow-2xl border border-stone-700 transition-all cursor-pointer"
                  title="Next Image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Navigation & Thumbnails */}
          <div 
            className="flex items-center justify-center gap-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedProduct?.images?.length > 1 && (
              <div className="flex items-center gap-2 p-2 bg-stone-900/80 backdrop-blur-md rounded-2xl border border-stone-800 overflow-x-auto max-w-md">
                {selectedProduct.images?.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImageIdx === idx ? 'border-amber-400 scale-105' : 'border-stone-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

