/**
 * Courier Tracking System Sandbox Integration (Integration 3)
 * Provides an enterprise-grade Logistics & Courier Gateway Simulator modeled after
 * real-world courier APIs (Ninja Van, J&T Express, ShipEngine, and EasyPost).
 */

export interface CourierCarrier {
  id: string;
  name: string;
  code: string;
  serviceLevel: string;
  logoUrl?: string;
  supportsLiveTracking: boolean;
}

export interface CourierScanCheckpoint {
  id: string;
  statusCode: 'MANIFESTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELIVERY_ATTEMPT';
  status: string;
  location: string;
  description: string;
  timestamp: string;
  completed: boolean;
  isCurrent?: boolean;
}

export interface CourierShipment {
  consignmentId: string;
  trackingNumber: string;
  waybillNumber: string;
  barcode: string;
  carrier: CourierCarrier;
  orderId: string;
  orderNumber: string;
  recipient: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    zipCode: string;
  };
  sender: {
    boutiqueName: string;
    city: string;
    province: string;
  };
  packageSpecs: {
    itemCount: number;
    weightKg: number;
    dimensionsCm: string;
    packagingType: string;
  };
  currentStatus: string;
  currentStatusCode: CourierScanCheckpoint['statusCode'];
  currentHub: string;
  estimatedDelivery: string;
  timeline: CourierScanCheckpoint[];
  bookedAt: string;
  lastUpdatedAt: string;
  sandboxMode: boolean;
}

export interface BookShipmentOptions {
  orderId: string;
  orderNumber: string;
  recipient: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    zipCode: string;
  };
  sender?: {
    boutiqueName?: string;
    city?: string;
    province?: string;
  };
  carrierId?: string;
  items?: { title: string; quantity: number }[];
  total?: number;
}

export const SUPPORTED_CARRIERS: CourierCarrier[] = [
  {
    id: 'loopexpress',
    name: 'LoopExpress Eco-Logistics',
    code: 'LX',
    serviceLevel: 'Express Door-to-Door Eco Transit',
    supportsLiveTracking: true,
  },
  {
    id: 'ninjavan',
    name: 'Ninja Van Philippines (Sandbox)',
    code: 'NV',
    serviceLevel: 'Ninja Standard Delivery',
    supportsLiveTracking: true,
  },
  {
    id: 'jtexpress',
    name: 'J&T Express Philippines (Sandbox)',
    code: 'JT',
    serviceLevel: 'EZ Parcel Nationwide',
    supportsLiveTracking: true,
  },
];

// In-memory cache of active shipments for the session
const shipmentStore = new Map<string, CourierShipment>();

/**
 * Books an outbound parcel shipment with the Courier Gateway Sandbox API.
 */
export function bookCourierShipment(options: BookShipmentOptions): CourierShipment {
  const {
    orderId,
    orderNumber,
    recipient,
    sender = {},
    carrierId = 'loopexpress',
    items = [],
  } = options;

  const carrier = SUPPORTED_CARRIERS.find(c => c.id === carrierId) || SUPPORTED_CARRIERS[0];
  const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
  const trackingNumber = `${carrier.code}-SBX-${randomSuffix}-PH`;
  const consignmentId = `cgn_${carrier.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const waybillNumber = `WB-${carrier.code}-${randomSuffix}`;
  const barcode = `*${trackingNumber.replace(/-/g, '')}*`;

  const boutiqueName = sender.boutiqueName || 'Vintage Vault Hub';
  const senderCity = sender.city || 'Makati City';
  const senderProvince = sender.province || 'Metro Manila (NCR)';

  const now = new Date();
  const nowFormatted = 'Just now';

  const defaultTimeline: CourierScanCheckpoint[] = [
    {
      id: `chk_${Date.now()}_1`,
      statusCode: 'MANIFESTED',
      status: 'Order Placed & Electronic Waybill Manifested',
      location: `${senderCity} Courier Sorting Hub`,
      description: `Electronic shipping manifest registered by ${boutiqueName}. Waybill barcode generated and awaiting rider pickup.`,
      timestamp: nowFormatted,
      completed: true,
      isCurrent: true,
    },
    {
      id: `chk_${Date.now()}_2`,
      statusCode: 'PICKED_UP',
      status: 'Boutique Pickup & Rider Hand-off',
      location: `${senderCity}, ${senderProvince}`,
      description: 'Courier rider assigned. Garment inspected in compostable loop packaging and scanned into first-mile transit.',
      timestamp: 'Pending Hand-off',
      completed: false,
    },
    {
      id: `chk_${Date.now()}_3`,
      statusCode: 'IN_TRANSIT',
      status: 'In Transit: Regional Central Cross-Dock',
      location: 'Central Luzon / NCR Gateway Sorting Cross-Dock',
      description: 'Parcel routed through high-speed automated barcode sorter for outbound provincial / local line-haul dispatch.',
      timestamp: 'Upcoming',
      completed: false,
    },
    {
      id: `chk_${Date.now()}_4`,
      statusCode: 'OUT_FOR_DELIVERY',
      status: 'Out for Delivery (Rider Dispatched)',
      location: `${recipient.city} Delivery Depot`,
      description: `Rider assigned for final door-to-door delivery to ${recipient.fullName}. Signature capture enabled.`,
      timestamp: 'Upcoming',
      completed: false,
    },
    {
      id: `chk_${Date.now()}_5`,
      statusCode: 'DELIVERED',
      status: 'Parcel Delivered & Handed Over',
      location: `${recipient.city}, ${recipient.province}`,
      description: `Parcel successfully received and signed for by ${recipient.fullName}. Shipment completed.`,
      timestamp: 'Upcoming',
      completed: false,
    },
  ];

  const totalItemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
  const estimatedWeight = Math.max(0.4, Number((totalItemCount * 0.45).toFixed(2)));

  const shipment: CourierShipment = {
    consignmentId,
    trackingNumber,
    waybillNumber,
    barcode,
    carrier,
    orderId,
    orderNumber,
    recipient,
    sender: {
      boutiqueName,
      city: senderCity,
      province: senderProvince,
    },
    packageSpecs: {
      itemCount: totalItemCount,
      weightKg: estimatedWeight,
      dimensionsCm: '32 x 24 x 6 cm',
      packagingType: 'Compostable Eco Poly-Mailer',
    },
    currentStatus: 'Order Placed & Electronic Waybill Manifested',
    currentStatusCode: 'MANIFESTED',
    currentHub: `${senderCity} Regional Central Sorting Hub`,
    estimatedDelivery: '2 Business Days (Express Eco-Transit)',
    timeline: defaultTimeline,
    bookedAt: now.toISOString(),
    lastUpdatedAt: now.toISOString(),
    sandboxMode: true,
  };

  shipmentStore.set(trackingNumber, shipment);
  return shipment;
}

/**
 * Tracks a parcel with the Courier Gateway Sandbox API.
 */
export function trackCourierShipment(trackingNumber: string): CourierShipment | null {
  if (shipmentStore.has(trackingNumber)) {
    return shipmentStore.get(trackingNumber)!;
  }
  return null;
}

/**
 * Advances a shipment scan state in the Courier Sandbox system (simulates rider physical barcode scans).
 */
export function advanceCourierScan(
  trackingNumber: string,
  targetStatusCode?: CourierScanCheckpoint['statusCode']
): { success: boolean; shipment?: CourierShipment; message: string } {
  let shipment = shipmentStore.get(trackingNumber);

  if (!shipment) {
    // If not found in memory (e.g. server restarted or external order), generate a placeholder shipment
    shipment = {
      consignmentId: `cgn_auto_${Date.now()}`,
      trackingNumber,
      waybillNumber: `WB-AUTO-${Date.now().toString().slice(-6)}`,
      barcode: `*${trackingNumber.replace(/[^a-zA-Z0-9]/g, '')}*`,
      carrier: SUPPORTED_CARRIERS[0],
      orderId: `ord_${Date.now()}`,
      orderNumber: `TL-${new Date().getFullYear()}-0000`,
      recipient: {
        fullName: 'Customer',
        phone: '09170000000',
        street: 'Delivery Street',
        city: 'Makati City',
        province: 'Metro Manila (NCR)',
        zipCode: '1200',
      },
      sender: {
        boutiqueName: 'Vintage Vault',
        city: 'Quezon City',
        province: 'Metro Manila (NCR)',
      },
      packageSpecs: {
        itemCount: 1,
        weightKg: 0.5,
        dimensionsCm: '30 x 20 x 5 cm',
        packagingType: 'Standard Compostable Bag',
      },
      currentStatus: 'In Transit',
      currentStatusCode: 'IN_TRANSIT',
      currentHub: 'Central Sorting Hub',
      estimatedDelivery: '2 Business Days',
      timeline: [],
      bookedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      sandboxMode: true,
    };
    shipmentStore.set(trackingNumber, shipment);
  }

  const orderOfStatuses: CourierScanCheckpoint['statusCode'][] = [
    'MANIFESTED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
  ];

  const currentIdx = orderOfStatuses.indexOf(shipment.currentStatusCode);
  let nextStatusCode: CourierScanCheckpoint['statusCode'];

  if (targetStatusCode && orderOfStatuses.includes(targetStatusCode)) {
    nextStatusCode = targetStatusCode;
  } else {
    const nextIdx = Math.min(orderOfStatuses.length - 1, currentIdx + 1);
    nextStatusCode = orderOfStatuses[nextIdx];
  }

  const targetIdx = orderOfStatuses.indexOf(nextStatusCode);
  const nowIso = new Date().toISOString();
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Update checkpoints up to targetIdx
  const updatedTimeline = shipment.timeline.map((step, idx) => {
    if (idx < targetIdx) {
      return {
        ...step,
        completed: true,
        isCurrent: false,
        timestamp: step.timestamp.includes('Upcoming') || step.timestamp.includes('Pending') ? `Completed at ${timeString}` : step.timestamp,
      };
    } else if (idx === targetIdx) {
      return {
        ...step,
        completed: true,
        isCurrent: true,
        timestamp: `Just now (${timeString})`,
      };
    } else {
      return {
        ...step,
        completed: false,
        isCurrent: false,
      };
    }
  });

  const activeCheckpoint = updatedTimeline[targetIdx] || updatedTimeline[updatedTimeline.length - 1];

  let nextHub = shipment.currentHub;
  if (nextStatusCode === 'PICKED_UP') {
    nextHub = `${shipment.sender.city} First-Mile Hub`;
  } else if (nextStatusCode === 'IN_TRANSIT') {
    nextHub = 'Metro Central Gateway Sorting Cross-Dock';
  } else if (nextStatusCode === 'OUT_FOR_DELIVERY') {
    nextHub = `${shipment.recipient.city} Last-Mile Delivery Hub`;
  } else if (nextStatusCode === 'DELIVERED') {
    nextHub = `${shipment.recipient.city}, ${shipment.recipient.province} (Delivered)`;
  }

  shipment.currentStatusCode = nextStatusCode;
  shipment.currentStatus = activeCheckpoint?.status || shipment.currentStatus;
  shipment.currentHub = nextHub;
  shipment.timeline = updatedTimeline;
  shipment.lastUpdatedAt = nowIso;

  if (nextStatusCode === 'DELIVERED') {
    shipment.estimatedDelivery = 'Delivered on schedule';
  }

  shipmentStore.set(trackingNumber, shipment);

  return {
    success: true,
    shipment,
    message: `Courier Gateway: Scan checkpoint advanced to [${activeCheckpoint.status}] at ${activeCheckpoint.location}`,
  };
}
