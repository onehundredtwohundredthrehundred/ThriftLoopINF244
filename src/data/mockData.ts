import { Product, Order } from '../types';

const BASE_PRODUCTS: Product[] = [];

export const INITIAL_PRODUCTS: Product[] = [
  ...BASE_PRODUCTS
];

export const INITIAL_ORDERS: Order[] = [];

export const CATEGORIES = [
  'All Vintage',
  'Jackets & Outerwear',
  'T-Shirts & Tops',
  'Denim & Pants',
  'Knitwear & Sweaters',
  'Dresses & Skirts',
  'Accessories & Bags'
];

export const ERAS = ['All Eras', '90s', '80s', 'Y2K', '70s', '00s'];
export const SIZES = ['All Sizes', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '28W', '32W'];
export const CONDITIONS: { grade: string; label: string; desc: string; badgeColor: string }[] = [
  {
    grade: 'Mint',
    label: 'Mint',
    desc: 'Flawless archival condition, deadstock or barely used.',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  {
    grade: 'Lightly Used',
    label: 'Lightly Used',
    desc: 'Gently worn with subtle signs of use; no major flaws, repairs, or stains.',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  {
    grade: 'Flawed',
    label: 'Flawed',
    desc: 'Visible imperfections with noticeable wear, repairs, stains, and/or pinholes.',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
  }
];
