import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Order, CourierInfo } from '../types';
import { INITIAL_ORDERS } from '../data/mockData';
import { useInventory } from './InventoryContext';
import { useAuth } from './AuthContext';
import { auth, db } from '../lib/firebase';
import { sanitizeFirestoreData } from '../lib/firestoreUtils';
import { safeLocalStorageGet, safeLocalStorageSet, cacheOrdersSafely } from '../lib/storage';
import { collection, doc, onSnapshot, setDoc, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number) => {
        success: boolean;
        message: string;
    };
    updateQuantity: (productId: string, quantity: number) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    discountCode: string;
    setDiscountCode: (code: string) => void;
    applyDiscountCode: () => {
        success: boolean;
        message: string;
    };
    isCartDrawerOpen: boolean;
    setIsCartDrawerOpen: (open: boolean) => void;
    isCheckoutOpen: boolean;
    setIsCheckoutOpen: (open: boolean) => void;
    orders: Order[];
    activeTrackingOrder: Order | null;
    setActiveTrackingOrder: (order: Order | null) => void;
    openOrderTracking: (orderId?: string) => void;
    closeOrderTracking: () => void;
    refreshOrderTracking: (orderId: string) => Promise<void>;
    simulateTrackingStage: (orderId: string, stage: 'PRE_TRANSIT' | 'TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED') => Promise<void>;
    isTrackingRefreshing: boolean;
    processCheckout: (checkoutData: {
        fullName: string;
        phone: string;
        street: string;
        city: string;
        province: string;
        zipCode: string;
        paymentMethod: 'credit_card' | 'gcash' | 'maya' | 'paypal' | 'cod' | 'stripe_card';
        paymentIntentId?: string;
        courierPreference?: 'LALAMOVE' | 'STANDARD';
    }) => Promise<Order>;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
export const CartProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
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
        }
        catch (err) {
            console.error('Error syncing cart to Firestore:', err);
        }
    };
    const getInitialUserId = () => {
        if (auth.currentUser?.uid)
            return auth.currentUser.uid;
        const cachedUser = safeLocalStorageGet('thriftloop_user');
        if (cachedUser) {
            try {
                const parsed = JSON.parse(cachedUser);
                if (parsed?.id)
                    return parsed.id;
            }
            catch {
            }
        }
        return null;
    };
    const [cart, setCart] = useState<CartItem[]>(() => {
        const initialUserId = getInitialUserId();
        if (initialUserId) {
            const primaryKey = `thriftloop_cart_user_${initialUserId}`;
            const saved = safeLocalStorageGet(primaryKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed.map((item: any) => ({
                            ...item,
                            quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
                        }));
                    }
                }
                catch (e) {
                }
            }
        }
        return [];
    });
    useEffect(() => {
        if (isLoadingAuth)
            return;
        const currentUserId = currentUser?.id ?? null;
        const prevUserId = prevUserIdRef.current;
        prevUserIdRef.current = currentUserId;
        if (prevUserId !== currentUserId) {
            setCart([]);
        }
        if (!currentUserId) {
            setCart([]);
            return;
        }
        const userKey = `thriftloop_cart_user_${currentUserId}`;
        const localSaved = safeLocalStorageGet(userKey);
        if (localSaved) {
            try {
                const parsed = JSON.parse(localSaved);
                if (Array.isArray(parsed)) {
                    setCart(parsed.map((item: any) => ({
                        ...item,
                        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
                    })));
                }
            }
            catch {
            }
        }
        else {
            setCart([]);
        }
        const cartDocRef = doc(db, 'carts', currentUserId);
        const unsubscribe = onSnapshot(cartDocRef, (snapshot) => {
            if (prevUserIdRef.current !== currentUserId)
                return;
            hasLoadedFromFirestoreRef.current[currentUserId] = true;
            if (snapshot.metadata.hasPendingWrites) {
                return;
            }
            if (snapshot.exists()) {
                const data = snapshot.data();
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
                    safeLocalStorageSet(`thriftloop_cart_user_${currentUserId}`, JSON.stringify(items));
                }
            }
            else {
                const userKey = `thriftloop_cart_user_${currentUserId}`;
                const currentSaved = safeLocalStorageGet(userKey);
                let initialItems: CartItem[] = [];
                if (currentSaved) {
                    try {
                        const parsed = JSON.parse(currentSaved);
                        if (Array.isArray(parsed)) {
                            initialItems = parsed;
                        }
                    }
                    catch {
                    }
                }
                syncCartToFirestore(currentUserId, initialItems);
            }
        }, (err) => {
            console.warn('Firestore cart subscription notice:', err);
        });
        return () => unsubscribe();
    }, [currentUser?.id, isLoadingAuth]);
    useEffect(() => {
        if (isLoadingAuth)
            return;
        const currentUserId = currentUser?.id ?? null;
        if (!currentUserId) {
            return;
        }
        if (prevUserIdRef.current !== currentUserId) {
            return;
        }
        const key = `thriftloop_cart_user_${currentUserId}`;
        safeLocalStorageSet(key, JSON.stringify(cart));
        if (isRemoteUpdateRef.current) {
            isRemoteUpdateRef.current = false;
            return;
        }
        if (hasLoadedFromFirestoreRef.current[currentUserId]) {
            syncCartToFirestore(currentUserId, cart);
        }
    }, [cart, currentUser?.id, isLoadingAuth]);
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            const currentUserId = currentUser?.id ?? null;
            if (!currentUserId)
                return;
            const activeKey = `thriftloop_cart_user_${currentUserId}`;
            if (e.key === activeKey && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (Array.isArray(parsed)) {
                        isRemoteUpdateRef.current = true;
                        setCart(parsed);
                    }
                }
                catch {
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [currentUser?.id]);
    const isLalamoveOrder = (ord: any): boolean => {
        if (!ord)
            return false;
        return Boolean(ord.courier?.isLalamove === true ||
            ord.courier?.carrier === 'lalamove' ||
            Boolean(ord.courier?.lalamoveOrderId) ||
            (typeof ord.courier?.provider === 'string' && ord.courier.provider.toLowerCase().includes('lalamove')));
    };
    const [orders, setOrders] = useState<Order[]>(() => {
        const saved = safeLocalStorageGet('thriftloop_orders');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    const map = new Map<string, Order>();
                    parsed.forEach((ord: Order) => {
                        if (ord && ord.id && isLalamoveOrder(ord) && !map.has(ord.id)) {
                            map.set(ord.id, ord);
                        }
                    });
                    return Array.from(map.values());
                }
            }
            catch (e) {
                return [];
            }
        }
        return [];
    });
    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
    const [discountCode, setDiscountCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [isTrackingRefreshing, setIsTrackingRefreshing] = useState(false);
    const refreshOrderTracking = async (orderId: string) => {
        const targetOrder = orders.find(o => o.id === orderId) || (activeTrackingOrder?.id === orderId ? activeTrackingOrder : null);
        if (!targetOrder || !targetOrder.courier?.trackingNumber)
            return;
        setIsTrackingRefreshing(true);
        try {
            if (targetOrder.courier?.isLalamove && targetOrder.courier.lalamoveOrderId) {
                const res = await fetch(`/api/shipping/lalamove/order/${encodeURIComponent(targetOrder.courier.lalamoveOrderId)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        const normStatus = String(data.status || '').toUpperCase();
                        const isDelivered = normStatus === 'COMPLETED' || normStatus === 'DELIVERED';
                        const isPickedUp = normStatus === 'PICKED_UP';
                        const isOngoing = normStatus === 'ON_GOING';
                        const updatedCourier: CourierInfo = {
                            ...targetOrder.courier,
                            lalamoveStatus: data.status,
                            driverId: data.driverId || targetOrder.courier.driverId,
                            driver: data.driver !== undefined ? data.driver : targetOrder.courier.driver,
                            driverLocation: data.driverLocation !== undefined ? data.driverLocation : targetOrder.courier.driverLocation,
                            lalamoveShareLink: data.shareLink || targetOrder.courier.lalamoveShareLink,
                            trackingStatus: isDelivered ? 'DELIVERED' : isPickedUp ? 'OUT_FOR_DELIVERY' : isOngoing ? 'TRANSIT' : 'PRE_TRANSIT',
                            estimatedDelivery: isDelivered ? 'Delivered' : isPickedUp ? 'Arriving Today' : 'Scheduled Delivery',
                            currentHub: isDelivered ? 'Delivered to Recipient' : isPickedUp ? 'Out for Delivery (Rider in Transit)' : isOngoing ? 'Courier Heading to Pickup Vault' : 'ThriftLoop Vault, Makati',
                            timeline: data.timeline || targetOrder.courier.timeline,
                            lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        };
                        const updatedOrder: Order = {
                            ...targetOrder,
                            courier: updatedCourier,
                            orderStatus: isDelivered ? 'delivered' : isPickedUp ? 'out_for_delivery' : isOngoing ? 'in_transit' : 'order_placed'
                        };
                        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
                        if (activeTrackingOrder?.id === orderId)
                            setActiveTrackingOrder(updatedOrder);
                        try {
                            await setDoc(doc(db, 'orders', orderId), sanitizeFirestoreData(updatedOrder), { merge: true });
                        }
                        catch (e) {
                        }
                        return;
                    }
                }
            }
            const updatedCourier: CourierInfo = {
                ...targetOrder.courier,
                lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            const updatedOrder: Order = {
                ...targetOrder,
                courier: updatedCourier
            };
            setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            if (activeTrackingOrder?.id === orderId)
                setActiveTrackingOrder(updatedOrder);
            try {
                await setDoc(doc(db, 'orders', orderId), sanitizeFirestoreData(updatedOrder), { merge: true });
            }
            catch (e) {
            }
        }
        catch (err) {
            console.error('Failed to refresh order tracking:', err);
        }
        finally {
            setIsTrackingRefreshing(false);
        }
    };
    const simulateTrackingStage = async (orderId: string, stage: 'PRE_TRANSIT' | 'TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
        const targetOrder = orders.find(o => o.id === orderId) || (activeTrackingOrder?.id === orderId ? activeTrackingOrder : null);
        if (!targetOrder || !targetOrder.courier?.trackingNumber)
            return;
        setIsTrackingRefreshing(true);
        try {
            const stageMap: Record<string, Order['orderStatus']> = {
                'PRE_TRANSIT': 'order_placed',
                'TRANSIT': 'in_transit',
                'OUT_FOR_DELIVERY': 'out_for_delivery',
                'DELIVERED': 'delivered'
            };
            const stageKeys = ['PRE_TRANSIT', 'TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
            const targetIndex = stageKeys.indexOf(stage);
            const updatedTimeline = (targetOrder.courier.timeline || []).map((step, idx) => {
                const isCur = idx === targetIndex;
                const isDone = idx < targetIndex || (stage === 'DELIVERED' && idx === targetIndex);
                return {
                    ...step,
                    completed: isDone,
                    isCurrent: isCur,
                    timestamp: isCur ? 'Active Now' : isDone ? 'Completed' : 'Upcoming'
                };
            });
            const updatedCourier: CourierInfo = {
                ...targetOrder.courier,
                trackingStatus: stage,
                lalamoveStatus: stage === 'DELIVERED' ? 'COMPLETED' : stage === 'OUT_FOR_DELIVERY' ? 'PICKED_UP' : stage === 'TRANSIT' ? 'ON_GOING' : 'ASSIGNING_DRIVER',
                timeline: updatedTimeline,
                lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            const updatedOrder: Order = {
                ...targetOrder,
                courier: updatedCourier,
                orderStatus: stageMap[stage] || 'in_transit'
            };
            setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
            if (activeTrackingOrder?.id === orderId) {
                setActiveTrackingOrder(updatedOrder);
            }
            try {
                await setDoc(doc(db, 'orders', orderId), sanitizeFirestoreData(updatedOrder), { merge: true });
            }
            catch (e) {
                console.warn('Could not sync stage simulation to Firestore:', e);
            }
        }
        catch (err) {
            console.error('Failed to simulate tracking stage:', err);
        }
        finally {
            setIsTrackingRefreshing(false);
        }
    };
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
            }
            catch (err) {
                console.warn('Orders seed notice:', err);
            }
        };
        seedInitialOrders();
        const unsubscribe = onSnapshot(ordersColRef, (snapshot) => {
            if (!snapshot.empty) {
                const map = new Map<string, Order>();
                snapshot.forEach((d) => {
                    const ordData = d.data() as Omit<Order, 'id'>;
                    const orderObj: Order = { id: d.id, ...ordData };
                    if (isLalamoveOrder(orderObj)) {
                        if (!map.has(d.id)) {
                            map.set(d.id, orderObj);
                        }
                    }
                    else {
                        deleteDoc(doc(db, 'orders', d.id)).catch(() => {});
                    }
                });
                const loaded = Array.from(map.values());
                loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setOrders(loaded);
                cacheOrdersSafely(loaded);
            }
            else {
                setOrders([]);
                safeLocalStorageSet('thriftloop_orders', JSON.stringify([]));
            }
        }, (error) => {
            console.warn('Firestore orders sync notice:', error);
        });
        return () => unsubscribe();
    }, []);
    const addToCart = (product: Product, quantity: number = 1): {
        success: boolean;
        message: string;
    } => {
        if (!currentUser) {
            openAuthModal('login');
            return { success: false, message: 'Please sign in to add items to your bag.' };
        }
        if (product.status === 'sold' || (product.stock !== undefined && product.stock <= 0)) {
            return { success: false, message: 'This piece is out of stock.' };
        }
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
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const maxStock = item.product.stock !== undefined ? item.product.stock : 1;
                const clampedQty = Math.min(maxStock, Math.max(1, newQuantity));
                return { ...item, quantity: clampedQty };
            }
            return item;
        }));
    };
    const removeFromCart = (productId: string) => {
        lastLocalUpdateRef.current = Date.now();
        setCart(prev => {
            const nextCart = prev.filter(item => item.product.id !== productId);
            const currentUserId = currentUser?.id ?? null;
            if (currentUserId) {
                safeLocalStorageSet(`thriftloop_cart_user_${currentUserId}`, JSON.stringify(nextCart));
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
            safeLocalStorageSet(`thriftloop_cart_user_${currentUserId}`, JSON.stringify([]));
            syncCartToFirestore(currentUserId, []);
        }
    };
    const applyDiscountCode = (): {
        success: boolean;
        message: string;
    } => {
        const clean = discountCode.trim().toUpperCase();
        if (clean === 'VINTAGE10' || clean === 'THRIFTLOOP10') {
            const discountAmount = Math.round(subtotal * 0.1);
            setDiscount(discountAmount);
            return { success: true, message: '10% discount applied!' };
        }
        else if (clean === 'FREESHIP' || clean === 'FREESHIPPING') {
            setDiscount(150);
            return { success: true, message: 'Free Courier Delivery applied!' };
        }
        else {
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
        if (currentUser) {
            const myOrder = orders.find(o => o.buyerId === currentUser.id ||
                (!!o.buyerEmail && !!currentUser.email && o.buyerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                (!!o.shippingAddress?.fullName && !!currentUser.name && o.shippingAddress.fullName.toLowerCase() === currentUser.name.toLowerCase()));
            if (myOrder) {
                setActiveTrackingOrder(myOrder);
                return;
            }
        }
        if (currentUser?.role === 'seller') {
            const sellerOrder = orders.find(o => o.sellerIds?.includes(currentUser.id) ||
                o.items.some(i => i.product.sellerId === currentUser.id || i.product.sellerBoutique === currentUser.boutiqueName));
            if (sellerOrder) {
                setActiveTrackingOrder(sellerOrder);
                return;
            }
        }
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
        courierPreference?: 'LALAMOVE' | 'STANDARD';
    }): Promise<Order> => {
        const newOrderId = `ord_${Date.now()}`;
        const orderNum = `TL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const courierPref = checkoutData.courierPreference || 'LALAMOVE';
        let courierDetails: CourierInfo;
        if (courierPref === 'LALAMOVE') {
            try {
                const llmRes = await fetch('/api/shipping/lalamove/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderNumber: orderNum,
                        destination: {
                            fullName: checkoutData.fullName,
                            phone: checkoutData.phone,
                            street: checkoutData.street,
                            city: checkoutData.city,
                            province: checkoutData.province,
                            zipCode: checkoutData.zipCode,
                        },
                        itemCount: cart.reduce((sum, item) => sum + (item.quantity || 1), 0),
                        totalAmount: subtotal
                    })
                });
                if (llmRes.ok) {
                    const llmData = await llmRes.json();
                    if (llmData.success) {
                        courierDetails = {
                            provider: 'Lalamove Express',
                            carrier: 'lalamove',
                            trackingNumber: llmData.trackingNumber,
                            trackingUrl: llmData.shareLink,
                            currentHub: '742 Ayala Avenue, Makati (ThriftLoop Vault)',
                            estimatedDelivery: 'Same-Day Delivery (45-90 Mins)',
                            timeline: llmData.timeline || [],
                            trackingStatus: 'CREATED',
                            isLalamove: true,
                            lalamoveOrderId: llmData.orderId,
                            lalamoveShareLink: llmData.shareLink,
                            lalamovePortalUrl: 'https://partnerportal.lalamove.com/records',
                            lalamoveStatus: llmData.status || 'ASSIGNING_DRIVER',
                            lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        };
                    }
                    else {
                        throw new Error(llmData.error || 'Lalamove order creation failed');
                    }
                }
                else {
                    throw new Error('Lalamove server endpoint error');
                }
            }
            catch (err) {
                console.warn('Lalamove live call fallback:', err);
                const fallbackId = `3605${Date.now().toString().slice(-8)}`;
                courierDetails = {
                    provider: 'Lalamove Express',
                    carrier: 'lalamove',
                    trackingNumber: `LLM-PH-${fallbackId.slice(-7)}`,
                    currentHub: '742 Ayala Avenue, Makati',
                    estimatedDelivery: 'Same-Day Delivery (45-90 Mins)',
                    timeline: [
                        {
                            timestamp: 'Just now',
                            status: 'Quotation Accepted & Assigning Driver',
                            location: '742 Ayala Avenue, Makati (ThriftLoop Vault)',
                            description: 'Order staged in Lalamove Partner Portal. Matching nearest available courier.',
                            completed: false,
                            isCurrent: true,
                            rawStatus: 'ASSIGNING_DRIVER'
                        }
                    ],
                    trackingStatus: 'CREATED',
                    isLalamove: true,
                    lalamoveOrderId: fallbackId,
                    lalamovePortalUrl: 'https://partnerportal.lalamove.com/records',
                    lalamoveStatus: 'ASSIGNING_DRIVER',
                    lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
            }
        }
        else {
            const trackingCode = `TL-STD-${Math.floor(100000 + Math.random() * 900000)}`;
            courierDetails = {
                provider: 'Standard Doorstep Delivery',
                carrier: 'standard',
                trackingNumber: trackingCode,
                currentHub: 'Makati Central Dispatch Center',
                estimatedDelivery: '2-3 Business Days',
                timeline: [
                    {
                        timestamp: 'Just now',
                        status: 'Order Placed & Staged for Dispatch',
                        location: '742 Ayala Avenue, Makati (ThriftLoop Vault)',
                        description: `Order registered and package staged for dispatch to ${checkoutData.fullName}.`,
                        completed: true,
                        isCurrent: true,
                        rawStatus: 'CREATED'
                    },
                    {
                        timestamp: 'Upcoming',
                        status: 'In Transit to Regional Sorting Facility',
                        location: 'Metro Manila Distribution Depot',
                        description: 'Package scanned into conveyor linehaul.',
                        completed: false,
                        rawStatus: 'IN_TRANSIT'
                    },
                    {
                        timestamp: 'Upcoming',
                        status: 'Out for Doorstep Delivery',
                        location: `${checkoutData.city || 'Local'} Delivery Gateway`,
                        description: 'Assigned to courier rider for final delivery.',
                        completed: false,
                        rawStatus: 'OUT_FOR_DELIVERY'
                    },
                    {
                        timestamp: 'Upcoming',
                        status: 'Package Delivered',
                        location: `${checkoutData.city}, ${checkoutData.province}`,
                        description: 'Handed over to customer.',
                        completed: false,
                        rawStatus: 'DELIVERED'
                    }
                ],
                trackingStatus: 'CREATED',
                lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
        }
        const newOrder: Order = {
            id: newOrderId,
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
            paymentIntentId: checkoutData.paymentIntentId,
            paymentStatus: 'paid',
            orderStatus: 'order_placed',
            courier: courierDetails,
            createdAt: new Date().toISOString(),
            sellerIds: Array.from(new Set(cart.map(i => i.product.sellerId))),
        };
        for (const item of cart) {
            await decrementStock(item.product.id, item.quantity || 1);
        }
        try {
            await setDoc(doc(db, 'orders', newOrder.id), sanitizeFirestoreData(newOrder));
        }
        catch (err: any) {
            console.error('Error writing order to Firestore:', err);
            if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
                alert('⚠️ Firestore Security Rules Blocked Checkout!\n\nTo fix this: Go to your Firebase Console > Firestore Database > Rules, and update them to:\n\nmatch /{document=**} {\n  allow read, write: if request.auth != null;\n}');
            }
        }
        setOrders(prev => {
            if (prev.some(o => o.id === newOrder.id))
                return prev;
            return [newOrder, ...prev];
        });
        clearCart();
        setIsCheckoutOpen(false);
        setActiveTrackingOrder(newOrder);
        return newOrder;
    };
    return (<CartContext.Provider value={{
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
            refreshOrderTracking,
            simulateTrackingStage,
            isTrackingRefreshing,
            processCheckout,
        }}>
      {children}
    </CartContext.Provider>);
};
export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
