import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, FilterState } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockData';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { sanitizeFirestoreData } from '../lib/firestoreUtils';
import { safeLocalStorageGet, cacheProductsSafely } from '../lib/storage';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  increment,
  writeBatch 
} from 'firebase/firestore';

export interface SellerInfo {
  sellerId: string;
  sellerBoutique: string;
  sellerName?: string;
  sellerAvatar?: string;
  sellerBio?: string;
}

interface InventoryContextType {
  products: Product[];
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredProducts: Product[];
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'viewsCount'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  markAsSold: (id: string) => Promise<void>;
  decrementStock: (id: string, quantity?: number) => Promise<void>;
  resetFilters: () => void;
  isAddProductOpen: boolean;
  setIsAddProductOpen: (open: boolean) => void;
  isPrintReportOpen: boolean;
  setIsPrintReportOpen: (open: boolean) => void;
  isStoreProfileModalOpen: boolean;
  setIsStoreProfileModalOpen: (open: boolean) => void;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (open: boolean) => void;
  openProductDetail: (product: Product) => void;
  selectedSellerInfo: SellerInfo | null;
  isSellerProfileOpen: boolean;
  openSellerProfile: (info: SellerInfo) => void;
  closeSellerProfile: () => void;
  updateSellerProductsInfo: (sellerId: string, info: { sellerBoutique?: string; sellerName?: string; sellerAvatar?: string }, previousBoutiqueName?: string) => Promise<void>;
  isLoadingInventory: boolean;
}

const defaultFilterState: FilterState = {
  searchQuery: '',
  categories: [],
  clothingType: 'All',
  sizes: [],
  color: 'All',
  conditions: [],
  eras: [],
  minPrice: 0,
  maxPrice: Infinity,
  inStockOnly: false,
  sortBy: 'latest',
  itemsPerPage: 20,
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = safeLocalStorageGet('thriftloop_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out generated auto items (tl_gen_prod_*) and update legacy seller info
          const valid = parsed.filter((p: Product) => p && p.id && !p.id.startsWith('tl_gen_prod_'));

          if (valid.length > 0) {
            const map = new Map<string, Product>();
            valid.forEach((p: Product) => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            INITIAL_PRODUCTS.forEach(p => {
              if (!map.has(p.id)) map.set(p.id, p);
            });
            return Array.from(map.values());
          }
        }
      } catch (e) {
        return INITIAL_PRODUCTS;
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(true);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState<boolean>(false);
  const [isStoreProfileModalOpen, setIsStoreProfileModalOpen] = useState<boolean>(false);
  const [selectedSellerInfo, setSelectedSellerInfo] = useState<SellerInfo | null>(null);
  const [isSellerProfileOpen, setIsSellerProfileOpen] = useState<boolean>(false);

  const openSellerProfile = (info: SellerInfo) => {
    setSelectedSellerInfo(info);
    setIsSellerProfileOpen(true);
  };

  const closeSellerProfile = () => {
    setIsSellerProfileOpen(false);
  };

  // Firestore Real-Time Listener and Initial Seeding
  useEffect(() => {
    const productsColRef = collection(db, 'products');

    const seedInitialData = async () => {
      try {
        const snap = await getDocs(productsColRef);
        if (snap.empty) {
          console.log('Seeding initial vintage vault collection to Firestore...');
          const chunkSize = 400;
          for (let i = 0; i < INITIAL_PRODUCTS.length; i += chunkSize) {
            const chunk = INITIAL_PRODUCTS.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach(item => {
              const docRef = doc(db, 'products', item.id);
              batch.set(docRef, sanitizeFirestoreData(item), { merge: true });
            });
            await batch.commit();
          }
        }
      } catch (err) {
        console.warn('Firestore seeding check (using offline cache):', err);
      }
    };

    seedInitialData();

    const unsubscribe = onSnapshot(productsColRef, (snapshot) => {
      const map = new Map<string, Product>();
      snapshot.forEach((docSnap) => {
        // Exclude generated items (tl_gen_prod_*) if any exist in DB
        if (!docSnap.id.startsWith('tl_gen_prod_') && !map.has(docSnap.id)) {
          map.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
        }
      });
      // Ensure initial base products are available
      INITIAL_PRODUCTS.forEach(item => {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      });
      const loaded = Array.from(map.values()).filter(p => !p.id.startsWith('tl_gen_prod_'));
      setProducts(loaded);
      cacheProductsSafely(loaded);
      setIsLoadingInventory(false);
    }, (error) => {
      console.warn('Firestore products listener fallback to local state:', error);
      setIsLoadingInventory(false);
    });

    return () => unsubscribe();
  }, []);

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
    setIsSellerProfileOpen(false);

    // Optimistic local update
    setProducts(prev =>
      prev.map(p => (p.id === product.id ? { ...p, viewsCount: (p.viewsCount || 0) + 1 } : p))
    );

    // Firestore increment views count
    try {
      const productRef = doc(db, 'products', product.id);
      setDoc(productRef, {
        viewsCount: increment(1)
      }, { merge: true }).catch(err => console.log('View count sync notice:', err));
    } catch (e) {
      // Non-blocking
    }
  };

  const addProduct = async (newProdData: Omit<Product, 'id' | 'createdAt' | 'viewsCount'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: `tl_prod_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      viewsCount: 1,
    };

    // Optimistic local update
    setProducts(prev => {
      if (prev.some(p => p.id === newProduct.id)) return prev;
      return [newProduct, ...prev];
    });
    setIsAddProductOpen(false);

    try {
      await setDoc(doc(db, 'products', newProduct.id), sanitizeFirestoreData(newProduct));
    } catch (err: any) {
      console.error('Error adding product to Firestore:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        alert('⚠️ Firestore Security Rules Blocked Product Upload!\n\nTo fix this: Go to your Firebase Console > Firestore Database > Rules, and update them to:\n\nmatch /{document=**} {\n  allow read, write: if request.auth != null;\n}');
      }
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const existing = products.find(p => p.id === id);
    let finalUpdates = { ...updates };
    
    // Auto-remove sale and update status if stock is 0 or status is sold
    if (existing) {
      const resolvedStock = finalUpdates.stock !== undefined ? finalUpdates.stock : existing.stock;
      const resolvedStatus = finalUpdates.status !== undefined ? finalUpdates.status : existing.status;
      
      if (resolvedStock <= 0 || resolvedStatus === 'sold') {
        if (existing.isOnSale) {
          finalUpdates.isOnSale = false;
          finalUpdates.price = existing.regularPrice || existing.price;
        }
        if (resolvedStock <= 0 && finalUpdates.status === undefined) {
          finalUpdates.status = 'sold';
        }
      }
    }

    // Seller isolation check: allow editing if currentUser matches sellerId OR is admin OR unassigned
    if (currentUser && currentUser.role === 'seller') {
      const isOwner = !existing || (currentUser.role as string) === 'admin' || (
        existing.sellerId === currentUser.id ||
        (!existing.sellerId && currentUser.boutiqueName && existing.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase())
      );
      if (existing && !isOwner) {
        console.warn('Security notice: Sellers cannot edit pieces from other boutiques');
        return;
      }
    }

    // Optimistic update + localStorage sync
    setProducts(prev => {
      const next = prev.map(p => (p.id === id ? { ...p, ...finalUpdates } : p));
      cacheProductsSafely(next);
      return next;
    });
    if (selectedProduct && selectedProduct.id === id) {
      setSelectedProduct(prev => (prev ? { ...prev, ...finalUpdates } : null));
    }

    try {
      await updateDoc(doc(db, 'products', id), sanitizeFirestoreData(finalUpdates));
    } catch (err) {
      console.error('Error updating product in Firestore:', err);
    }
  };

  const deleteProduct = async (id: string) => {
    // Seller isolation check: allow deletion if currentUser matches sellerId OR is admin OR unassigned
    if (currentUser && currentUser.role === 'seller') {
      const existing = products.find(p => p.id === id);
      const isOwner = !existing || (currentUser.role as string) === 'admin' || (
        existing.sellerId === currentUser.id ||
        (!existing.sellerId && currentUser.boutiqueName && existing.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase())
      );
      if (existing && !isOwner) {
        console.warn('Security notice: Sellers cannot delete pieces from other boutiques');
        return;
      }
    }

    // Optimistic deletion + localStorage sync
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      cacheProductsSafely(next);
      return next;
    });

    if (selectedProduct && selectedProduct.id === id) {
      setSelectedProduct(null);
      setIsDetailModalOpen(false);
    }

    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      console.error('Error deleting product from Firestore:', err);
    }
  };

  const markAsSold = async (id: string) => {
    const existing = products.find(p => p.id === id);
    const updates: Partial<Product> = { status: 'sold', stock: 0 };
    if (existing && existing.isOnSale) {
      updates.isOnSale = false;
      updates.price = existing.regularPrice || existing.price;
    }

    // Optimistic update
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      await updateDoc(doc(db, 'products', id), sanitizeFirestoreData(updates));
    } catch (err) {
      console.error('Error marking product sold in Firestore:', err);
    }
  };

  const decrementStock = async (id: string, quantity: number = 1) => {
    let updatedProduct: Product | undefined;

    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const currentStock = p.stock !== undefined ? p.stock : 1;
          const newStock = Math.max(0, currentStock - quantity);
          const newStatus = newStock === 0 ? 'sold' : 'available';
          updatedProduct = { ...p, stock: newStock, status: newStatus };
          return updatedProduct;
        }
        return p;
      })
    );

    if (updatedProduct) {
      try {
        await updateDoc(doc(db, 'products', id), {
          stock: updatedProduct.stock,
          status: updatedProduct.status,
        });
      } catch (err: any) {
        console.error('Error decrementing product stock in Firestore:', err);
        if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
          alert('⚠️ Firestore Security Rules Blocked Stock Update!\n\nTo fix this: Go to your Firebase Console > Firestore Database > Rules, and update them to:\n\nmatch /{document=**} {\n  allow read, write: if request.auth != null;\n}');
        }
      }
    }
  };

  const resetFilters = () => {
    setFilterState(defaultFilterState);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(item => {
      // search query
      if (filterState.searchQuery.trim()) {
        const terms = filterState.searchQuery.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
        
        if (terms.length > 0) {
          const itemText = [
            item.title,
            item.brand,
            item.category,
            ...item.tags,
            item.color,
            item.sellerBoutique,
            item.sellerName,
            item.sellerId
          ].filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

          // Check if every comma-separated term matches something in the item
          const matchesAllTerms = terms.every(term => itemText.includes(term));
          
          if (!matchesAllTerms) {
            return false;
          }
        }
      }

      // categories (multiple)
      if (filterState.categories && filterState.categories.length > 0 && !filterState.categories.includes(item.category)) {
        return false;
      }

      // eras (multiple)
      if (filterState.eras && filterState.eras.length > 0 && !filterState.eras.includes(item.era)) {
        return false;
      }

      // sizes (multiple)
      if (filterState.sizes && filterState.sizes.length > 0 && !filterState.sizes.includes(item.size)) {
        return false;
      }

      // conditions (multiple)
      if (filterState.conditions && filterState.conditions.length > 0 && !filterState.conditions.includes(item.condition)) {
        return false;
      }

      // price
      if (filterState.minPrice > 0 && item.price < filterState.minPrice) {
        return false;
      }
      if (
        filterState.maxPrice !== undefined && 
        filterState.maxPrice !== null && 
        filterState.maxPrice !== Infinity && 
        filterState.maxPrice > 0 && 
        item.price > filterState.maxPrice
      ) {
        return false;
      }

      // in stock
      if (filterState.inStockOnly && (item.status === 'sold' || item.stock <= 0)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const aSold = a.status === 'sold' || a.stock <= 0;
      const bSold = b.status === 'sold' || b.stock <= 0;

      if (filterState.sortBy === 'sold_first') {
        if (aSold !== bSold) {
          return aSold ? -1 : 1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (aSold !== bSold) {
        return aSold ? 1 : -1;
      }
      if (filterState.sortBy === 'price_low') return a.price - b.price;
      if (filterState.sortBy === 'price_high') return b.price - a.price;
      if (filterState.sortBy === 'rarity') return (b.viewsCount || 0) - (a.viewsCount || 0);
      if (filterState.sortBy === 'least_viewed') return (a.viewsCount || 0) - (b.viewsCount || 0);
      // default: latest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [products, filterState]);

  const updateSellerProductsInfo = async (
    sellerId: string, 
    info: { sellerBoutique?: string; sellerName?: string; sellerAvatar?: string },
    previousBoutiqueName?: string
  ) => {
    if (selectedSellerInfo?.sellerId === sellerId || (currentUser && selectedSellerInfo?.sellerId === currentUser.id)) {
      setSelectedSellerInfo(prev => prev ? {
        ...prev,
        ...(info.sellerBoutique && { sellerBoutique: info.sellerBoutique }),
        ...(info.sellerName && { sellerName: info.sellerName }),
        ...(info.sellerAvatar && { sellerAvatar: info.sellerAvatar }),
      } : null);
    }

    const defaultSellerIds = new Set(['user_seller_01', 'user_seller_02', 'curator']);
    const isMatchingSellerItem = (p: Product) => {
      if (p.sellerId === sellerId) return true;
      if (currentUser && p.sellerId === currentUser.id) return true;
      if (previousBoutiqueName && p.sellerBoutique?.toLowerCase() === previousBoutiqueName.toLowerCase()) return true;
      if (currentUser?.boutiqueName && p.sellerBoutique?.toLowerCase() === currentUser.boutiqueName.toLowerCase()) return true;
      if (currentUser?.role === 'seller' && defaultSellerIds.has(p.sellerId)) return true;
      return false;
    };

    setProducts(prev => {
      const next = prev.map(p => {
        if (isMatchingSellerItem(p)) {
          return {
            ...p,
            sellerId: currentUser?.id || p.sellerId,
            ...(info.sellerBoutique && { sellerBoutique: info.sellerBoutique }),
            ...(info.sellerName && { sellerName: info.sellerName }),
            ...(info.sellerAvatar && { sellerAvatar: info.sellerAvatar }),
          };
        }
        return p;
      });
      cacheProductsSafely(next);
      return next;
    });

    setSelectedProduct(prev => {
      if (prev && isMatchingSellerItem(prev)) {
        return {
          ...prev,
          sellerId: currentUser?.id || prev.sellerId,
          ...(info.sellerBoutique && { sellerBoutique: info.sellerBoutique }),
          ...(info.sellerName && { sellerName: info.sellerName }),
          ...(info.sellerAvatar && { sellerAvatar: info.sellerAvatar }),
        };
      }
      return prev;
    });

    try {
      const itemsToUpdate = products.filter(isMatchingSellerItem);
      const chunkSize = 400;
      for (let i = 0; i < itemsToUpdate.length; i += chunkSize) {
        const chunk = itemsToUpdate.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(p => {
          const docRef = doc(db, 'products', p.id);
          batch.update(docRef, sanitizeFirestoreData({
            sellerId: currentUser?.id || p.sellerId,
            ...(info.sellerBoutique && { sellerBoutique: info.sellerBoutique }),
            ...(info.sellerName && { sellerName: info.sellerName }),
            ...(info.sellerAvatar && { sellerAvatar: info.sellerAvatar }),
          }));
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Error updating seller products batch in Firestore:', e);
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        products,
        filterState,
        setFilterState,
        filteredProducts,
        selectedProduct,
        setSelectedProduct,
        addProduct,
        updateProduct,
        deleteProduct,
        markAsSold,
        decrementStock,
        resetFilters,
        isAddProductOpen,
        setIsAddProductOpen,
        isPrintReportOpen,
        setIsPrintReportOpen,
        isStoreProfileModalOpen,
        setIsStoreProfileModalOpen,
        isDetailModalOpen,
        setIsDetailModalOpen,
        openProductDetail,
        selectedSellerInfo,
        isSellerProfileOpen,
        openSellerProfile,
        closeSellerProfile,
        updateSellerProductsInfo,
        isLoadingInventory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
