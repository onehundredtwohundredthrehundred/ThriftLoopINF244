import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, FilterState } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockData';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { sanitizeFirestoreData } from '../lib/firestoreUtils';
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
  updateSellerProductsInfo: (sellerId: string, info: { sellerBoutique?: string; sellerName?: string; sellerAvatar?: string }) => Promise<void>;
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
  maxPrice: 50000,
  inStockOnly: false,
  sortBy: 'latest',
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('thriftloop_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map = new Map<string, Product>();
          parsed.forEach((p: Product) => {
            if (p && p.id && !map.has(p.id)) {
              map.set(p.id, p);
            }
          });
          return Array.from(map.values());
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

  // Auto-attribute initial items to current active seller's store if logged in as a seller
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'seller') return;

    const currentBoutique = currentUser.boutiqueName || `${currentUser.name}'s Boutique`;
    const defaultSellerIds = new Set(['user_seller_01', 'user_seller_02', 'curator']);
    
    // Check if there are default catalog products that can be assigned under current seller's boutique
    const hasDefaultSeedItems = products.some(p => defaultSellerIds.has(p.sellerId));

    if (hasDefaultSeedItems) {
      setProducts(prev =>
        prev.map(p => {
          if (defaultSellerIds.has(p.sellerId)) {
            return {
              ...p,
              sellerId: currentUser.id,
              sellerName: currentUser.name,
              sellerBoutique: currentBoutique,
              sellerAvatar: currentUser.avatar || p.sellerAvatar
            };
          }
          return p;
        })
      );

      // Also persist the updated products to Firestore
      products.forEach(p => {
        if (defaultSellerIds.has(p.sellerId)) {
          const updated = {
            ...p,
            sellerId: currentUser.id,
            sellerName: currentUser.name,
            sellerBoutique: currentBoutique,
            sellerAvatar: currentUser.avatar || p.sellerAvatar
          };
          updateDoc(doc(db, 'products', p.id), sanitizeFirestoreData(updated)).catch(err => {
            console.warn('Auto-assign product notice:', err);
          });
        }
      });
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.boutiqueName, products.length]);

  // Firestore Real-Time Listener and Initial Seeding
  useEffect(() => {
    const productsColRef = collection(db, 'products');

    const seedInitialData = async () => {
      try {
        const snap = await getDocs(productsColRef);
        if (snap.empty) {
          console.log('Seeding initial vintage vault collection to Firestore...');
          const batch = writeBatch(db);
          INITIAL_PRODUCTS.forEach((item) => {
            const docRef = doc(db, 'products', item.id);
            batch.set(docRef, item);
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore seeding check (using offline cache):', err);
      }
    };

    seedInitialData();

    const unsubscribe = onSnapshot(productsColRef, (snapshot) => {
      const map = new Map<string, Product>();
      snapshot.forEach((docSnap) => {
        if (!map.has(docSnap.id)) {
          map.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
        }
      });
      const loaded = Array.from(map.values());
      setProducts(loaded);
      localStorage.setItem('thriftloop_products', JSON.stringify(loaded));
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
      updateDoc(productRef, {
        viewsCount: increment(1)
      }).catch(err => console.log('View count sync notice:', err));
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

    // Seller isolation check: allow editing if currentUser matches sellerId OR boutiqueName OR is admin OR curator fallback
    if (currentUser && currentUser.role === 'seller') {
      const isOwner = !existing || currentUser.role === 'admin' || (
        existing.sellerId === currentUser.id ||
        (currentUser.boutiqueName && existing.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase()) ||
        existing.sellerId === 'curator' ||
        !existing.sellerId
      );
      if (existing && !isOwner) {
        console.warn('Security notice: Sellers cannot edit pieces from other boutiques');
        return;
      }
    }

    // Optimistic update + localStorage sync
    setProducts(prev => {
      const next = prev.map(p => (p.id === id ? { ...p, ...finalUpdates } : p));
      localStorage.setItem('thriftloop_products', JSON.stringify(next));
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
    // Seller isolation check: allow deletion if currentUser matches sellerId OR boutiqueName OR is admin OR curator fallback
    if (currentUser && currentUser.role === 'seller') {
      const existing = products.find(p => p.id === id);
      const isOwner = !existing || currentUser.role === 'admin' || (
        existing.sellerId === currentUser.id ||
        (currentUser.boutiqueName && existing.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase()) ||
        existing.sellerId === 'curator' ||
        !existing.sellerId
      );
      if (existing && !isOwner) {
        console.warn('Security notice: Sellers cannot delete pieces from other boutiques');
        return;
      }
    }

    // Optimistic deletion + localStorage sync
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem('thriftloop_products', JSON.stringify(next));
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
      if (item.price < filterState.minPrice || item.price > filterState.maxPrice) {
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
      // default: latest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [products, filterState]);

  const updateSellerProductsInfo = async (
    sellerId: string, 
    info: { sellerBoutique?: string; sellerName?: string; sellerAvatar?: string }
  ) => {
    if (selectedSellerInfo?.sellerId === sellerId || (currentUser && selectedSellerInfo?.sellerId === currentUser.id)) {
      setSelectedSellerInfo(prev => prev ? {
        ...prev,
        ...(info.sellerBoutique && { sellerBoutique: info.sellerBoutique }),
        ...(info.sellerName && { sellerName: info.sellerName }),
        ...(info.sellerAvatar && { sellerAvatar: info.sellerAvatar }),
      } : null);
    }
    setProducts(prev =>
      prev.map(p => {
        if (p.sellerId === sellerId || (currentUser && p.sellerId === currentUser.id)) {
          return {
            ...p,
            ...(info.sellerBoutique && { sellerBoutique: info.sellerBoutique }),
            ...(info.sellerName && { sellerName: info.sellerName }),
            ...(info.sellerAvatar && { sellerAvatar: info.sellerAvatar }),
          };
        }
        return p;
      })
    );

    try {
      const batch = writeBatch(db);
      let count = 0;
      products.forEach(p => {
        if (p.sellerId === sellerId || (currentUser && p.sellerId === currentUser.id)) {
          const docRef = doc(db, 'products', p.id);
          batch.update(docRef, sanitizeFirestoreData({
            ...(info.sellerBoutique && { sellerBoutique: info.sellerBoutique }),
            ...(info.sellerName && { sellerName: info.sellerName }),
            ...(info.sellerAvatar && { sellerAvatar: info.sellerAvatar }),
          }));
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.warn('Error updating seller products batch:', e);
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
