import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Order, CourierInfo } from '../types';
import { INITIAL_ORDERS } from '../data/mockData';
import { useInventory } from './InventoryContext';
import { useAuth } from './AuthContext';
import { auth, db } from '../lib/firebase';
import { sanitizeFirestoreData } from '../lib/firestoreUtils';
import { collection, doc, onSnapshot, setDoc, getDocs, writeBatch } from 'firebase/firestore';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => { success: boolean; message: string };
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  discountCode: string;
  setDiscountCode: (code: string) => void;
  applyDiscountCode: () => { success: boolean; message: string };
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  orders: Order[];
  activeTrackingOrder: Order | null;
  setActiveTrackingOrder: (order: Order | null) => void;
  openOrderTracking: (orderId?: string) => void;
  closeOrderTracking: () => void;
  processCheckout: (checkoutData: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
        zipCode: string;
    paymentMethod: 'credit_card' | 'gcash' | 'maya' | 'paypal' | 'cod' | 'stripe_card';
    paymentIntentId?: string;
  }) => Promise<Order>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { markAsSold, decrementStock } = useInventory();
  const { currentUser, isLoadingAuth, openAuthModal } = useAuth();

  const isRemoteUpdateRef = React.useRef(false);
  const hasLoadedFromFirestoreRef = React.useRef<Record<string, boolean>>({});
  const prevUserIdRef = React.useRef<string | null>(null);
  const lastLocalUpdateRef = React.useRef<number>(0);

  const syncCartToFirestore = async (userId: string, updatedCart: CartItem[]) => {
    try {
      const timestamp = lastLocalUpdateRef.current || Date.now();
      await setDoc(doc(db, 'carts', userId), sanitizeFirestoreData({
        userId,
        items: updatedCart,
        updatedAt: new Date(timestamp).toISOString(),
        timestampMs: timestamp
      }));
    } catch (err) {
      console.error('Error syncing cart to Firestore:', err);
    }
  };

  // Synchronous initial active user detection to avoid missing cached cart on mount
  const getInitialUserId = () => {
    if (auth.currentUser?.uid) return auth.currentUser.uid;
    const cachedUser = localStorage.getItem('thriftloop_user');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed?.id) return parsed.id;
      } catch {}
    }
    return null;
  };

  const [cart, setCart] = useState<CartItem[]>(() => {
    const initialUserId = getInitialUserId();
    if (initialUserId) {
      const primaryKey = `thriftloop_cart_user_${initialUserId}`;
      const saved = localStorage.getItem(primaryKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any) => ({
              ...item,
              quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
            }));
          }
        } catch (e) {}
      }
    }
    return [];
  });

  // Real-time Firestore sync for logged-in users across tabs / browsers
  useEffect(() => {
    if (isLoadingAuth) return;

        const currentUserId = currentUser?.id ?? null;

    // Detect user change: clear cart state immediately to prevent stale data leaks.
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    if (prevUserId !== currentUserId) {
      setCart([]);
    }

    if (!currentUserId) {
      // Guest or logged out: cart is strictly empty and isolated
      setCart([]);
      return;
    }

    // Immediately load local account cart so there's no UI flash
    const userKey = `thriftloop_cart_user_${currentUserId}`;
    const localSaved = localStorage.getItem(userKey);
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed)) {
          setCart(parsed.map((item: any) => ({
            ...item,
            quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          })));
        }
      } catch {}
    } else {
      setCart([]);
    }

    const cartDocRef = doc(db, 'carts', currentUserId);
    const unsubscribe = onSnapshot(cartDocRef, (snapshot) => {
      // Ignore stale snapshots if the user has switched accounts
      if (prevUserIdRef.current !== currentUserId) return;

      hasLoadedFromFirestoreRef.current[currentUserId] = true;

      // Ignore local optimistic writes that are already updated in state
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      if (snapshot.exists()) {
        const data = snapshot.data();

        // If snapshot is older than our latest local user action (e.g. Clear all), ignore it!
        if (typeof data.timestampMs === 'number' && data.timestampMs < lastLocalUpdateRef.current) {
          return;
        }

        if (Array.isArray(data.items)) {
          isRemoteUpdateRef.current = true;
          const items = data.items.map((item: any) => ({
            ...item,
            quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          }));
          setCart(items);
          localStorage.setItem(`thriftloop_cart_user_${currentUserId}`, JSON.stringify(items));
        }
      } else {
        // Firestore doc doesn't exist yet: check fresh localStorage
        const userKey = `thriftloop_cart_user_${currentUserId}`;
        const currentSaved = localStorage.getItem(userKey);
        let initialItems: CartItem[] = [];
        if (currentSaved) {
          try {
            const parsed = JSON.parse(currentSaved);
            if (Array.isArray(parsed)) {
              initialItems = parsed;
            }
          } catch {}
        }
        syncCartToFirestore(currentUserId, initialItems);
      }
    }, (err) => {
      console.warn('Firestore cart subscription notice:', err);
    });

    return () => unsubscribe();
  }, [currentUser?.id, isLoadingAuth]);

    // Persist cart locally & sync to Firestore on user edits
  useEffect(() => {
    if (isLoadingAuth) return;

    const currentUserId = currentUser?.id ?? null;
    if (!currentUserId) {
      return;
    }

    // CRITICAL: Only persist cart if the cart state belongs to the current user.
    // Without this guard, Account A's items could be written to Account B's storage
    // during the account-switching render cycle.
    if (prevUserIdRef.current !== currentUserId) {
      return;
    }

    const key = `thriftloop_cart_user_${currentUserId}`;
    localStorage.setItem(key, JSON.stringify(cart));

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (hasLoadedFromFirestoreRef.current[currentUserId]) {
      syncCartToFirestore(currentUserId, cart);
    }
  }, [cart, currentUser?.id, isLoadingAuth]);

  // Sync cross-tab localStorage updates in same browser
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const currentUserId = currentUser?.id ?? null;
      if (!currentUserId) return;
      const activeKey = `thriftloop_cart_user_${currentUserId}`;
      if (e.key === activeKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            isRemoteUpdateRef.current = true;
            setCart(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser?.id]);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('thriftloop_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map = new Map<string, Order>();
          parsed.forEach((ord: Order) => {
            if (ord && ord.id && !map.has(ord.id)) {
              map.set(ord.id, ord);
            }
          });
          return Array.from(map.values());
        }
      } catch (e) {
        return INITIAL_ORDERS;
      }
    }
    return INITIAL_ORDERS;
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(0);

  // Firestore orders listener
  useEffect(() => {
    const ordersColRef = collection(db, 'orders');

    const seedInitialOrders = async () => {
      try {
        const snap = await getDocs(ordersColRef);
        if (snap.empty) {
          const batch = writeBatch(db);
          INITIAL_ORDERS.forEach((ord) => {
            batch.set(doc(db, 'orders', ord.id), ord);
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Orders seed notice:', err);
      }
    };

    seedInitialOrders();

    const unsubscribe = onSnapshot(ordersColRef, (snapshot) => {
      if (!snapshot.empty) {
        const map = new Map<string, Order>();
        snapshot.forEach((d) => {
          if (!map.has(d.id)) {
            map.set(d.id, { id: d.id, ...(d.data() as Omit<Order, 'id'>) });
          }
        });
        const loaded = Array.from(map.values());
        // sort by newest
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(loaded);
        localStorage.setItem('thriftloop_orders', JSON.stringify(loaded));
      }
    }, (error) => {
      console.warn('Firestore orders sync notice:', error);
    });

    return () => unsubscribe();
  }, []);


  const addToCart = (product: Product, quantity: number = 1): { success: boolean; message: string } => {
    if (!currentUser) {
      openAuthModal('login');
      return { success: false, message: 'Please sign in to add items to your bag.' };
    }

    if (product.status === 'sold' || (product.stock !== undefined && product.stock <= 0)) {
      return { success: false, message: 'This piece is out of stock.' };
    }

    // Block sellers from buying their own stock
    if (currentUser && (currentUser.id === product.sellerId || (currentUser.role === 'seller' && currentUser.boutiqueName === product.sellerBoutique))) {
      return { success: false, message: 'Sellers cannot purchase their own listed vault inventory.' };
    }

    const availableStock = product.stock !== undefined ? product.stock : 1;
    const requestedQty = Math.max(1, Math.min(availableStock, quantity));

    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    lastLocalUpdateRef.current = Date.now();
    if (existingIndex > -1) {
      const existingItem = cart[existingIndex];
      if (availableStock <= 1) {
        return { success: false, message: 'This 1-of-1 vintage piece is already in your bag.' };
      }
      
      const newTotalQty = Math.min(availableStock, (existingItem.quantity || 1) + requestedQty);
      if (newTotalQty === existingItem.quantity) {
        return { success: false, message: `Maximum available stock (${availableStock}) is already in your bag.` };
      }

      setCart(prev => prev.map((item, idx) => idx === existingIndex ? { ...item, quantity: newTotalQty } : item));
      setIsCartDrawerOpen(true);
      return { success: true, message: `Updated bag quantity to ${newTotalQty} units!` };
    }

    setCart(prev => [...prev, { product, quantity: requestedQty, addedAt: new Date().toISOString() }]);
    setIsCartDrawerOpen(true);
    return { success: true, message: `Added ${requestedQty > 1 ? requestedQty + ' items' : 'piece'} to your vintage bag!` };
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    lastLocalUpdateRef.current = Date.now();
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const maxStock = item.product.stock !== undefined ? item.product.stock : 1;
          const clampedQty = Math.min(maxStock, Math.max(1, newQuantity));
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    lastLocalUpdateRef.current = Date.now();
    setCart(prev => {
      const nextCart = prev.filter(item => item.product.id !== productId);
      const currentUserId = currentUser?.id ?? null;
      if (currentUserId) {
        localStorage.setItem(`thriftloop_cart_user_${currentUserId}`, JSON.stringify(nextCart));
      }
      return nextCart;
    });
  };

  const clearCart = () => {
    lastLocalUpdateRef.current = Date.now();
    setCart([]);
    setDiscount(0);
    setDiscountCode('');
    const currentUserId = currentUser?.id ?? null;
    if (currentUserId) {
      localStorage.setItem(`thriftloop_cart_user_${currentUserId}`, JSON.stringify([]));
      syncCartToFirestore(currentUserId, []);
    }
  };

  const applyDiscountCode = (): { success: boolean; message: string } => {
    const clean = discountCode.trim().toUpperCase();
    if (clean === 'VINTAGE10' || clean === 'THRIFTLOOP10') {
      const discountAmount = Math.round(subtotal * 0.1);
      setDiscount(discountAmount);
      return { success: true, message: '10% discount applied!' };
    } else if (clean === 'FREESHIP' || clean === 'FREESHIPPING') {
      setDiscount(150);
      return { success: true, message: 'Free Courier Delivery applied!' };
    } else {
      return { success: false, message: 'Invalid promo code.' };
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * (item.quantity || 1), 0);
  const shippingFee = cart.length > 0 ? (subtotal >= 5000 ? 0 : 150) : 0;
  const total = Math.max(0, subtotal + shippingFee - discount);

  const openOrderTracking = (orderId?: string) => {
    if (orderId) {
      const found = orders.find(o => o.id === orderId);
      if (found) {
        setActiveTrackingOrder(found);
        return;
      }
    }
    
    // Find user's own purchased order first
    if (currentUser) {
      const myOrder = orders.find(o => 
        o.buyerId === currentUser.id || 
        (!!o.buyerEmail && !!currentUser.email && o.buyerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (!!o.shippingAddress?.fullName && !!currentUser.name && o.shippingAddress.fullName.toLowerCase() === currentUser.name.toLowerCase())
      );
      if (myOrder) {
        setActiveTrackingOrder(myOrder);
        return;
      }
    }

    // If seller is logged in, find orders with their sold items
    if (currentUser?.role === 'seller') {
      const sellerOrder = orders.find(o => 
        o.sellerIds?.includes(currentUser.id) ||
        o.items.some(i => i.product.sellerId === currentUser.id || i.product.sellerBoutique === currentUser.boutiqueName)
      );
      if (sellerOrder) {
        setActiveTrackingOrder(sellerOrder);
        return;
      }
    }

    // Default to the first order if available
    if (orders.length > 0) {
      setActiveTrackingOrder(orders[0]);
    }
  };

  const closeOrderTracking = () => {
    setActiveTrackingOrder(null);
  };

  const processCheckout = async (checkoutData: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    zipCode: string;
    paymentMethod: 'credit_card' | 'gcash' | 'maya' | 'paypal' | 'cod' | 'stripe_card';
    paymentIntentId?: string;
  }): Promise<Order> => {
    // Generate unique courier tracking with realistic timeline
    const trackingNum = `TL-LX-${Math.floor(1000000 + Math.random() * 9000000)}-PH`;
    const orderNum = `TL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const courierDetails: CourierInfo = {
      provider: 'LoopExpress Logistics Courier',
      trackingNumber: trackingNum,
      currentHub: 'Metro Regional Sorting Hub (Central Gateway)',
      estimatedDelivery: '2 Business Days (Express Eco-Transit)',
      timeline: [
        {
          timestamp: 'Just now',
          status: 'Order Placed & Payment Verified',
          location: 'ThriftLoop Gateway',
          description: `Payment successfully secured via ${checkoutData.paymentMethod.toUpperCase()}. Order confirmed.`,
          completed: true,
          isCurrent: true,
        },
        {
          timestamp: 'Upcoming (within 4 hrs)',
          status: 'Boutique Inspection & Packing',
          location: 'Seller Vintage Vault Depot',
          description: 'Condition tags and garment integrity checked before compostable bagging.',
          completed: false,
        },
        {
          timestamp: 'Upcoming',
          status: 'In Transit: Regional Sorting Hub',
          location: 'Metro Regional Sorting Hub (Central Gateway)',
          description: 'Parcel arrival and barcode sorting at central cross-dock.',
          completed: false,
        },
        {
          timestamp: 'Upcoming',
          status: 'Out for Delivery',
          location: `${checkoutData.city} Delivery Hub`,
          description: 'Assigned to courier rider for door-to-door delivery.',
          completed: false,
        },
        {
          timestamp: 'Upcoming',
          status: 'Delivered',
          location: `${checkoutData.city}, ${checkoutData.province}`,
          description: 'Delivered and confirmed by buyer.',
          completed: false,
        }
      ]
    };

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber: orderNum,
      buyerId: currentUser?.id || `guest_${Date.now()}`,
      buyerName: checkoutData.fullName,
      buyerEmail: currentUser?.email || `${checkoutData.fullName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      shippingAddress: {
        fullName: checkoutData.fullName,
        phone: checkoutData.phone,
        street: checkoutData.street,
        city: checkoutData.city,
        province: checkoutData.province,
        zipCode: checkoutData.zipCode,
      },
      items: cart.map(item => ({
        product: item.product,
        quantity: item.quantity || 1,
        priceAtPurchase: item.product.price,
      })),
      subtotal,
      shippingFee,
      discount,
      total,
      paymentMethod: checkoutData.paymentMethod,
      paymentStatus: 'paid',
      orderStatus: 'order_placed',
      courier: courierDetails,
      createdAt: new Date().toISOString(),
      sellerIds: Array.from(new Set(cart.map(i => i.product.sellerId))),
    };

    // Update inventory stock (decrements exact quantity; marks as sold when stock reaches 0)
    for (const item of cart) {
      await decrementStock(item.product.id, item.quantity || 1);
    }

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'orders', newOrder.id), sanitizeFirestoreData(newOrder));
    } catch (err: any) {
      console.error('Error writing order to Firestore:', err);
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        alert('⚠️ Firestore Security Rules Blocked Checkout!\n\nTo fix this: Go to your Firebase Console > Firestore Database > Rules, and update them to:\n\nmatch /{document=**} {\n  allow read, write: if request.auth != null;\n}');
      }
    }

    setOrders(prev => {
      if (prev.some(o => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });
    clearCart();
    setIsCheckoutOpen(false);
    setActiveTrackingOrder(newOrder);

    return newOrder;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        shippingFee,
        discount,
        total,
        discountCode,
        setDiscountCode,
        applyDiscountCode,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        orders,
        activeTrackingOrder,
        setActiveTrackingOrder,
        openOrderTracking,
        closeOrderTracking,
        processCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
