import { Order, Product } from '../types';

/**
 * Safely sets an item in localStorage, handling QuotaExceededError and private browsing restrictions.
 * If quota is exceeded, it attempts to evict non-essential cached data (e.g. historical orders, products)
 * and retries the write. Never throws an unhandled exception.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    const isQuotaError =
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014;

    console.warn(`[Storage] localStorage write failed for "${key}" (Quota error: ${isQuotaError}):`, error);

    if (isQuotaError) {
      try {
        // Attempt recovery by purging bulky caches
        if (key !== 'thriftloop_orders') {
          localStorage.removeItem('thriftloop_orders');
        }
        if (key !== 'thriftloop_products') {
          localStorage.removeItem('thriftloop_products');
        }

        // Retry writing after cleanup
        localStorage.setItem(key, value);
        console.info(`[Storage] Recovered and successfully saved "${key}" after clearing storage cache.`);
        return true;
      } catch (retryError) {
        console.warn(`[Storage] Failed second attempt to write "${key}" to localStorage:`, retryError);
      }
    }

    return false;
  }
}

/**
 * Safely gets an item from localStorage without throwing.
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[Storage] Failed to read "${key}" from localStorage:`, e);
    return null;
  }
}

/**
 * Safely removes an item from localStorage without throwing.
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage] Failed to remove "${key}" from localStorage:`, e);
  }
}

/**
 * Caches orders safely in localStorage by:
 * 1. Limiting to the 10 most recent orders (offline instant-display only; Firestore has the full history)
 * 2. Stripping heavy base64 data URLs from item photos
 * 3. Never throwing QuotaExceededError
 */
export function cacheOrdersSafely(orders: Order[]): void {
  try {
    if (!Array.isArray(orders) || orders.length === 0) {
      safeLocalStorageSet('thriftloop_orders', JSON.stringify([]));
      return;
    }

    // Keep only the most recent 10 orders for fast initial offline render
    const recentOrders = orders.slice(0, 10);

    const lightweightOrders = recentOrders.map(order => ({
      ...order,
      items: (order.items || []).map(item => {
        const product = item.product || ({} as Product);
        const sanitizedImages = (product.images || [])
          .map(img => {
            // Strip oversized base64 data URLs from localStorage cache (keep standard URLs or short strings)
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
    // If serialized lightweight orders are reasonably sized (< 250KB), save them
    if (serialized.length < 250000) {
      safeLocalStorageSet('thriftloop_orders', serialized);
    } else {
      // If still too large, just remove the cached key so it doesn't hog quota
      safeLocalStorageRemove('thriftloop_orders');
    }
  } catch (e) {
    console.warn('[Storage] Error caching orders safely:', e);
    safeLocalStorageRemove('thriftloop_orders');
  }
}

/**
 * Caches products safely in localStorage without bloated base64 data URLs.
 */
export function cacheProductsSafely(products: Product[]): void {
  try {
    if (!Array.isArray(products)) return;

    // Sanitize any heavy base64 images from product entries before saving to local storage
    const sanitizedProducts = products.map(p => {
      if (!p.images || p.images.length === 0) return p;
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
    // Only save if under 1MB to preserve storage budget
    if (serialized.length < 1000000) {
      safeLocalStorageSet('thriftloop_products', serialized);
    }
  } catch (e) {
    console.warn('[Storage] Error caching products safely:', e);
  }
}

/**
 * Run on application initialization to immediately free up storage if existing
 * legacy localStorage keys are already exceeding or near the quota limit.
 */
export function cleanupBloatedStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    // Check 'thriftloop_orders' size
    const ordersVal = localStorage.getItem('thriftloop_orders');
    if (ordersVal && ordersVal.length > 300000) {
      // If legacy orders cache exceeds 300KB, remove it immediately
      console.info(`[Storage] Purged oversized legacy thriftloop_orders cache (${Math.round(ordersVal.length / 1024)} KB).`);
      localStorage.removeItem('thriftloop_orders');
    }

    // Check 'thriftloop_products' size
    const productsVal = localStorage.getItem('thriftloop_products');
    if (productsVal && productsVal.length > 1500000) {
      console.info(`[Storage] Purged oversized legacy thriftloop_products cache (${Math.round(productsVal.length / 1024)} KB).`);
      localStorage.removeItem('thriftloop_products');
    }
  } catch (e) {
    console.warn('[Storage] Error running cleanupBloatedStorage:', e);
  }
}

// Automatically execute cleanup once on module load
cleanupBloatedStorage();
