import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { CONDITIONS } from '../data/mockData';
import { ShoppingBag, Check, Tag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, cart } = useCart();
  const { openProductDetail, openSellerProfile } = useInventory();
  const { currentUser } = useAuth();

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered || !product.images || product?.images?.length <= 1) {
      setActiveImgIdx(0);
      return;
    }

    const interval = setInterval(() => {
      setActiveImgIdx((prev) => (prev + 1) % product?.images?.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isHovered, product.images]);

  const conditionConfig = CONDITIONS.find(c => c.grade === product.condition) || CONDITIONS[1];
  const isInCart = cart.some(item => item.product.id === product.id);
  const isSold = product.status === 'sold' || product.stock <= 0;
  const isOwnProduct = !!currentUser && (currentUser.id === product.sellerId || (currentUser.role === 'seller' && currentUser.boutiqueName === product.sellerBoutique));

  return (
    <div 
      id={`product-card-${product.id}`}
      className="group bg-white rounded-xl border border-stone-200/90 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
    >
      <div>
        {/* Image Container with Hover Slideshow & Badges */}
        <div 
          className="relative aspect-4/5 overflow-hidden bg-stone-100 cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setActiveImgIdx(0);
          }}
          onClick={() => openProductDetail(product)}
        >
          <img
            src={product.images?.[activeImgIdx] || product?.images?.[0] || 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80'}
            alt={product.title}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isHovered ? 'scale-105' : 'scale-100'
            } ${isSold ? 'grayscale contrast-125 opacity-70' : ''}`}
            loading="lazy"
          />

          {/* Sold & Sale Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
            {product.isOnSale && !isSold && (() => {
              const pctOff = product.regularPrice && product.regularPrice > product.price
                ? Math.round(((product.regularPrice - product.price) / product.regularPrice) * 100)
                : 0;
              return (
                <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-xs flex items-center gap-1 font-sans">
                  <Tag className="w-2.5 h-2.5" />
                  {pctOff > 0 ? `${pctOff}% OFF` : 'On Sale'}
                </span>
              );
            })()}
            {isSold && (
              <span className="px-2 py-0.5 bg-rose-800 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-xs font-sans">
                Archived / Sold
              </span>
            )}
          </div>

          {/* Size Pill */}
          <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
            <span className="px-2 py-0.5 bg-white/95 backdrop-blur-xs text-stone-900 text-[11px] font-bold rounded border border-stone-200 shadow-xs">
              Size {product.size}
            </span>
          </div>

          {/* Multi-image indicators if applicable */}
          {product?.images?.length > 1 && (
            <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1 z-10 pointer-events-none">
              {product.images?.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeImgIdx === idx 
                      ? 'w-4 bg-amber-300 shadow-sm' 
                      : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4">
          
          {/* Brand and Boutique Origin */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium mb-1">
            <span className="text-amber-900 font-bold uppercase tracking-wider truncate">
              {product.brand}
            </span>
            <span 
              onClick={(e) => {
                e.stopPropagation();
                openSellerProfile({
                  sellerId: product.sellerId,
                  sellerBoutique: product.sellerBoutique,
                  sellerName: product.sellerName,
                  sellerAvatar: product.sellerAvatar,
                });
              }}
              className="truncate max-w-[120px] text-stone-500 hover:text-amber-900 font-semibold hover:underline cursor-pointer transition-colors"
              title={`View Curator Profile for ${product.sellerBoutique}`}
            >
              {product.sellerBoutique}
            </span>
          </div>

          {/* Title */}
          <h3 
            onClick={() => openProductDetail(product)}
            className="font-sans font-medium text-stone-900 text-sm leading-snug line-clamp-2 hover:text-amber-800 cursor-pointer transition-colors mb-2.5 h-10"
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Condition Tag & Vintage Era */}
          <div className="mb-3 flex flex-col gap-1 items-start">
            <span 
              className={`inline-flex items-center gap-1 text-[10px] font-sans font-semibold px-2 py-0.5 rounded border ${conditionConfig.badgeColor}`}
              title={product.conditionNotes}
            >
              <Tag className="w-3 h-3 text-stone-500 shrink-0" />
              <span className="truncate">{product.condition}</span>
            </span>
            <span className="inline-block text-[10px] font-sans font-medium text-amber-100 bg-stone-900/85 backdrop-blur-xs px-2 py-0.5 rounded shadow-sm">
              {product.era} Vintage
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Price & Action */}
      <div className="px-4 pb-4 pt-2 border-t border-stone-100 flex items-center justify-between mt-auto">
        <div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-lg font-bold text-stone-950">
                ₱{product.price?.toLocaleString()}
              </span>
              {product.isOnSale && product.regularPrice && (
                <span className="font-sans text-xs text-rose-700 font-semibold line-through">
                  ₱{product.regularPrice?.toLocaleString()}
                </span>
              )}
            </div>
            {product.originalRetailEstimate && (
              <span className="font-sans text-[11px] text-stone-500 font-medium leading-snug">
                Est. Original: ₱{product.originalRetailEstimate?.toLocaleString()}
              </span>
            )}
          </div>
          {isSold ? (
            <span className="text-[10px] text-rose-600 block font-sans font-medium mt-0.5">Sold Out</span>
          ) : product.stock > 1 ? (
            <span className="text-[10px] text-emerald-700 block font-sans font-medium mt-0.5">{product.stock} Pieces Available</span>
          ) : (
            <span className="text-[10px] text-stone-500 block font-sans mt-0.5">1 Piece Available</span>
          )}
        </div>

        {isSold ? (
          <button
            disabled
            className="px-3 py-1.5 bg-stone-100 text-stone-400 text-xs font-semibold rounded-lg cursor-not-allowed font-sans"
          >
            Sold Out
          </button>
        ) : isOwnProduct ? (
          <span 
            id={`own-vault-item-badge-${product.id}`}
            className="px-2.5 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg font-sans"
            title="You are the seller of this item"
          >
            Your Item
          </span>
        ) : (
          <button
            id={`add-to-cart-btn-${product.id}`}
            onClick={() => addToCart(product)}
            disabled={isInCart}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              isInCart
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-stone-900 hover:bg-amber-900 text-amber-50 shadow-xs'
            }`}
          >
            {isInCart ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>In Bag</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
