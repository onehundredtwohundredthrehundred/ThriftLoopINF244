import { Order, Product } from '../types';
export function safeLocalStorageSet(key: string, value: string): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
        return false;
    }
    try {
        localStorage.setItem(key, value);
        return true;
    }
    catch (error: any) {
        const isQuotaError = error?.name === 'QuotaExceededError' ||
            error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            error?.code === 22 ||
            error?.code === 1014;
        console.warn(`[Storage] localStorage write failed for "${key}" (Quota error: ${isQuotaError}):`, error);
        if (isQuotaError) {
            try {
                if (key !== 'thriftloop_orders') {
                    localStorage.removeItem('thriftloop_orders');
                }
                if (key !== 'thriftloop_products') {
                    localStorage.removeItem('thriftloop_products');
                }
                localStorage.setItem(key, value);
                console.info(`[Storage] Recovered and successfully saved "${key}" after clearing storage cache.`);
                return true;
            }
            catch (retryError) {
                console.warn(`[Storage] Failed second attempt to write "${key}" to localStorage:`, retryError);
            }
        }
        return false;
    }
}
export function safeLocalStorageGet(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    try {
        return localStorage.getItem(key);
    }
    catch (e) {
        console.warn(`[Storage] Failed to read "${key}" from localStorage:`, e);
        return null;
    }
}
export function safeLocalStorageRemove(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    try {
        localStorage.removeItem(key);
    }
    catch (e) {
        console.warn(`[Storage] Failed to remove "${key}" from localStorage:`, e);
    }
}
export function cacheOrdersSafely(orders: Order[]): void {
    try {
        if (!Array.isArray(orders) || orders.length === 0) {
            safeLocalStorageSet('thriftloop_orders', JSON.stringify([]));
            return;
        }
        const recentOrders = orders.slice(0, 10);
        const lightweightOrders = recentOrders.map(order => ({
            ...order,
            items: (order.items || []).map(item => {
                const product = item.product || ({} as Product);
                const sanitizedImages = (product.images || [])
                    .map(img => {
                    if (typeof img === 'string' && img.startsWith('data:image') && img.length > 500) {
                        return '';
                    }
                    return img;
                })
                    .filter(Boolean);
                return {
                    ...item,
                    product: {
                        ...product,
                        images: sanitizedImages.length > 0 ? sanitizedImages.slice(0, 2) : []
                    }
                };
            })
        }));
        const serialized = JSON.stringify(lightweightOrders);
        if (serialized.length < 250000) {
            safeLocalStorageSet('thriftloop_orders', serialized);
        }
        else {
            safeLocalStorageRemove('thriftloop_orders');
        }
    }
    catch (e) {
        console.warn('[Storage] Error caching orders safely:', e);
        safeLocalStorageRemove('thriftloop_orders');
    }
}
export function cacheProductsSafely(products: Product[]): void {
    try {
        if (!Array.isArray(products))
            return;
        const sanitizedProducts = products.map(p => {
            if (!p.images || p.images.length === 0)
                return p;
            const cleanImages = p.images.map(img => {
                if (typeof img === 'string' && img.startsWith('data:image') && img.length > 1000) {
                    return '';
                }
                return img;
            }).filter(Boolean);
            return {
                ...p,
                images: cleanImages.length > 0 ? cleanImages : p.images.slice(0, 1)
            };
        });
        const serialized = JSON.stringify(sanitizedProducts);
        if (serialized.length < 1000000) {
            safeLocalStorageSet('thriftloop_products', serialized);
        }
    }
    catch (e) {
        console.warn('[Storage] Error caching products safely:', e);
    }
}
export function cleanupBloatedStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage)
        return;
    try {
        const ordersVal = localStorage.getItem('thriftloop_orders');
        if (ordersVal && ordersVal.length > 300000) {
            console.info(`[Storage] Purged oversized legacy thriftloop_orders cache (${Math.round(ordersVal.length / 1024)} KB).`);
            localStorage.removeItem('thriftloop_orders');
        }
        const productsVal = localStorage.getItem('thriftloop_products');
        if (productsVal && productsVal.length > 1500000) {
            console.info(`[Storage] Purged oversized legacy thriftloop_products cache (${Math.round(productsVal.length / 1024)} KB).`);
            localStorage.removeItem('thriftloop_products');
        }
    }
    catch (e) {
        console.warn('[Storage] Error running cleanupBloatedStorage:', e);
    }
}
cleanupBloatedStorage();
