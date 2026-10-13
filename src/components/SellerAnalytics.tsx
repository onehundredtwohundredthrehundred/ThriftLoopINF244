import React, { useState, useMemo } from 'react';
import { Package as PackageIcon, RefreshCw as RefreshCwIcon, Eye as EyeIcon, TrendingUp as TrendingUpIcon, BarChart3 as BarChart3Icon, PieChart as PieChartIcon2, Sparkles as SparklesIcon, Layers as LayersIcon, ChevronDown as ChevronDownIcon, ChevronUp as ChevronUpIcon, Tag as TagIcon, DollarSign as DollarSignIcon, ArrowUpRight as ArrowUpRightIcon, Flame as FlameIcon, X as XIcon, Search as SearchIcon, SlidersHorizontal as SlidersHorizontalIcon, ExternalLink as ExternalLinkIcon, Calendar as CalendarIcon, BadgePercent as BadgePercentIcon, Coins as CoinsIcon, ArrowUpDown as ArrowUpDownIcon, ShoppingBag as ShoppingBagIcon, Clock as ClockIcon, ShieldCheck as ShieldCheckIcon, Percent as PercentIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
import { Product, Order } from '../types';
import { useInventory } from '../context/InventoryContext';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';
interface SellerAnalyticsProps {
    products: Product[];
    activeCount: number;
    soldCount: number;
    totalValuation: number;
    totalViews: number;
    orders?: Order[];
}
type DetailModalType = 'active' | 'sold' | 'valuation' | 'views' | null;
const CATEGORY_COLORS: Record<string, string> = {
    'T-Shirts & Tops': '#78350f',
    'Jackets & Outerwear': '#047857',
    'Pants & Denim': '#1e3a8a',
    'Sweatshirts & Hoodies': '#b45309',
    'Dresses & Skirts': '#be123c',
    'Footwear': '#0f766e',
    'Accessories & Bags': '#4338ca',
    'Archival / Rare': '#701a75',
    'Other': '#57534e',
};
const ERA_COLORS = [
    '#78350f',
    '#047857',
    '#b45309',
    '#1e3a8a',
    '#be123c',
    '#0f766e',
    '#701a75',
    '#57534e',
];
export const SellerAnalytics: React.FC<SellerAnalyticsProps> = ({ products, activeCount, soldCount, totalValuation, totalViews, orders = [], }) => {
    const { openProductDetail } = useInventory();
    const [activeTab, setActiveTab] = useState<'earnings' | 'category' | 'era' | 'traffic'> ('earnings');
    const [isExpanded, setIsExpanded] = useState<boolean>(true);
    const [activeModal, setActiveModal] = useState<DetailModalType>(null);
    useBodyScrollLock(!!activeModal);
    const thirtyDaysData = useMemo(() => {
        const result: {
            date: string;
            fullDate: string;
            earnings: number;
            count: number;
            cumulative: number;
        }[] = [];
        const now = new Date();
        const dailyMap = new Map<string, { earnings: number; count: number }>();
    (orders || []).forEach(order => {
        const isPaid = order.paymentStatus === 'paid' || order.paymentMethod === 'credit_card' || (order as any).paymentMethod === 'card';
        if (isPaid && order.createdAt) {
            const orderDate = new Date(order.createdAt);
            const yyyy = orderDate.getFullYear();
            const mm = String(orderDate.getMonth() + 1).padStart(2, '0');
            const dd = String(orderDate.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}-${mm}-${dd}`;
            let orderVal = 0;
            if (order.items && order.items.length > 0) {
                orderVal = order.items.reduce((sum, item) => {
                    return sum + (item.priceAtPurchase || item.product?.price || 0) * (item.quantity || 1);
                }, 0);
            }
            if (orderVal === 0 && order.total) {
                orderVal = order.total;
            }
            const currentVal = dailyMap.get(dateKey) || { earnings: 0, count: 0 };
            dailyMap.set(dateKey, {
                earnings: currentVal.earnings + orderVal,
                count: currentVal.count + 1,
            });
        }
    });
    let runningTotal = 0;
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const shortLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const fullLabel = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const dayStats = dailyMap.get(dateKey) || { earnings: 0, count: 0 };
        runningTotal += dayStats.earnings;
        result.push({
            date: shortLabel,
            fullDate: fullLabel,
            earnings: dayStats.earnings,
            count: dayStats.count,
            cumulative: runningTotal,
        });
    }
    return result;
  }, [orders]);
const total30DayEarnings = useMemo(() => {
    return thirtyDaysData.reduce((sum, d) => sum + d.earnings, 0);
}, [thirtyDaysData]);
const total30DayOrdersCount = useMemo(() => {
    return thirtyDaysData.reduce((sum, d) => sum + d.count, 0);
}, [thirtyDaysData]);
const [modalSearch, setModalSearch] = useState<string>('');
const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('All');
const [modalEraFilter, setModalEraFilter] = useState<string>('All');
const [modalSortBy, setModalSortBy] = useState<'price-desc' | 'price-asc' | 'views-desc' | 'views-asc' | 'name'> ('price-desc');
const [modalCurrentPage, setModalCurrentPage] = useState<number>(1);
const MODAL_ITEMS_PER_PAGE = 20;
const activeProducts = useMemo(() => products.filter(p => p.status === 'available'), [products]);
const soldProducts = useMemo(() => products.filter(p => p.status === 'sold'), [products]);
const avgPrice = useMemo(() => {
    if (activeCount === 0)
        return 0;
    return Math.round(totalValuation / activeCount);
}, [totalValuation, activeCount]);
const totalCatalogCount = activeCount + soldCount;
const sellThroughRate = useMemo(() => {
    if (totalCatalogCount === 0)
        return 0;
    return Math.round((soldCount / totalCatalogCount) * 100);
}, [soldCount, totalCatalogCount]);
const avgViewsPerItem = useMemo(() => {
    if (products.length === 0)
        return 0;
    return Math.round(totalViews / products.length);
}, [totalViews, products.length]);
const totalEstimatedOriginalRetail = useMemo(() => {
    return activeProducts.reduce((acc, p) => acc + (p.originalRetailEstimate || p.price * 1.5) * (p.stock || 1), 0);
}, [activeProducts]);
const categoryData = useMemo(() => {
    const map: Record<string, {
        category: string;
        value: number;
        count: number;
        views: number;
    }> = {};
    activeProducts.forEach(p => {
        const cat = p.category || 'Other';
        if (!map[cat]) {
            map[cat] = { category: cat, value: 0, count: 0, views: 0 };
        }
        map[cat].value += (p.price || 0) * (p.stock || 1);
        map[cat].count += (p.stock || 1);
        map[cat].views += (p.viewsCount || 0);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
}, [activeProducts]);
const eraData = useMemo(() => {
    const map: Record<string, {
        name: string;
        count: number;
        value: number;
    }> = {};
    activeProducts.forEach(p => {
        const eraName = p.era ? `${p.era} Era` : 'Unknown Era';
        if (!map[eraName]) {
            map[eraName] = { name: eraName, count: 0, value: 0 };
        }
        map[eraName].count += (p.stock || 1);
        map[eraName].value += (p.price || 0) * (p.stock || 1);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
}, [activeProducts]);
const topViewedData = useMemo(() => {
    return [...products]
        .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
        .slice(0, 6)
        .map(p => ({
        name: p.title.length > 18 ? p.title.slice(0, 16) + '…' : p.title,
        fullTitle: p.title,
        views: p.viewsCount || 0,
        price: p.price,
        brand: p.brand,
    }));
}, [products]);
const topValuedItem = useMemo(() => {
    if (activeProducts.length === 0)
        return null;
    return [...activeProducts].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
}, [activeProducts]);
const topPurchasedItem = useMemo(() => {
    if (soldProducts.length > 0) {
        return [...soldProducts].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
    }
    if (activeProducts.length > 0) {
        return [...activeProducts].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
    }
    return null;
}, [soldProducts, activeProducts]);
const lowestValuedItem = useMemo(() => {
    if (activeProducts.length === 0)
        return null;
    return [...activeProducts].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
}, [activeProducts]);
const mostPopularItem = useMemo(() => {
    if (products.length === 0)
        return null;
    return [...products].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))[0];
}, [products]);
const modalFilteredProducts = useMemo(() => {
    let list = activeModal === 'sold' ? [...soldProducts] : [...activeProducts];
    if (activeModal === 'views') {
        list = [...products];
    }
    if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase().trim();
        list = list.filter(p => p.title.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.era.toLowerCase().includes(q) ||
            (p.conditionNotes && p.conditionNotes.toLowerCase().includes(q)));
    }
    if (modalCategoryFilter !== 'All') {
        list = list.filter(p => p.category === modalCategoryFilter);
    }
    if (modalEraFilter !== 'All') {
        list = list.filter(p => p.era === modalEraFilter);
    }
    list.sort((a, b) => {
        if (modalSortBy === 'price-desc')
            return (b.price || 0) - (a.price || 0);
        if (modalSortBy === 'price-asc')
            return (a.price || 0) - (b.price || 0);
        if (modalSortBy === 'views-desc')
            return (b.viewsCount || 0) - (a.viewsCount || 0);
        if (modalSortBy === 'views-asc')
            return (a.viewsCount || 0) - (b.viewsCount || 0);
        if (modalSortBy === 'name')
            return a.title.localeCompare(b.title);
        return 0;
    });
    return list;
}, [activeModal, activeProducts, soldProducts, products, modalSearch, modalCategoryFilter, modalEraFilter, modalSortBy]);
const totalModalPages = Math.max(1, Math.ceil(modalFilteredProducts.length / MODAL_ITEMS_PER_PAGE));
const safeModalPage = Math.min(Math.max(1, modalCurrentPage), totalModalPages);
const paginatedModalProducts = useMemo(() => {
    const start = (safeModalPage - 1) * MODAL_ITEMS_PER_PAGE;
    return modalFilteredProducts.slice(start, start + MODAL_ITEMS_PER_PAGE);
}, [modalFilteredProducts, safeModalPage]);
const distinctCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).filter(Boolean);
}, [products]);
const distinctEras = useMemo(() => {
    return Array.from(new Set(products.map(p => p.era))).filter(Boolean);
}, [products]);
const handleOpenModal = (type: DetailModalType) => {
    setActiveModal(type);
    setModalSearch('');
    setModalCategoryFilter('All');
    setModalEraFilter('All');
    setModalCurrentPage(1);
    if (type === 'views') {
        setModalSortBy('views-desc');
    }
    else {
        setModalSortBy('price-desc');
    }
};
const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (<div className="bg-stone-950/95 text-stone-100 p-2.5 sm:p-3 rounded-xl text-xs shadow-2xl border border-stone-700 backdrop-blur-md font-sans max-w-[220px] sm:max-w-xs">
          <p className="font-bold text-amber-200 text-xs sm:text-sm mb-1 line-clamp-1">{label || data.category || data.name}</p>
          <div className="space-y-1 text-[11px] sm:text-xs text-stone-300">
            {data.value !== undefined && (<div className="flex items-center justify-between gap-3">
                <span className="text-stone-400">Valuation:</span>
                <span className="font-bold text-emerald-400">₱{data.value.toLocaleString()}</span>
              </div>)}
            {data.count !== undefined && (<div className="flex items-center justify-between gap-3">
                <span className="text-stone-400">Pieces:</span>
                <span className="font-bold text-stone-100">{data.count} pcs</span>
              </div>)}
            {data.views !== undefined && (<div className="flex items-center justify-between gap-3">
                <span className="text-stone-400">Views:</span>
                <span className="font-bold text-amber-300">{data.views.toLocaleString()}</span>
              </div>)}
            {data.price !== undefined && (<div className="flex items-center justify-between gap-3">
                <span className="text-stone-400">Price:</span>
                <span className="font-bold text-amber-300">₱{data.price.toLocaleString()}</span>
              </div>)}
          </div>
        </div>);
    }
    return null;
};
const CustomEarningsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (<div className="bg-stone-950/95 text-stone-100 p-3 rounded-xl text-xs shadow-2xl border border-stone-700 backdrop-blur-md font-sans max-w-xs">
          <p className="font-bold text-amber-200 text-xs mb-1">{data.fullDate || label}</p>
          <div className="space-y-1 text-[11px] text-stone-300">
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-400">Daily Revenue:</span>
              <span className="font-bold text-emerald-400">₱{data.earnings.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-stone-400">Orders Processed:</span>
              <span className="font-bold text-stone-100">{data.count} order(s)</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-800">
              <span className="text-stone-400">30-Day Cumulative:</span>
              <span className="font-bold text-amber-300">₱{data.cumulative.toLocaleString()}</span>
            </div>
          </div>
        </div>);
    }
    return null;
};
return (<div className="space-y-4">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">

        <button type="button" onClick={() => handleOpenModal('active')} className="group text-left bg-white p-3 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden active:scale-[0.98]" title="Click to view full Active Listings breakdown">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-wider text-stone-500 font-bold block truncate">
                  Active
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded group-hover:bg-amber-200 transition-colors shrink-0">
                  Details →
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1 sm:mt-1.5">
                <span className="font-sans text-xl sm:text-2xl xl:text-3xl font-bold text-stone-950 tracking-tight truncate" title={`Active Listings: ${activeCount.toLocaleString()}`}>
                  {activeCount.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs text-stone-400 font-medium font-sans">pcs</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PackageIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-stone-100 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-500 font-sans">
            <span className="truncate">In vault</span>
            <span className="font-semibold text-stone-700 group-hover:text-amber-900 transition-colors shrink-0 ml-1">
              {totalCatalogCount > 0 ? `${Math.round((activeCount / totalCatalogCount) * 100)}%` : '100%'}
            </span>
          </div>
        </button>

        <button type="button" onClick={() => handleOpenModal('sold')} className="group text-left bg-white p-3 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-stone-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden active:scale-[0.98]" title="Click to view full Archived / Sold items ledger">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-wider text-stone-500 font-bold block truncate">
                  Sold
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-stone-700 bg-stone-100 px-1 py-0.2 rounded group-hover:bg-stone-200 transition-colors shrink-0">
                  Details →
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1 sm:mt-1.5">
                <span className="font-sans text-xl sm:text-2xl xl:text-3xl font-bold text-stone-950 tracking-tight truncate" title={`Archived / Sold Items: ${soldCount.toLocaleString()}`}>
                  {soldCount.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs text-stone-400 font-medium font-sans">pcs</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <RefreshCwIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-stone-100 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-500 font-sans">
            <span className="truncate">Sell-through</span>
            <span className="font-semibold text-stone-700 group-hover:text-stone-950 transition-colors shrink-0 ml-1">{sellThroughRate}%</span>
          </div>
        </button>

        <button type="button" onClick={() => handleOpenModal('valuation')} className="group text-left bg-white p-3 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden active:scale-[0.98]" title="Click to view full Total Inventory Valuation Ledger">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-wider text-stone-500 font-bold block truncate">
                  Valuation
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-1 py-0.2 rounded group-hover:bg-emerald-200 transition-colors shrink-0">
                  Details →
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1 sm:mt-1.5">
                <span className="font-sans text-lg sm:text-2xl xl:text-3xl font-bold text-emerald-900 tracking-tight truncate block" title={`Total Inventory Valuation: ₱${totalValuation.toLocaleString()}`}>
                  ₱{totalValuation.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/70 text-emerald-900 flex items-center justify-center font-bold text-base sm:text-lg font-sans shrink-0 group-hover:scale-105 transition-transform">
              ₱
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-stone-100 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-500 font-sans">
            <span className="truncate">Avg / piece</span>
            <span className="font-semibold text-emerald-800 group-hover:text-emerald-950 transition-colors shrink-0 ml-1">₱{avgPrice.toLocaleString()}</span>
          </div>
        </button>

        <button type="button" onClick={() => handleOpenModal('views')} className="group text-left bg-white p-3 sm:p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between min-w-0 transition-all duration-200 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative overflow-hidden active:scale-[0.98]" title="Click to view full Item Views & Traffic Analytics">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-wider text-stone-500 font-bold block truncate">
                  Views
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-900 bg-amber-100/80 px-1 py-0.2 rounded group-hover:bg-amber-200 transition-colors shrink-0">
                  Details →
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1 sm:mt-1.5">
                <span className="font-sans text-xl sm:text-2xl xl:text-3xl font-bold text-amber-900 tracking-tight truncate" title={`Total Views: ${totalViews.toLocaleString()}`}>
                  {totalViews.toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs text-stone-400 font-medium font-sans">views</span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-stone-100 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-500 font-sans">
            <span className="truncate">Avg / item</span>
            <span className="font-semibold text-amber-800 group-hover:text-amber-950 transition-colors shrink-0 ml-1">{avgViewsPerItem.toLocaleString()}</span>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden font-sans">

        <div className="p-3.5 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FCFAF6]/70">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-100 flex items-center justify-center shrink-0">
                <BarChart3Icon className="w-4 h-4"/>
              </div>
              <div>
                <h3 className="font-sans text-sm sm:text-base font-bold text-stone-900 leading-tight">
                  Inventory Analytics & Trends
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5 hidden xs:block">
                  Valuation, eras, and garment traffic insights.
                </p>
              </div>
            </div>

            <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="sm:hidden p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer shrink-0" title={isExpanded ? 'Collapse Chart' : 'Expand Chart'}>
              {isExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">

            <div className="flex items-center p-1 bg-stone-100/90 rounded-xl border border-stone-200/80 text-xs w-full sm:w-auto overflow-x-auto">
              <button type="button" onClick={() => {
        setActiveTab('earnings');
        setIsExpanded(true);
    }} className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer text-xs ${activeTab === 'earnings'
        ? 'bg-emerald-900 text-emerald-50 shadow-xs'
        : 'text-stone-600 hover:text-stone-900'}`}>
                <TrendingUpIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0"/>
                <span>Monthly Revenue</span>
              </button>

              <button type="button" onClick={() => {
        setActiveTab('category');
        setIsExpanded(true);
    }} className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer text-xs ${activeTab === 'category'
        ? 'bg-white text-stone-950 shadow-xs'
        : 'text-stone-600 hover:text-stone-900'}`}>
                <LayersIcon className="w-3.5 h-3.5 text-amber-800 shrink-0"/>
                <span>Categories</span>
              </button>

              <button type="button" onClick={() => {
        setActiveTab('era');
        setIsExpanded(true);
    }} className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer text-xs ${activeTab === 'era'
        ? 'bg-white text-stone-950 shadow-xs'
        : 'text-stone-600 hover:text-stone-900'}`}>
                <PieChartIcon2 className="w-3.5 h-3.5 text-emerald-800 shrink-0"/>
                <span>Eras</span>
              </button>

              <button type="button" onClick={() => {
        setActiveTab('traffic');
        setIsExpanded(true);
    }} className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer text-xs ${activeTab === 'traffic'
        ? 'bg-white text-stone-950 shadow-xs'
        : 'text-stone-600 hover:text-stone-900'}`}>
                <FlameIcon className="w-3.5 h-3.5 text-rose-700 shrink-0"/>
                <span>Top Traffic</span>
              </button>
            </div>

            <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="hidden sm:inline-flex p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer" title={isExpanded ? 'Collapse Chart' : 'Expand Chart'}>
              {isExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
            </button>
          </div>
        </div>

        {isExpanded && (<div className="p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

            <div className="lg:col-span-8 min-w-0 bg-stone-50/70 p-3 sm:p-5 rounded-2xl border border-stone-100">

              {activeTab === 'earnings' && (<div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                        <span>Total Earnings from Processed Stripe Payments (Last 30 Days)</span>
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-stone-500">
                        Processed card payouts and total earnings accumulated over the last 30 days.
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-sm sm:text-base font-black text-emerald-900 font-sans">
                        ₱{total30DayEarnings.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-stone-500 font-sans font-medium">
                        {total30DayOrdersCount} order(s) processed
                      </p>
                    </div>
                  </div>

                  <div className="h-56 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={thirtyDaysData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                        <defs>
                          <linearGradient id="stripeEarningsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4"/>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716c' }} interval={2} angle={-20} textAnchor="end" height={38}/>
                        <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}/>
                        <Tooltip content={<CustomEarningsTooltip />}/>
                        <Area type="monotone" dataKey="earnings" name="Stripe Earnings" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#stripeEarningsGradient)" activeDot={{ r: 6, fill: '#047857', stroke: '#ffffff', strokeWidth: 2 }}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>)}

              {activeTab === 'category' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                        Valuation by Item Category (₱)
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-stone-500">
                        Asset worth and stock count across item types.
                      </p>
                    </div>
                    <button type="button" onClick={() => handleOpenModal('valuation')} className="text-xs font-semibold text-amber-900 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer shrink-0">
                      <span className="hidden xs:inline">View Details</span>
                      <ArrowUpRightIcon className="w-3.5 h-3.5"/>
                    </button>
                  </div>

                  {categoryData.length === 0 ? (<div className="h-52 sm:h-64 flex flex-col items-center justify-center text-stone-400 text-xs">
                      <LayersIcon className="w-7 h-7 text-stone-300 mb-2"/>
                      <p>No active inventory listings to display.</p>
                    </div>) : (<div className="h-56 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} margin={{ top: 10, right: 5, left: -20, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4"/>
                          <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#78716c' }} interval={0} angle={-25} textAnchor="end" height={45}/>
                          <YAxis tick={{ fontSize: 10, fill: '#78716c' }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}/>
                          <Tooltip content={<CustomBarTooltip />}/>
                          <Bar dataKey="value" name="Valuation" fill="#78350f" radius={[6, 6, 0, 0]}>
                            {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || ERA_COLORS[index % ERA_COLORS.length]}/>))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>)}
                </div>
              )}

              {activeTab === 'era' && (<div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                        Vintage Era Item Distribution
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-stone-500">
                        Item distribution across historic fashion decades.
                      </p>
                    </div>
                    <button type="button" onClick={() => handleOpenModal('active')} className="text-xs font-semibold text-amber-900 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer shrink-0">
                      <span className="hidden xs:inline">Explore Eras</span>
                      <ArrowUpRightIcon className="w-3.5 h-3.5"/>
                    </button>
                  </div>

                  {eraData.length === 0 ? (<div className="h-52 sm:h-64 flex flex-col items-center justify-center text-stone-400 text-xs">
                      <PieChartIcon2 className="w-7 h-7 text-stone-300 mb-2"/>
                      <p>No active era data available.</p>
                    </div>) : (<div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
                      <div className="sm:col-span-7 h-52 sm:h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={eraData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={38} paddingAngle={3}>
                              {eraData.map((_, index) => (<Cell key={`cell-${index}`} fill={ERA_COLORS[index % ERA_COLORS.length]}/>))}
                            </Pie>
                            <Tooltip content={<CustomBarTooltip />}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="sm:col-span-5 grid grid-cols-2 sm:grid-cols-1 gap-1.5 text-xs">
                        {eraData.map((entry, index) => {
                    const percent = Math.round((entry.count / (activeCount || 1)) * 100);
                    return (<div key={entry.name} className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-white/70 sm:bg-transparent border border-stone-200/60 sm:border-0 hover:bg-stone-100 transition-colors">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ERA_COLORS[index % ERA_COLORS.length] }}/>
                                <span className="font-medium text-stone-800 truncate text-[11px]">{entry.name}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-stone-950 text-[11px]">{entry.count}</span>
                                <span className="text-stone-400 text-[10px] ml-0.5">({percent}%)</span>
                              </div>
                            </div>);
                })}
                      </div>
                    </div>)}
                </div>)}

              {activeTab === 'traffic' && (<div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                        Most Viewed Items
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-stone-500">
                        Items generating the highest buyer interest.
                      </p>
                    </div>
                    <button type="button" onClick={() => handleOpenModal('views')} className="text-xs font-semibold text-amber-900 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer shrink-0">
                      <span className="hidden xs:inline">Full Traffic</span>
                      <ArrowUpRightIcon className="w-3.5 h-3.5"/>
                    </button>
                  </div>

                  {topViewedData.length === 0 ? (<div className="h-52 sm:h-64 flex flex-col items-center justify-center text-stone-400 text-xs">
                      <FlameIcon className="w-7 h-7 text-stone-300 mb-2"/>
                      <p>No garment views tracked yet.</p>
                    </div>) : (<div className="h-56 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topViewedData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4"/>
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#78716c' }}/>
                          <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 10, fill: '#44403c' }}/>
                          <Tooltip content={<CustomBarTooltip />}/>
                          <Bar dataKey="views" name="Views" fill="#b45309" radius={[0, 6, 6, 0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>)}
                </div>)}

            </div>

            <div className="lg:col-span-4 space-y-3">

              {topPurchasedItem && (<div onClick={() => openProductDetail(topPurchasedItem)} className="bg-[#FAF7F2] p-3.5 rounded-xl border border-amber-200/70 hover:border-amber-400 transition-colors cursor-pointer group active:scale-[0.99]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1">
                      <TagIcon className="w-3 h-3 text-amber-700"/> Most Expensive Purchased Item
                    </span>
                    <ExternalLinkIcon className="w-3 h-3 text-amber-800 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </div>
                  <p className="font-bold text-stone-900 text-xs mt-1 line-clamp-1 group-hover:text-amber-900 transition-colors">
                    {topPurchasedItem.title}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-stone-500 text-[11px] truncate max-w-[150px]">{topPurchasedItem.brand} • {topPurchasedItem.era}</span>
                    <span className="font-bold text-emerald-800 shrink-0">₱{topPurchasedItem.price.toLocaleString()}</span>
                  </div>
                </div>)}

              {mostPopularItem && (<div onClick={() => openProductDetail(mostPopularItem)} className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer group active:scale-[0.99]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider flex items-center gap-1">
                      <FlameIcon className="w-3 h-3 text-rose-600"/> Most Viewed Item
                    </span>
                    <ExternalLinkIcon className="w-3 h-3 text-rose-800 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </div>
                  <p className="font-bold text-stone-900 text-xs mt-1 line-clamp-1 group-hover:text-rose-900 transition-colors">
                    {mostPopularItem.title}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-stone-500 text-[11px]">₱{mostPopularItem.price.toLocaleString()}</span>
                    <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                      <EyeIcon className="w-3 h-3 text-amber-700"/> {mostPopularItem.viewsCount || 0} views
                    </span>
                  </div>
                </div>)}

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-stone-600 tracking-wider flex items-center gap-1">
                  <TrendingUpIcon className="w-3 h-3 text-stone-500"/> Catalog Composition
                </span>
                <div className="space-y-1.5 mt-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-[11px]">Distinct Categories:</span>
                    <span className="font-bold text-stone-900">{categoryData.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-[11px]">Active Eras:</span>
                    <span className="font-bold text-stone-900">{eraData.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-[11px]">Average Price:</span>
                    <span className="font-bold text-emerald-800">₱{avgPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>)}
      </div>

      {activeModal && (<div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 w-screen h-screen overflow-y-auto animate-in fade-in duration-200 font-sans" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl w-full max-w-5xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-stone-900 my-0 sm:my-auto animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200" onClick={(e) => e.stopPropagation()}>

            <div className="p-4 sm:p-6 border-b border-stone-200 flex items-start sm:items-center justify-between bg-[#FCFAF6] shrink-0 gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shadow-xs shrink-0 text-white bg-stone-900">
                  {activeModal === 'active' && <PackageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300"/>}
                  {activeModal === 'sold' && <RefreshCwIcon className="w-5 h-5 sm:w-6 sm:h-6 text-stone-300"/>}
                  {activeModal === 'valuation' && <span className="font-bold text-lg sm:text-xl text-emerald-300 font-sans">₱</span>}
                  {activeModal === 'views' && <EyeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300"/>}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold text-stone-950 font-sans truncate">
                    {activeModal === 'active' && `Active Listings (${activeCount})`}
                    {activeModal === 'sold' && `Archived & Sold (${soldCount})`}
                    {activeModal === 'valuation' && `Valuation Ledger (₱${totalValuation.toLocaleString()})`}
                    {activeModal === 'views' && `Item Views (${totalViews.toLocaleString()})`}
                  </h3>
                </div>
              </div>

              <button type="button" onClick={() => setActiveModal(null)} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer shrink-0" title="Close Details Modal">
                <XIcon className="w-5 h-5"/>
              </button>
            </div>

            <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-stone-100/80 border-b border-stone-200 flex items-center gap-1 sm:gap-1.5 overflow-x-auto text-xs shrink-0">
              <button type="button" onClick={() => handleOpenModal('active')} className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 text-xs shrink-0 ${activeModal === 'active'
            ? 'bg-amber-900 text-amber-50 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'}`}>
                <PackageIcon className="w-3.5 h-3.5 shrink-0"/>
                <span>Active ({activeCount})</span>
              </button>

              <button type="button" onClick={() => handleOpenModal('sold')} className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 text-xs shrink-0 ${activeModal === 'sold'
            ? 'bg-stone-900 text-stone-50 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'}`}>
                <RefreshCwIcon className="w-3.5 h-3.5 shrink-0"/>
                <span>Sold ({soldCount})</span>
              </button>

              <button type="button" onClick={() => handleOpenModal('valuation')} className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 text-xs shrink-0 ${activeModal === 'valuation'
            ? 'bg-emerald-900 text-emerald-50 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'}`}>
                <DollarSignIcon className="w-3.5 h-3.5 shrink-0"/>
                <span>Valuation (₱{totalValuation.toLocaleString()})</span>
              </button>

              <button type="button" onClick={() => handleOpenModal('views')} className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 text-xs shrink-0 ${activeModal === 'views'
            ? 'bg-amber-800 text-amber-50 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'}`}>
                <EyeIcon className="w-3.5 h-3.5 shrink-0"/>
                <span>Views ({totalViews.toLocaleString()})</span>
              </button>
            </div>

            <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">

              {activeModal === 'valuation' && (<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                  <div className="bg-[#FAF7F2] p-3 sm:p-3.5 rounded-2xl border border-amber-200/80">
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Vault Worth</span>
                    <span className="font-bold text-lg sm:text-2xl text-emerald-900 font-sans mt-0.5 block truncate">
                      ₱{totalValuation.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-500 mt-0.5 block">{activeCount} pieces</span>
                  </div>

                  <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Est. Original Retail</span>
                    <span className="font-bold text-base sm:text-xl text-stone-900 font-sans mt-0.5 block truncate">
                      ₱{Math.round(totalEstimatedOriginalRetail).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block truncate">
                      ~{totalEstimatedOriginalRetail > 0 ? Math.round(((totalEstimatedOriginalRetail - totalValuation) / totalEstimatedOriginalRetail) * 100) : 0}% thrift discount
                    </span>
                  </div>

                  <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Avg Garment Price</span>
                    <span className="font-bold text-base sm:text-xl text-stone-900 font-sans mt-0.5 block truncate">
                      ₱{avgPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-500 mt-0.5 block">per piece</span>
                  </div>

                  <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Price Range</span>
                    <span className="font-bold text-xs sm:text-base text-stone-900 font-sans mt-1 block truncate">
                      ₱{(lowestValuedItem?.price || 0).toLocaleString()} – ₱{(topValuedItem?.price || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-500 mt-0.5 block">min to max</span>
                  </div>
                </div>)}

              {(activeModal === 'valuation' || activeModal === 'active') && categoryData.length > 0 && (<div className="bg-stone-50/80 rounded-2xl border border-stone-200 p-3.5 sm:p-5">
                  <h4 className="font-bold text-stone-950 text-xs sm:text-sm flex items-center gap-1.5 mb-2.5">
                    <LayersIcon className="w-4 h-4 text-amber-900"/>
                    <span>Category Valuation Matrix</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[340px]">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500 uppercase text-[9px] sm:text-[10px] tracking-wider">
                          <th className="py-2 px-2 sm:px-3 font-bold">Category</th>
                          <th className="py-2 px-2 sm:px-3 font-bold text-center">Pcs</th>
                          <th className="py-2 px-2 sm:px-3 font-bold text-right">Valuation</th>
                          <th className="py-2 px-2 sm:px-3 font-bold text-right hidden sm:table-cell">Avg Price</th>
                          <th className="py-2 px-2 sm:px-3 font-bold text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200/60 font-sans text-xs">
                        {categoryData.map(cat => {
                const percent = totalValuation > 0 ? Math.round((cat.value / totalValuation) * 100) : 0;
                const avgCatPrice = cat.count > 0 ? Math.round(cat.value / cat.count) : 0;
                return (<tr key={cat.category} className="hover:bg-stone-100/60 transition-colors">
                              <td className="py-2 px-2 sm:px-3 font-bold text-stone-900 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#78350f' }}/>
                                <span className="truncate max-w-[130px] sm:max-w-none">{cat.category}</span>
                              </td>
                              <td className="py-2 px-2 sm:px-3 text-center text-stone-700 font-semibold">{cat.count}</td>
                              <td className="py-2 px-2 sm:px-3 text-right font-bold text-emerald-900">₱{cat.value.toLocaleString()}</td>
                              <td className="py-2 px-2 sm:px-3 text-right text-stone-600 hidden sm:table-cell">₱{avgCatPrice.toLocaleString()}</td>
                              <td className="py-2 px-2 sm:px-3 text-right">
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-stone-200/70 text-stone-800 font-bold text-[10px]">
                                  {percent}%
                                </span>
                              </td>
                            </tr>);
            })}
                      </tbody>
                    </table>
                  </div>
                </div>)}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#FAF7F2] p-3 rounded-2xl border border-stone-200/80">

                <div className="relative flex-1">
                  <SearchIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                  <input type="text" value={modalSearch} onChange={(e) => {
            setModalSearch(e.target.value);
            setModalCurrentPage(1);
        }} placeholder="Search by title, brand, era..." className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 font-sans"/>
                  {modalSearch && (<button type="button" onClick={() => {
                setModalSearch('');
                setModalCurrentPage(1);
            }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
                      <XIcon className="w-3.5 h-3.5"/>
                    </button>)}
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">

                  <select value={modalCategoryFilter} onChange={(e) => {
            setModalCategoryFilter(e.target.value);
            setModalCurrentPage(1);
        }} className="w-full sm:w-auto px-2 py-2 bg-white rounded-xl border border-stone-200 text-[11px] sm:text-xs text-stone-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800/30 font-sans cursor-pointer truncate">
                    <option value="All">All Categories ({distinctCategories.length})</option>
                    {distinctCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>

                  <select value={modalEraFilter} onChange={(e) => {
            setModalEraFilter(e.target.value);
            setModalCurrentPage(1);
        }} className="w-full sm:w-auto px-2 py-2 bg-white rounded-xl border border-stone-200 text-[11px] sm:text-xs text-stone-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800/30 font-sans cursor-pointer truncate">
                    <option value="All">All Eras ({distinctEras.length})</option>
                    {distinctEras.map(era => (<option key={era} value={era}>{era}</option>))}
                  </select>

                  <select value={modalSortBy} onChange={(e) => {
            setModalSortBy(e.target.value as any);
            setModalCurrentPage(1);
        }} className="col-span-2 sm:col-span-1 w-full sm:w-auto px-2 py-2 bg-white rounded-xl border border-stone-200 text-[11px] sm:text-xs text-stone-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800/30 font-sans cursor-pointer">
                    {activeModal === 'views' ? (<>
                        <option value="views-desc">Most Viewed</option>
                        <option value="views-asc">Least Viewed</option>
                      </>) : (<>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="views-desc">Most Viewed</option>
                        <option value="views-asc">Least Viewed</option>
                        <option value="name">Alphabetical</option>
                      </>)}
                  </select>
                </div>
              </div>

              {modalFilteredProducts.length === 0 ? (<div className="p-8 sm:p-12 text-center text-stone-400 text-xs font-sans bg-white border border-stone-200 rounded-2xl">
                  <SearchIcon className="w-8 h-8 mx-auto mb-2 text-stone-300"/>
                  <p className="font-bold text-stone-600">No items match your filter criteria.</p>
                  <p className="mt-1">Try resetting the search query or adjusting your filters.</p>
                </div>) : (<>

                  <div className="space-y-2.5 sm:hidden">
                    {paginatedModalProducts.map(item => {
                const lineValuation = (item.price || 0) * (item.stock || 1);
                return (<div key={item.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex gap-3 items-center">
                          <div className="w-16 h-20 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                            <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=300'} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                          </div>

                          <div className="min-w-0 flex-1 flex flex-col justify-between h-20">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900 truncate">
                                  {item.brand}
                                </span>
                                <span className="text-[10px] text-stone-500 font-semibold bg-stone-100 px-1.5 py-0.2 rounded shrink-0">
                                  {item.era}
                                </span>
                              </div>
                              <h5 onClick={() => openProductDetail(item)} className="font-bold text-stone-900 text-xs truncate hover:text-amber-800 cursor-pointer">
                                {item.title}
                              </h5>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-stone-500">
                                <span>Size: {item.size}</span>
                                <span>•</span>
                                <span>{item.condition}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-stone-100">
                              <div className="flex items-baseline gap-1">
                                <span className="font-bold text-stone-950 text-xs">
                                  ₱{item.price?.toLocaleString()}
                                </span>
                                {item.status === 'sold' && (<span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1 rounded">Sold</span>)}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-amber-900 flex items-center gap-0.5">
                                  <EyeIcon className="w-2.5 h-2.5 text-amber-700"/>
                                  {item.viewsCount || 0}
                                </span>
                                <button type="button" onClick={() => openProductDetail(item)} className="px-2 py-0.5 bg-stone-900 text-amber-50 rounded-lg text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer shadow-xs active:bg-amber-900">
                                  <span>View</span>
                                  <ExternalLinkIcon className="w-2.5 h-2.5"/>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>);
            })}
                  </div>

                  <div className="hidden sm:block border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-[#FAF7F2] border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-4 font-bold">Garment Item</th>
                            <th className="py-3 px-3 font-bold">Category & Era</th>
                            <th className="py-3 px-3 font-bold">Condition</th>
                            <th className="py-3 px-3 font-bold text-center">Stock</th>
                            <th className="py-3 px-3 font-bold text-right">Price</th>
                            {activeModal === 'valuation' && (<th className="py-3 px-3 font-bold text-right">Line Valuation</th>)}
                            <th className="py-3 px-3 font-bold text-center">Views</th>
                            <th className="py-3 px-4 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {paginatedModalProducts.map(item => {
                const lineValuation = (item.price || 0) * (item.stock || 1);
                return (<tr key={item.id} className="hover:bg-stone-50/80 transition-colors">

                                <td className="py-3 px-4 max-w-[240px]">
                                  <div className="flex items-center gap-3">
                                    <div className="w-11 h-14 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                                      <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=300'} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block truncate">
                                        {item.brand}
                                      </span>
                                      <h5 onClick={() => openProductDetail(item)} className="font-bold text-stone-900 truncate hover:text-amber-800 cursor-pointer text-xs" title={item.title}>
                                        {item.title}
                                      </h5>
                                      <span className="text-[10px] text-stone-400 block font-medium mt-0.5">
                                        Size: {item.size}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="font-semibold text-stone-800 block text-xs truncate">
                                    {item.category}
                                  </span>
                                  <span className="inline-block mt-0.5 text-[10px] text-amber-900 bg-amber-100/70 px-1.5 py-0.2 rounded font-medium">
                                    {item.era}
                                  </span>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                                    <TagIcon className="w-2.5 h-2.5 text-stone-400"/>
                                    <span>{item.condition}</span>
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  {item.status === 'sold' || item.stock === 0 ? (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      Sold Out
                                    </span>) : item.stock > 1 ? (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      {item.stock} left
                                    </span>) : (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                      1 piece
                                    </span>)}
                                </td>

                                <td className="py-3 px-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold text-stone-950 text-xs">
                                      ₱{item.price?.toLocaleString()}
                                    </span>
                                    {item.isOnSale && item.regularPrice && (<span className="text-[10px] text-rose-700 line-through">
                                        ₱{item.regularPrice?.toLocaleString()}
                                      </span>)}
                                  </div>
                                </td>

                                {activeModal === 'valuation' && (<td className="py-3 px-3 text-right">
                                    <span className="font-bold text-emerald-900 text-xs">
                                      ₱{lineValuation.toLocaleString()}
                                    </span>
                                  </td>)}

                                <td className="py-3 px-3 text-center">
                                  <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                                    <EyeIcon className="w-3 h-3 text-amber-700"/>
                                    <span>{item.viewsCount || 0}</span>
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <button type="button" onClick={() => openProductDetail(item)} className="px-2.5 py-1 bg-stone-900 hover:bg-amber-900 text-amber-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs">
                                    <span>Inspect</span>
                                    <ExternalLinkIcon className="w-3 h-3"/>
                                  </button>
                                </td>
                              </tr>);
            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>)}

            </div>

            <div className="p-3 sm:px-6 py-2.5 sm:py-3 border-t border-stone-200 bg-[#FCFAF6] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 shrink-0 font-sans">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs">
                {modalFilteredProducts.length === 0 ? (<span>Showing 0 items</span>) : (<span>
                    Showing <span className="font-bold text-stone-900">{(safeModalPage - 1) * MODAL_ITEMS_PER_PAGE + 1}–{Math.min(safeModalPage * MODAL_ITEMS_PER_PAGE, modalFilteredProducts.length)}</span> of <span className="font-bold text-stone-900">{modalFilteredProducts.length}</span> items
                  </span>)}
              </div>

              {totalModalPages > 1 && (<div className="flex items-center gap-1.5">
                  <button type="button" disabled={safeModalPage <= 1} onClick={() => setModalCurrentPage(prev => Math.max(1, prev - 1))} className="px-2.5 py-1 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white border border-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer">
                    Prev
                  </button>

                  <span className="text-[11px] font-semibold text-stone-600 px-2">
                    Page {safeModalPage} of {totalModalPages}
                  </span>

                  <button type="button" disabled={safeModalPage >= totalModalPages} onClick={() => setModalCurrentPage(prev => Math.min(totalModalPages, prev + 1))} className="px-2.5 py-1 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white border border-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer">
                    Next
                  </button>
                </div>)}

              <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 sm:px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl transition-colors cursor-pointer text-xs">
                Close
              </button>
            </div>

          </div>
        </div>)}
    </div>
  );
};
