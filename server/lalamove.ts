import crypto from 'crypto';
import { Router } from 'express';
export interface LalamoveCredentials {
    apiKey: string;
    secretKey: string;
    market: string;
    env: 'sandbox' | 'production';
}
export function getLalamoveCredentials(): LalamoveCredentials {
    return {
        apiKey: process.env.LALAMOVE_API_KEY || 'pk_test_27f9a99865361c78706cc12553dfa8c6',
        secretKey: process.env.LALAMOVE_SECRET_KEY || 'sk_test_QYWKSsYA6uqy53mBt/1WtoGxVzVUoY+FoJnAKal3GNkloZaIhIm3YgXFghNif6pK',
        market: process.env.LALAMOVE_MARKET || 'PH',
        env: (process.env.LALAMOVE_ENV as any) || 'sandbox'
    };
}
const BASE_URLS = {
    sandbox: 'https://rest.sandbox.lalamove.com',
    production: 'https://rest.lalamove.com'
};
function signRequest(method: string, path: string, body: string, timestamp: string, secretKey: string): string {
    const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
    return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
}
async function lalamoveFetch(method: string, path: string, bodyData?: any) {
    const creds = getLalamoveCredentials();
    const baseUrl = BASE_URLS[creds.env] || BASE_URLS.sandbox;
    const timestamp = Date.now().toString();
    const body = bodyData ? JSON.stringify(bodyData) : '';
    const signature = signRequest(method, path, body, timestamp, creds.secretKey);
    const token = `hmac ${creds.apiKey}:${timestamp}:${signature}`;
    const headers: Record<string, string> = {
        'Authorization': token,
        'Market': creds.market,
        'Content-Type': 'application/json'
    };
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body || undefined
    });
    const responseText = await res.text();
    let json: any = {};
    try {
        json = JSON.parse(responseText);
    }
    catch {
        json = { raw: responseText };
    }
    return { ok: res.ok, status: res.status, data: json };
}
const PH_COORDINATES_MAP: Record<string, {
    lat: string;
    lng: string;
}> = {
    'makati': { lat: '14.554729', lng: '121.024445' },
    'santa rosa': { lat: '14.312345', lng: '121.111456' },
    'santa rosa city': { lat: '14.312345', lng: '121.111456' },
    'laguna': { lat: '14.280000', lng: '121.120000' },
    'manila': { lat: '14.599512', lng: '120.984222' },
    'quezon city': { lat: '14.676041', lng: '121.043700' },
    'taguig': { lat: '14.517618', lng: '121.050865' },
    'pasig': { lat: '14.576377', lng: '121.085110' },
    'mandaluyong': { lat: '14.579444', lng: '121.035833' },
    'paranaque': { lat: '14.479300', lng: '121.019800' },
    'alabang': { lat: '14.425900', lng: '121.037800' },
    'muntinlupa': { lat: '14.408100', lng: '121.041500' },
    'cebu': { lat: '10.315699', lng: '123.885437' },
    'davao': { lat: '7.190708', lng: '125.455341' }
};
function getCoordinatesForCity(cityName: string) {
    const clean = (cityName || '').toLowerCase().trim();
    for (const [key, coords] of Object.entries(PH_COORDINATES_MAP)) {
        if (clean.includes(key) || key.includes(clean)) {
            return coords;
        }
    }
    return { lat: '14.554729', lng: '121.024445' };
}
export function formatE164Phone(rawPhone?: string): string {
    if (!rawPhone)
        return '+639171234567';
    const cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+63')) {
        const rest = cleaned.slice(3).replace(/\D/g, '');
        return `+63${rest.slice(-10)}`;
    }
    if (cleaned.startsWith('63')) {
        const rest = cleaned.slice(2).replace(/\D/g, '');
        return `+63${rest.slice(-10)}`;
    }
    if (cleaned.startsWith('0')) {
        const rest = cleaned.slice(1).replace(/\D/g, '');
        return `+63${rest.slice(-10)}`;
    }
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length >= 10) {
        return `+63${digits.slice(-10)}`;
    }
    return '+639171234567';
}
export interface LalamoveOrderParams {
    orderNumber: string;
    destination: {
        fullName: string;
        phone: string;
        street: string;
        city: string;
        province: string;
        zipCode?: string;
    };
    itemCount: number;
    totalAmount?: number;
}
export async function createLalamoveOrder(params: LalamoveOrderParams) {
    try {
        const originCoords = PH_COORDINATES_MAP['makati'];
        const destCoords = getCoordinatesForCity(params.destination.city || params.destination.province || '');
        const customerPhone = formatE164Phone(params.destination.phone);
        const quotationPayload = {
            data: {
                serviceType: 'MOTORCYCLE',
                language: 'en_PH',
                stops: [
                    {
                        coordinates: originCoords,
                        address: '742 Ayala Avenue, Makati, Metro Manila (ThriftLoop Vault)'
                    },
                    {
                        coordinates: destCoords,
                        address: `${params.destination.street}, ${params.destination.city}, ${params.destination.province}`
                    }
                ],
                item: {
                    quantity: String(params.itemCount || 1),
                    weight: 'LESS_THAN_20_KG',
                    categories: ['CLOTHING_AND_ACCESSORIES'],
                    handlingInstructions: ['KEEP_DRY']
                }
            }
        };
        const quoteRes = await lalamoveFetch('POST', '/v3/quotations', quotationPayload);
        if (!quoteRes.ok) {
            const detailedErr = quoteRes.data?.errors?.[0]?.message || quoteRes.data?.message || quoteRes.data?.error || `Quotation error HTTP ${quoteRes.status}`;
            console.error('[Lalamove] Quotation failed:', quoteRes.status, JSON.stringify(quoteRes.data));
            throw new Error(detailedErr);
        }
        const quotation = quoteRes.data?.data;
        const quotationId = quotation?.quotationId;
        const senderStopId = quotation?.stops?.[0]?.stopId;
        const recipientStopId = quotation?.stops?.[1]?.stopId;
        const orderPayload = {
            data: {
                quotationId,
                sender: {
                    stopId: senderStopId,
                    name: 'ThriftLoop Curated Vault',
                    phone: '+639171234567'
                },
                recipients: [
                    {
                        stopId: recipientStopId,
                        name: params.destination.fullName || 'Valued Customer',
                        phone: customerPhone,
                        remarks: `Order #${params.orderNumber}`
                    }
                ],
                isPODEnabled: true,
                partner: 'ThriftLoop'
            }
        };
        const orderRes = await lalamoveFetch('POST', '/v3/orders', orderPayload);
        if (!orderRes.ok) {
            const detailedErr = orderRes.data?.errors?.[0]?.message || orderRes.data?.message || orderRes.data?.error || `Order placement error HTTP ${orderRes.status}`;
            console.error('[Lalamove] Order placement failed:', orderRes.status, JSON.stringify(orderRes.data));
            throw new Error(detailedErr);
        }
        const orderData = orderRes.data?.data;
        console.log(`[Lalamove] ✓ Order successfully placed! Order ID: ${orderData.orderId}`);
        return {
            success: true,
            orderId: orderData.orderId,
            trackingNumber: `LLM-PH-${orderData.orderId.slice(-7)}`,
            shareLink: orderData.shareLink,
            status: orderData.status || 'ASSIGNING_DRIVER',
            price: orderData.priceBreakdown?.total || quotation?.priceBreakdown?.total || '190',
            currency: 'PHP',
            partner: 'ThriftLoop',
            driverId: orderData.driverId || null,
            distanceKm: Math.round(Number(orderData.distance?.value || 0) / 1000) || 36,
            portalUrl: 'https://partnerportal.lalamove.com/records',
            sandboxSimulatorUrl: 'https://partner.lalamove.com/developers/simulator',
            timeline: buildTimelineFromLalamoveStatus(orderData.status || 'ASSIGNING_DRIVER', params.destination.city)
        };
    }
    catch (err: any) {
        console.error('[Lalamove] Flow error:', err);
        return {
            success: false,
            error: err.message
        };
    }
}
export async function getLalamoveOrderDetail(orderId: string) {
    try {
        const res = await lalamoveFetch('GET', `/v3/orders/${orderId}`);
        if (!res.ok) {
            return { success: false, error: res.data?.message || `HTTP ${res.status}` };
        }
        const orderData = res.data?.data;
        let driver = null;
        let driverLocation = null;
        if (orderData.driverId) {
            try {
                const driverRes = await lalamoveFetch('GET', `/v3/orders/${orderId}/drivers/${orderData.driverId}`);
                if (driverRes.ok) {
                    driver = driverRes.data?.data || null;
                }
            }
            catch (e) {
                console.warn('[Lalamove] Driver details lookup skipped:', e);
            }
            try {
                const locRes = await lalamoveFetch('GET', `/v3/orders/${orderId}/drivers/${orderData.driverId}/location`);
                if (locRes.ok) {
                    driverLocation = locRes.data?.data?.location || locRes.data?.data || null;
                }
            }
            catch (e) {
                console.warn('[Lalamove] Driver location lookup skipped:', e);
            }
        }
        return {
            success: true,
            orderId: orderData.orderId,
            status: orderData.status,
            driverId: orderData.driverId,
            driver,
            driverLocation,
            shareLink: orderData.shareLink,
            distance: orderData.distance,
            priceBreakdown: orderData.priceBreakdown,
            stops: orderData.stops,
            timeline: buildTimelineFromLalamoveStatus(orderData.status, orderData.stops?.[1]?.address || 'Destination')
        };
    }
    catch (err: any) {
        return { success: false, error: err.message };
    }
}
export async function testLalamoveConnection() {
    const startTime = Date.now();
    const creds = getLalamoveCredentials();
    try {
        const res = await lalamoveFetch('GET', '/v3/cities');
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
            const cities = res.data?.data || [];
            const vehicleTypes = cities[0]?.services?.map((s: any) => s.key) || ['MOTORCYCLE', 'SEDAN', 'VAN'];
            return {
                isConnected: true,
                maskedApiKey: creds.apiKey.slice(0, 10) + '...' + creds.apiKey.slice(-4),
                market: creds.market,
                env: creds.env,
                httpStatus: res.status,
                latencyMs,
                statusMessage: `Connected to Lalamove Partner Portal (${latencyMs}ms). Ready for Philippine on-demand dispatch.`,
                availableVehicles: vehicleTypes,
                partnerPortalUrl: 'https://partnerportal.lalamove.com/records'
            };
        }
        else {
            return {
                isConnected: false,
                maskedApiKey: creds.apiKey.slice(0, 10) + '...' + creds.apiKey.slice(-4),
                market: creds.market,
                env: creds.env,
                httpStatus: res.status,
                latencyMs,
                statusMessage: res.data?.message || `Lalamove API error: HTTP ${res.status}`
            };
        }
    }
    catch (err: any) {
        return {
            isConnected: false,
            maskedApiKey: creds.apiKey.slice(0, 10) + '...' + creds.apiKey.slice(-4),
            market: creds.market,
            env: creds.env,
            httpStatus: 500,
            latencyMs: Date.now() - startTime,
            statusMessage: `Network error: ${err.message}`
        };
    }
}
export function buildTimelineFromLalamoveStatus(status: string, destinationCity: string) {
    const stages = [
        {
            code: 'ASSIGNING_DRIVER',
            title: 'Quotation Accepted & Assigning Driver',
            location: '742 Ayala Avenue, Makati (ThriftLoop Vault)',
            desc: 'Order registered in Lalamove Partner Portal. Matching nearest available motorcycle courier.',
        },
        {
            code: 'ON_GOING',
            title: 'Courier En Route to Pickup Vault',
            location: 'Makati CBD Gateway',
            desc: 'Driver accepted assignment and is heading to the dispatch boutique.',
        },
        {
            code: 'PICKED_UP',
            title: 'Parcel Picked Up & In Transit',
            location: 'South Luzon Expressway / Regional Route',
            desc: 'Vintage item secured in courier carrier box and heading directly to your doorstep.',
        },
        {
            code: 'COMPLETED',
            title: 'Doorstep Delivery Completed',
            location: destinationCity,
            desc: 'Package handed over with electronic proof of delivery (e-POD).',
        }
    ];
    const stageOrder = ['ASSIGNING_DRIVER', 'ON_GOING', 'PICKED_UP', 'COMPLETED'];
    const currentIndex = stageOrder.indexOf(status) !== -1 ? stageOrder.indexOf(status) : 0;
    return stages.map((stage, idx) => ({
        timestamp: idx === currentIndex ? (status === 'COMPLETED' ? 'Completed' : 'Active Now') : idx < currentIndex ? 'Completed' : 'Upcoming',
        status: stage.title,
        location: stage.location,
        description: stage.desc,
        completed: idx < currentIndex || (status === 'COMPLETED' && idx === currentIndex),
        isCurrent: status === 'COMPLETED' ? false : idx === currentIndex,
        rawStatus: stage.code
    }));
}

export const lalamoveRouter = Router();

lalamoveRouter.post('/order', async (req, res) => {
    try {
        const order = await createLalamoveOrder(req.body);
        res.json(order);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

lalamoveRouter.get('/order/:orderId', async (req, res) => {
    try {
        const details = await getLalamoveOrderDetail(req.params.orderId);
        res.json(details);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
