import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  ShieldCheck,
  Store,
  Tag,
  Ruler,
  Scissors,
  Sparkles,
  Eye,
  Check,
  AlertCircle,
  Truck,
  Plus,
  Minus,
  Maximize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

export const ProductDetailModal: React.FC = () => {
  const { isDetailModalOpen, setIsDetailModalOpen, selectedProduct, openSellerProfile } = useInventory();
  const { addToCart, cart } = useCart();
  const { currentUser } = useAuth();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [addedSuccessToast, setAddedSuccessToast] = useState(false);

  useBodyScrollLock(isDetailModalOpen || isLightboxOpen);

  if (!isDetailModalOpen || !selectedProduct) return null;

  const isSold = selectedProduct.status === 'sold' || (selectedProduct.stock ?? 1) <= 0;

  const existingCartItem = cart.find(i => i.product.id === selectedProduct.id);
  const qtyInCart = existingCartItem ? (existingCartItem.quantity || 1) : 0;
  const remainingStock = Math.max(0, (selectedProduct.stock ?? 1) - qtyInCart);

  const isMyOwnProduct = currentUser && currentUser.role === 'seller' && (
    selectedProduct.sellerId === currentUser.id ||
    (currentUser.boutiqueName && selectedProduct.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase())
  );

  const handleAddToCart = () => {
    if (isSold || remainingStock <= 0 || isMyOwnProduct) return;
    addToCart(selectedProduct, selectedQuantity);
    setAddedSuccessToast(true);
    setTimeout(() => {
      setAddedSuccessToast(false);
    }, 2500);
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 p-4 sm:p-8 max-h-[85vh] overflow-y-auto">
            <div className="lg:col-span-6 space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 group">
                <img
                  src={selectedProduct.images?.[activeImageIdx] || selectedProduct.images?.[0]}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-3 right-3 p-2 bg-stone-900/80 hover:bg-stone-900 text-white rounded-xl backdrop-blur-xs transition-colors shadow-md cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Inspect</span>
                </button>

                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIdx(prev => prev === 0 ? selectedProduct.images.length - 1 : prev - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-900/70 text-white hover:bg-stone-900 transition-colors shadow-md"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveImageIdx(prev => prev === selectedProduct.images.length - 1 ? 0 : prev + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-stone-900/70 text-white hover:bg-stone-900 transition-colors shadow-md"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {selectedProduct.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIdx === idx ? 'border-amber-900 scale-105 shadow-sm' : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-900 text-xs uppercase tracking-wider font-sans">
                      {selectedProduct.brand}
                    </span>
                    <span className="text-stone-300">•</span>
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        openSellerProfile({
                          sellerId: selectedProduct.sellerId,
                          sellerBoutique: selectedProduct.sellerBoutique,
                          sellerName: selectedProduct.sellerName,
                          sellerAvatar: selectedProduct.sellerAvatar,
                        });
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-amber-900 bg-stone-100 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-colors border border-stone-200"
                    >
                      <Store className="w-3.5 h-3.5 text-amber-800" />
                      <span>{selectedProduct.sellerBoutique}</span>
                    </button>
                  </div>

                  <span className="px-2.5 py-0.5 bg-stone-100 text-stone-700 font-bold text-[11px] rounded-full border border-stone-200">
                    {selectedProduct.condition} Condition
                  </span>
                </div>

                <h1 className="font-sans text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-tight">
                  {selectedProduct.title}
                </h1>

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="font-sans text-3xl font-extrabold text-amber-950">
                    ₱{selectedProduct.price.toLocaleString()}
                  </span>
                  {selectedProduct.regularPrice && selectedProduct.regularPrice > selectedProduct.price && (
                    <span className="text-base text-stone-400 line-through font-medium">
                      ₱{selectedProduct.regularPrice.toLocaleString()}
                    </span>
                  )}
                </div>

                {selectedProduct.conditionNotes && (
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans pt-2 border-t border-stone-200/80">
                    {selectedProduct.conditionNotes}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-sans">
                  <div className="bg-stone-100/80 p-3 rounded-xl border border-stone-200/80">
                    <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block mb-0.5">Size</span>
                    <span className="font-bold text-stone-900 text-sm">{selectedProduct.size}</span>
                  </div>
                  <div className="bg-stone-100/80 p-3 rounded-xl border border-stone-200/80">
                    <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block mb-0.5">Category</span>
                    <span className="font-bold text-stone-900 text-sm">{selectedProduct.category}</span>
                  </div>
                </div>

                {selectedProduct.measurements && (
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60 text-xs font-sans space-y-1">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Ruler className="w-3.5 h-3.5 text-amber-800" />
                      Garment Measurements
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-stone-700">
                      {Object.entries(selectedProduct.measurements).map(([key, val]) => (
                        <div key={key}>
                          <span className="capitalize text-stone-500 text-[10px]">{key}: </span>
                          <span className="font-bold text-stone-900">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-stone-200">
                {isMyOwnProduct ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                    <span>This item belongs to your boutique vault.</span>
                  </div>
                ) : isSold ? (
                  <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-600 text-xs font-bold text-center uppercase tracking-wider">
                    Item Sold Out
                  </div>
                ) : (
                  <>
                    {(selectedProduct.stock ?? 1) > 1 && (
                      <div className="flex items-center justify-between bg-stone-100/80 p-2.5 rounded-xl border border-stone-200 text-xs font-sans">
                        <span className="font-bold text-stone-800">Quantity</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedQuantity(prev => Math.max(1, prev - 1))}
                            disabled={selectedQuantity <= 1}
                            className="w-7 h-7 bg-white hover:bg-stone-200 border border-stone-300 rounded-lg flex items-center justify-center font-bold text-stone-800 disabled:opacity-40"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-extrabold text-stone-900 w-6 text-center">{selectedQuantity}</span>
                          <button
                            onClick={() => setSelectedQuantity(prev => Math.min(remainingStock, prev + 1))}
                            disabled={selectedQuantity >= remainingStock}
                            className="w-7 h-7 bg-white hover:bg-stone-200 border border-stone-300 rounded-lg flex items-center justify-center font-bold text-stone-800 disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {addedSuccessToast && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>Added to your Vintage Bag!</span>
                      </div>
                    )}

                    <button
                      onClick={handleAddToCart}
                      disabled={remainingStock <= 0}
                      className="w-full py-3.5 bg-stone-900 hover:bg-amber-950 disabled:bg-stone-300 text-amber-50 font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        {remainingStock <= 0 ? 'All Units In Bag' : 'Add to Vintage Bag'}
                        {(selectedProduct.stock ?? 1) > 1 && selectedQuantity > 1 ? ` (${selectedQuantity} units)` : ''}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-60 bg-stone-950/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 text-amber-50 animate-in fade-in duration-200 font-sans select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
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

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl border border-stone-700 transition-colors cursor-pointer"
              title="Close Fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="relative flex-1 flex items-center justify-center overflow-auto my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedProduct.images?.[activeImageIdx] || selectedProduct?.images?.[0]}
              alt={selectedProduct.title}
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {selectedProduct?.images?.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx(prev => (prev === 0 ? selectedProduct.images.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full shadow-2xl border border-stone-700 transition-all cursor-pointer"
                  title="Previous Image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIdx(prev => (prev === selectedProduct.images.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-stone-900/80 hover:bg-stone-800 text-white rounded-full shadow-2xl border border-stone-700 transition-all cursor-pointer"
                  title="Next Image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          <div
            className="flex items-center justify-center gap-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedProduct?.images?.length > 1 && (
              <div className="flex items-center gap-2 p-2 bg-stone-900/80 backdrop-blur-md rounded-2xl border border-stone-800 overflow-x-auto max-w-md">
                {selectedProduct.images.map((img, idx) => (
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
