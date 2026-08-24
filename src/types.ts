export type UserRole = 'buyer' | 'seller' | 'admin';

export type ConditionGrade = 
  | 'Mint' 
  | 'Lightly Used' 
  | 'Flawed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  avatarPosition?: string;
  boutiqueName?: string;
  boutiqueBio?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    province: string;
    zipCode: string;
  };
  rating?: number;
  totalSales?: number;
  joinedDate: string;
}

export interface Measurements {
  chest?: string;
  length?: string;
  shoulders?: string;
  waist?: string;
  inseam?: string;
  sleeve?: string;
  rise?: string;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  era: string; // '90s', '80s', 'Y2K', '70s', '00s'
  category: string;
  clothingType: string;
  size: string;
  color: string;
  condition: ConditionGrade;
  conditionNotes: string;
  hasWearsOrTears: boolean;
  wearDetails: string[];
  price: number;
  regularPrice?: number;
  isOnSale?: boolean;
  originalRetailEstimate?: number;
  stock: number;
  status: 'available' | 'reserved' | 'sold';
  sellerId: string;
  sellerName: string;
  sellerBoutique: string;
  sellerAvatar?: string;
  images: string[];
  measurements: Measurements;
  fabric: string;
  tags: string[];
  createdAt: string;
  featured?: boolean;
  viewsCount?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: string;
}

export interface CourierCheckpoint {
  timestamp: string;
  status: string;
  location: string;
  description: string;
  completed: boolean;
  isCurrent?: boolean;
}

export interface CourierInfo {
  provider: string;
  trackingNumber: string;
  currentHub: string; // e.g. "Metro Sorting Hub (Central Gateway)"
  estimatedDelivery: string;
  timeline: CourierCheckpoint[];
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    province: string;
    zipCode: string;
  };
  items: {
    product: Product;
    quantity: number;
    priceAtPurchase: number;
  }[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: 'credit_card' | 'gcash' | 'maya' | 'paypal' | 'cod';
  paymentStatus: 'paid' | 'pending' | 'processing';
  orderStatus: 'order_placed' | 'item_inspected' | 'handed_to_courier' | 'in_transit' | 'out_for_delivery' | 'delivered';
  courier: CourierInfo;
  createdAt: string;
  sellerIds: string[];
}

export interface FilterState {
  searchQuery: string;
  categories: string[];
  clothingType: string;
  sizes: string[];
  color: string;
  conditions: string[];
  eras: string[];
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: 'latest' | 'sold_first' | 'price_low' | 'price_high' | 'rarity';
  itemsPerPage?: number;
}


export interface Review {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  upvotes?: number;
  upvotedBy?: string[];
}
