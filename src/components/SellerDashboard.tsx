import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  Store, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Archive,
  Package, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  RefreshCw, 
  Image as ImageIcon,
  Tag,
  Ruler,
  Scissors,
  Truck,
  MapPin,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Boxes,
  Layers,
  Minus,
  Loader2,
  X,
  User
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Product, ConditionGrade, Order } from '../types';
import { CATEGORIES, ERAS, SIZES, CONDITIONS } from '../data/mockData';
import { SellerAnalytics } from './SellerAnalytics';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';


const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { width: number; height: number; x: number; y: number }
): Promise<string | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  canvas.width = image.width
  canvas.height = image.height

  ctx.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')
  if (!croppedCtx) return null

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return croppedCanvas.toDataURL('image/jpeg', 0.9)
}

export const SellerDashboard: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    setIsPrintReportOpen,
    openProductDetail,
    setIsStoreProfileModalOpen,
    openSellerProfile
  } = useInventory();
  const { currentUser } = useAuth();
  const { orders, openOrderTracking } = useCart();

  const [isUploadingNew, setIsUploadingNew] = useState(false);

  // Editing Item State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Multi-Select & Bulk Actions State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkSaleModalOpen, setIsBulkSaleModalOpen] = useState(false);
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<number>(20);

  // Confirm Delete, Archive & Remove Sale Modals State
  const [deleteModalItems, setDeleteModalItems] = useState<Product[] | null>(null);
  const [archiveModalItems, setArchiveModalItems] = useState<Product[] | null>(null);
  const [removeSaleModalItems, setRemoveSaleModalItems] = useState<Product[] | null>(null);

  // Form State for New/Editing Vintage Item
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [era, setEra] = useState('90s');
  const [category, setCategory] = useState('Jackets & Outerwear');
  const [clothingType, setClothingType] = useState('');
  const [size, setSize] = useState('L');
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState<ConditionGrade>('Mint');
  const [conditionNotes, setConditionNotes] = useState('');
  const [hasWearsOrTears, setHasWearsOrTears] = useState(true);
  const [wearDetailText, setWearDetailText] = useState('');
  const [price, setPrice] = useState<number>(1);
  const [originalRetailEstimate, setOriginalRetailEstimate] = useState<number>(1);
  const [images, setImages] = useState<string[]>([]);
  const [tempUrl, setTempUrl] = useState('');

  // Cropper State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const isAnyDashboardModalOpen = isUploadingNew || !!editingProduct || isBulkSaleModalOpen || !!deleteModalItems || !!archiveModalItems || !!removeSaleModalItems || (isCropModalOpen && !!imageToCrop);
  useBodyScrollLock(isAnyDashboardModalOpen);

  const showCroppedImage = useCallback(async () => {
    try {
      if (!imageToCrop || !completedCrop || !imgRef.current) return;
      setIsUploadingImage(true);
      
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );

      const croppedImage = canvas.toDataURL('image/jpeg', 0.9);

      if (croppedImage) {
        setImages(prev => {
          
          return [...prev, croppedImage];
        });
      }
      setIsCropModalOpen(false);
      setIsUploadingImage(false);
      setImageToCrop(null);
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch (e) {
      console.error(e);
      setIsUploadingImage(false);
    }
  }, [imageToCrop, completedCrop]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageToCrop(event.target?.result as string);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [fabric, setFabric] = useState('');
  
  // Comprehensive Garment Measurements
  const [chest, setChest] = useState<string | number>('');
  const [length, setLength] = useState<string | number>('');
  const [shoulders, setShoulders] = useState<string | number>('');
  const [sleeve, setSleeve] = useState<string | number>('');
  const [waist, setWaist] = useState<string | number>('');
  const [inseam, setInseam] = useState<string | number>('');
  const [rise, setRise] = useState<string | number>('');
  const [measurementMode, setMeasurementMode] = useState<'auto' | 'tops' | 'bottoms' | 'footwear' | 'all'>('auto');

  const [tagsInput, setTagsInput] = useState('');
  const [stockQuantity, setStockQuantity] = useState<number>(1);
  const [successToast, setSuccessToast] = useState('');
  const [formError, setFormError] = useState('');

  const MAX_PRICE_LIMIT = 999999999;

  // Seller's isolated items only
  const sellerProducts = useMemo(() => {
    if (!currentUser) return [];
    return products.filter(p => 
      p.sellerId === currentUser.id || 
      (!p.sellerId && currentUser.boutiqueName && p.sellerBoutique?.toLowerCase() === currentUser.boutiqueName.toLowerCase())
    );
  }, [products, currentUser]);

  // Search, Dropdowns & Pagination State for Managed Inventory
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('All');
  const [inventoryEraFilter, setInventoryEraFilter] = useState('All');
  const [inventorySortBy, setInventorySortBy] = useState<'default' | 'price-desc' | 'price-asc' | 'views-desc' | 'views-asc' | 'name'>('default');
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const INVENTORY_ITEMS_PER_PAGE = 20;

  // Distinct Categories & Eras for Inventory Dropdowns
  const distinctInventoryCategories = useMemo(() => {
    const set = new Set<string>();
    sellerProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [sellerProducts]);

  const distinctInventoryEras = useMemo(() => {
    const set = new Set<string>();
    sellerProducts.forEach(p => {
      if (p.era) set.add(p.era);
    });
    return Array.from(set).sort();
  }, [sellerProducts]);

  // Filtered & sorted seller products based on search query & 3 dropdowns
  const filteredSellerProducts = useMemo(() => {
    let result = [...sellerProducts];

    // Search query
    if (inventorySearchQuery.trim()) {
      const q = inventorySearchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const titleMatch = p.title?.toLowerCase().includes(q);
        const brandMatch = p.brand?.toLowerCase().includes(q);
        const categoryMatch = p.category?.toLowerCase().includes(q);
        const eraMatch = p.era?.toLowerCase().includes(q);
        const sizeMatch = p.size?.toLowerCase().includes(q);
        const colorMatch = p.color?.toLowerCase().includes(q);
        const conditionMatch = p.condition?.toLowerCase().includes(q);
        const notesMatch = p.conditionNotes?.toLowerCase().includes(q);
        const tagsMatch = p.tags?.some(t => t.toLowerCase().includes(q));
        const priceMatch = p.price?.toString().includes(q);
        const stockMatch = p.stock?.toString().includes(q);
        const statusMatch = p.status?.toLowerCase().includes(q);
        return (
          titleMatch ||
          brandMatch ||
          categoryMatch ||
          eraMatch ||
          sizeMatch ||
          colorMatch ||
          conditionMatch ||
          notesMatch ||
          tagsMatch ||
          priceMatch ||
          stockMatch ||
          statusMatch
        );
      });
    }

    // Category dropdown filter
    if (inventoryCategoryFilter !== 'All') {
      result = result.filter(p => p.category === inventoryCategoryFilter);
    }

    // Era dropdown filter
    if (inventoryEraFilter !== 'All') {
      result = result.filter(p => p.era === inventoryEraFilter);
    }

    // Sort dropdown
    if (inventorySortBy === 'price-desc') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (inventorySortBy === 'price-asc') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (inventorySortBy === 'views-desc') {
      result.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else if (inventorySortBy === 'views-asc') {
      result.sort((a, b) => (a.viewsCount || 0) - (b.viewsCount || 0));
    } else if (inventorySortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [sellerProducts, inventorySearchQuery, inventoryCategoryFilter, inventoryEraFilter, inventorySortBy]);

  const totalInventoryPages = Math.max(1, Math.ceil(filteredSellerProducts.length / INVENTORY_ITEMS_PER_PAGE));
  const safeInventoryPage = Math.min(Math.max(1, inventoryCurrentPage), totalInventoryPages);

  const paginatedSellerProducts = useMemo(() => {
    const startIdx = (safeInventoryPage - 1) * INVENTORY_ITEMS_PER_PAGE;
    return filteredSellerProducts.slice(startIdx, startIdx + INVENTORY_ITEMS_PER_PAGE);
  }, [filteredSellerProducts, safeInventoryPage, INVENTORY_ITEMS_PER_PAGE]);

  // Derive category-based measurement mode
  const effectiveMeasurementMode = useMemo(() => {
    if (measurementMode !== 'auto') return measurementMode;
    const catLower = category.toLowerCase();
    if (catLower.includes('pants') || catLower.includes('denim') || catLower.includes('short') || catLower.includes('skirt') || catLower.includes('trouser')) {
      return 'bottoms';
    }
    if (catLower.includes('footwear') || catLower.includes('boot') || catLower.includes('bag') || catLower.includes('accessories') || catLower.includes('hat')) {
      return 'footwear';
    }
    return 'tops';
  }, [category, measurementMode]);

  // Multi-select Handlers (supports select all filtered items or page items)
  const toggleSelectAll = () => {
    const targetItems = filteredSellerProducts.length > 0 ? filteredSellerProducts : sellerProducts;
    const targetIds = targetItems.map(p => p.id);
    const isAllSelected = targetIds.length > 0 && targetIds.every(id => selectedProductIds.includes(id));
    if (isAllSelected) {
      setSelectedProductIds(prev => prev.filter(id => !targetIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions & Confirmation Handlers
  const handleBulkDelete = () => {
    if (!selectedProductIds.length) return;
    const itemsToDelete = sellerProducts.filter(p => selectedProductIds.includes(p.id));
    setDeleteModalItems(itemsToDelete);
  };

  const handleBulkArchive = () => {
    if (!selectedProductIds.length) return;
    const selectedItems = sellerProducts.filter(p => selectedProductIds.includes(p.id));
    const availableItems = selectedItems.filter(p => p.status === 'available' && (p.stock || 0) > 0);

    if (availableItems.length === 0) {
      setSuccessToast(
        selectedProductIds.length === 1 
          ? "The selected item is already sold out/archived." 
          : "The selected items are already sold out/archived."
      );
      return;
    }

    if (availableItems.length < selectedItems.length) {
      setSelectedProductIds(availableItems.map(p => p.id));
    }

    setArchiveModalItems(availableItems);
  };

  const confirmPermanentDelete = () => {
    if (!deleteModalItems || !deleteModalItems.length) return;
    const deletedIds = deleteModalItems.map(p => p.id);
    deletedIds.forEach(id => deleteProduct(id));
    setSuccessToast(`Permanently deleted ${deleteModalItems.length} listing${deleteModalItems.length > 1 ? 's' : ''} from vault.`);
    setSelectedProductIds(prev => prev.filter(id => !deletedIds.includes(id)));
    setDeleteModalItems(null);
  };

  const confirmArchive = () => {
    if (!archiveModalItems || !archiveModalItems.length) return;
    const archivedIds = archiveModalItems.map(p => p.id);
    archivedIds.forEach(id => {
      updateProduct(id, { status: 'sold', stock: 0 });
    });
    setSuccessToast(`Archived ${archiveModalItems.length} listing${archiveModalItems.length > 1 ? 's' : ''} as Sold Out.`);
    setSelectedProductIds(prev => prev.filter(id => !archivedIds.includes(id)));
    setArchiveModalItems(null);
  };

  const handleBulkRemoveSale = () => {
    if (!selectedProductIds.length) return;
    const itemsWithSale = sellerProducts.filter(p => selectedProductIds.includes(p.id) && Boolean(p.isOnSale));
    if (itemsWithSale.length === 0) {
      setSuccessToast(
        selectedProductIds.length === 1 
          ? "The selected item is already not on sale." 
          : "The selected items are already not on sale."
      );
      return;
    }
    setRemoveSaleModalItems(itemsWithSale);
  };

  const confirmRemoveSale = () => {
    if (!removeSaleModalItems || !removeSaleModalItems.length) return;
    const removeIds = removeSaleModalItems.map(p => p.id);
    removeIds.forEach(id => {
      const item = products.find(p => p.id === id);
      if (item) {
        updateProduct(id, {
          isOnSale: false,
          price: item.regularPrice || item.price,
          regularPrice: undefined,
        });
      }
    });
    setSuccessToast(`Removed sale pricing from ${removeSaleModalItems.length} listing${removeSaleModalItems.length > 1 ? 's' : ''}.`);
    setSelectedProductIds(prev => prev.filter(id => !removeIds.includes(id)));
    setRemoveSaleModalItems(null);
  };

  const handleOpenManageSalePricing = () => {
    if (!selectedProductIds.length) return;
    const selectedItems = sellerProducts.filter(p => selectedProductIds.includes(p.id));
    const availableItems = selectedItems.filter(p => p.status === 'available' && (p.stock || 0) > 0);

    if (availableItems.length === 0) {
      setSuccessToast(
        selectedProductIds.length === 1 
          ? "The selected item is already sold out/archived." 
          : "The selected items are already sold out/archived."
      );
      return;
    }

    if (availableItems.length < selectedItems.length) {
      setSelectedProductIds(availableItems.map(p => p.id));
    }
    setIsBulkSaleModalOpen(true);
  };

  const handleApplyBulkSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductIds.length) return;

    let updatedCount = 0;
    selectedProductIds.forEach(id => {
      const item = products.find(p => p.id === id);
      if (item) {
        const regularPrice = item.regularPrice || item.price;
        const discountFactor = (100 - bulkDiscountPercent) / 100;
        const salePrice = Math.max(1, Math.round(regularPrice * discountFactor));

        updateProduct(id, {
          isOnSale: true,
          regularPrice,
          price: salePrice,
        });
        updatedCount++;
      }
    });

    setSuccessToast(`Applied ${bulkDiscountPercent}% discount to ${updatedCount} selected items!`);
    setIsBulkSaleModalOpen(false);
    setSelectedProductIds([]);
  };

  // Edit Product Modal Opener
  const openEditModal = (item: Product) => {
    setEditingProduct(item);
    setTitle(item.title);
    setBrand(item.brand);
    setEra(item.era || '90s');
    setCategory(item.category || 'Jackets & Outerwear');
    setClothingType(item.clothingType || '');
    setSize(item.size || 'L');
    setColor(item.color || '');
    setCondition(item.condition || 'Mint');
    setConditionNotes(item.conditionNotes || '');
    setHasWearsOrTears(item.hasWearsOrTears ?? true);
    setWearDetailText(item.wearDetails ? item.wearDetails.join('\n') : '');
    setPrice(item.price || 1);
    setOriginalRetailEstimate(item.originalRetailEstimate || 1);
    setImages(item.images || []);
    setFabric(item.fabric || '');
    setStockQuantity(item.stock !== undefined ? item.stock : 1);
    setMeasurementMode('auto');

    const cleanMeasurement = (val?: string) => {
      if (!val) return '';
      return val.replace(/in|"/gi, '').trim();
    };

    setChest(cleanMeasurement(item.measurements?.chest));
    setLength(cleanMeasurement(item.measurements?.length));
    setShoulders(cleanMeasurement(item.measurements?.shoulders));
    setSleeve(cleanMeasurement(item.measurements?.sleeve));
    setWaist(cleanMeasurement(item.measurements?.waist));
    setInseam(cleanMeasurement(item.measurements?.inseam));
    setRise(cleanMeasurement(item.measurements?.rise));
    setTagsInput(item.tags ? item.tags.join(', ') : '');

    setIsUploadingNew(true);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setTitle('');
    setBrand('');
    setEra('90s');
    setCategory('Jackets & Outerwear');
    setClothingType('');
    setSize('L');
    setColor('');
    setCondition('Mint');
    setConditionNotes('');
    setHasWearsOrTears(true);
    setWearDetailText('');
    setPrice(1);
    setOriginalRetailEstimate(1);
    setImages([]);
    setFabric('');
    setChest('');
    setLength('');
    setShoulders('');
    setSleeve('');
    setWaist('');
    setInseam('');
    setRise('');
    setTagsInput('');
    setStockQuantity(1);
    setMeasurementMode('auto');
    setIsUploadingNew(true);
  };

  // Orders sold by this seller (deduplicated by order ID)
  const sellerOrders = useMemo(() => {
    if (!currentUser) return [];
    const map = new Map<string, Order>();
    orders.forEach(o => {
      const isForCurrentSeller = 
        o.sellerIds?.includes(currentUser.id) ||
        o.items.some(i => 
          i.product.sellerId === currentUser.id || 
          (currentUser.boutiqueName && i.product.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase())
        );
      if (isForCurrentSeller && !map.has(o.id)) {
        map.set(o.id, o);
      }
    });
    return Array.from(map.values());
  }, [orders, currentUser]);

  const activeCount = sellerProducts.filter(p => p.status === 'available').length;
  const soldCount = sellerProducts.filter(p => p.status === 'sold').length;
  const totalValuation = sellerProducts.reduce((sum, p) => p.status === 'available' ? sum + p.price : sum, 0);
  const totalViews = sellerProducts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !brand.trim() || price <= 0) return;

    if (price > MAX_PRICE_LIMIT) {
      setFormError(`Boutique price is exceeding the maximum limit of ₱999,999,999.`);
      return;
    }

    if (originalRetailEstimate && originalRetailEstimate > MAX_PRICE_LIMIT) {
      setFormError(`Estimated original retail is exceeding the maximum limit of ₱999,999,999.`);
      return;
    }

    const wearDetails = wearDetailText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const tags = tagsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const formatMeasurement = (val: string | number) => {
      if (!val) return undefined;
      const strVal = String(val).trim();
      if (!strVal) return undefined;
      return strVal.includes('"') || strVal.toLowerCase().includes('in') ? strVal : `${strVal}"`;
    };

    const newStock = Math.max(0, stockQuantity);
    const newStatus = newStock === 0 ? 'sold' : 'available';

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        title,
        brand,
        era,
        category,
        clothingType,
        size,
        color,
        condition,
        conditionNotes,
        hasWearsOrTears,
        wearDetails,
        price,
        originalRetailEstimate: originalRetailEstimate || undefined,
        stock: newStock,
        status: newStatus,
        images: images,
        measurements: {
          chest: formatMeasurement(chest),
          length: formatMeasurement(length),
          shoulders: formatMeasurement(shoulders),
          sleeve: formatMeasurement(sleeve),
          waist: formatMeasurement(waist),
          inseam: formatMeasurement(inseam),
          rise: formatMeasurement(rise),
        },
        fabric,
        tags,
      });

      setSuccessToast(`Updated "${title}" details successfully!`);
    } else {
      addProduct({
        title,
        brand,
        era,
        category,
        clothingType,
        size,
        color,
        condition,
        conditionNotes,
        hasWearsOrTears,
        wearDetails,
        price,
        regularPrice: undefined,
        isOnSale: false,
        originalRetailEstimate: originalRetailEstimate || undefined,
        stock: newStock,
        status: newStatus,
        sellerId: currentUser?.id || 'curator',
        sellerName: currentUser?.name || 'Vault Curator',
        sellerBoutique: currentUser?.boutiqueName || `${currentUser?.name || 'Vault'}'s Boutique`,
        sellerAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        images: images,
        measurements: {
          chest: formatMeasurement(chest),
          length: formatMeasurement(length),
          shoulders: formatMeasurement(shoulders),
          sleeve: formatMeasurement(sleeve),
          waist: formatMeasurement(waist),
          inseam: formatMeasurement(inseam),
          rise: formatMeasurement(rise),
        },
        fabric,
        tags,
        featured: false,
      });

      setSuccessToast(`"${title}" uploaded to vault!`);
    }

    setIsUploadingNew(false);
    setEditingProduct(null);

    // Reset form
    setTitle('');
    setBrand('');
    setClothingType('');
    setColor('');
    setConditionNotes('');
    setWearDetailText('');
    setPrice(1);
    setOriginalRetailEstimate(1);
    setStockQuantity(1);
    setChest('');
    setLength('');
    setShoulders('');
    setSleeve('');
    setWaist('');
    setInseam('');
    setRise('');
    setTagsInput('');
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const openProfileModal = () => {
    setIsStoreProfileModalOpen(true);
  };

  if (!currentUser || currentUser.role !== 'seller') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center mx-auto mb-4 font-serif font-bold text-2xl">
          TL
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          The Boutique Seller Portal is restricted to registered sellers. Buyers cannot access seller management tools.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-start lg:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-amber-900 mb-1">
            <Store className="w-4 h-4" />
            <span className="font-sans">Boutique Inventory Dashboard</span>
          </div>
          <h1 className="font-sans text-3xl sm:text-4xl font-bold text-stone-950 flex items-start sm:items-center gap-3 flex-wrap">
            <span className="break-words min-w-0">{currentUser?.boutiqueName || `${currentUser?.name || 'Vault Curator'}'s Archive`}</span>
            <button
              type="button"
              id="header-edit-store-btn"
              onClick={openProfileModal}
              className="p-1.5 text-stone-400 hover:text-amber-900 hover:bg-amber-100/60 rounded-xl transition-colors cursor-pointer"
              title="Edit Store Profile & Boutique Name"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </h1>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <button
            onClick={() => {
              if (currentUser) {
                openSellerProfile({
                  sellerId: currentUser.id,
                  sellerBoutique: currentUser.boutiqueName || `${currentUser.name || 'Vault Curator'}'s Archive`,
                  sellerName: currentUser.name || 'Unknown',
                  sellerAvatar: currentUser.avatar,
                  sellerBio: currentUser.boutiqueBio
                });
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <User className="w-4 h-4 text-stone-600" />
            <span>View Public Profile</span>
          </button>
          
          <button
            id="seller-print-report-btn"
            onClick={() => setIsPrintReportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-800" />
            <span>Printable Audit Report</span>
          </button>

          <button
            id="seller-add-listing-btn"
            onClick={() => {
              if (isUploadingNew) {
                setIsUploadingNew(false);
                setEditingProduct(null);
              } else {
                openCreateModal();
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-950 hover:bg-amber-950 text-amber-50 rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{isUploadingNew ? 'Cancel Upload' : 'Upload Thrift Item'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Interactive KPI & Visual Charts Analytics */}
      <SellerAnalytics
        products={sellerProducts}
        activeCount={activeCount || 0}
        soldCount={soldCount || 0}
        totalValuation={totalValuation || 0}
        totalViews={totalViews || 0}
        orders={sellerOrders}
      />

      {/* UPLOAD / EDIT FORM POPUP MODAL */}
      {isUploadingNew && (
        <div 
          className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 w-screen h-screen overflow-y-auto animate-in fade-in duration-200 font-sans select-none"
          onClick={() => {
            setIsUploadingNew(false);
            setEditingProduct(null);
          }}
        >
          <div 
            className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 sm:px-8 sm:py-5 border-b border-stone-200 bg-white shrink-0 z-10">
              <div>
                <h3 className="font-sans text-xl font-bold text-stone-950 flex items-center gap-2">
                  {editingProduct ? (
                    <>
                      <Edit3 className="w-5 h-5 text-amber-800" /> Edit Thrift Item Details
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-amber-800" /> Upload New Thrift Item
                    </>
                  )}
                </h3>
                <p className="text-xs text-stone-500 font-sans mt-0.5">
                  {editingProduct 
                    ? `Modifying specs and availability for "${editingProduct.title}".`
                    : 'Publish a new vintage piece(s) into your boutique.'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadingNew(false);
                  setEditingProduct(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              <form onSubmit={handleUploadSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Basic Info */}
                <div className="md:col-span-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Garment Listing Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. 1996 Stüssy Big Logo Washed Crewneck"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Brand</label>
                      <input
                        type="text"
                        required
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g. Stüssy / Carhartt"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Vintage Era</label>
                      <select
                        value={era}
                        onChange={(e) => setEra(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      >
                        {ERAS.filter(e => e !== 'All Eras').map(e => (
                          <option key={e} value={e}>{e} Era</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      >
                        {CATEGORIES.filter(c => c !== 'All Vintage').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Size Tag</label>
                      <select
                        value={size}
                        onChange={(e) => setSize(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      >
                        {SIZES.filter(s => s !== 'All Sizes').map(s => (
                          <option key={s} value={s}>Size {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Clothing Style / Sub-Type</label>
                      <input
                        type="text"
                        value={clothingType}
                        onChange={(e) => setClothingType(e.target.value)}
                        placeholder="e.g. Workwear Jacket, Flared Denim"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Color / Wash</label>
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="e.g. Washed Olive, Indigo Sand"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-stone-700">Boutique Price (₱)</label>
                        {price > MAX_PRICE_LIMIT && (
                          <span className="text-[10px] font-bold text-rose-600 animate-pulse">
                            Exceeds Limit
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        required
                        min={1}
                        max={MAX_PRICE_LIMIT}
                        value={price || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setPrice(isNaN(val) ? 0 : val);
                          if (formError) setFormError('');
                        }}
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-lg text-stone-900 focus:outline-none font-normal transition-colors ${
                          price > MAX_PRICE_LIMIT
                            ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/50 text-rose-950 font-bold'
                            : 'border-stone-300 focus:ring-1 focus:ring-amber-800'
                        }`}
                      />
                      {price > MAX_PRICE_LIMIT ? (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Exceeding limit of ₱999,999,999</span>
                        </p>
                      ) : (
                        price > 0 && (
                          <p className="text-[10px] text-stone-500 mt-0.5 font-sans">
                            ₱{price.toLocaleString()}
                          </p>
                        )
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-stone-700">Est. Original Retail (₱)</label>
                        {Boolean(originalRetailEstimate && originalRetailEstimate > MAX_PRICE_LIMIT) && (
                          <span className="text-[10px] font-bold text-rose-600 animate-pulse">
                            Exceeds Limit
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={MAX_PRICE_LIMIT}
                        value={originalRetailEstimate || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setOriginalRetailEstimate(isNaN(val) ? 0 : val);
                          if (formError) setFormError('');
                        }}
                        className={`w-full px-3 py-2 bg-stone-50 border rounded-lg text-stone-900 focus:outline-none font-normal transition-colors ${
                          Boolean(originalRetailEstimate && originalRetailEstimate > MAX_PRICE_LIMIT)
                            ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/50 text-rose-950 font-bold'
                            : 'border-stone-300 focus:ring-1 focus:ring-amber-800'
                        }`}
                      />
                      {Boolean(originalRetailEstimate && originalRetailEstimate > MAX_PRICE_LIMIT) ? (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Exceeding limit of ₱999,999,999</span>
                        </p>
                      ) : (
                        Boolean(originalRetailEstimate && originalRetailEstimate > 0) && (
                          <p className="text-[10px] text-stone-500 mt-0.5 font-sans">
                            ₱{originalRetailEstimate?.toLocaleString()}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1 font-sans">Stock Quantity</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans font-normal"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-2 font-sans flex items-center justify-between">
                      <span>Item Image(s)</span>
                      <span className="text-[10px] font-normal text-stone-500">{images.length} added</span>
                    </label>
                    <div className="flex flex-col gap-4">
                      {/* Image Grid */}
                      <div className="flex gap-3 overflow-x-auto py-2 -mx-2 px-2">
                        {images.map((img, idx) => (
                          <div key={idx} className="relative shrink-0 group">
                            <img
                              src={img}
                              alt="Garment Preview"
                              className="w-20 h-20 rounded-xl object-cover border border-stone-300 bg-stone-100 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setImages(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-stone-900 text-white p-1 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {/* File Upload (Includes Camera on Mobile) */}
                        <div>
                          <label className="block text-[11px] font-medium text-stone-500 mb-1">Upload File or Take Photo</label>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileUpload}
                            className="w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                          />
                        </div>


                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Condition, Fabric & Detailed Category Measurements */}
                <div className="md:col-span-6 space-y-4 text-xs font-sans">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1 font-sans">Standard Condition Grade</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as ConditionGrade)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 font-normal focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                    >
                      {CONDITIONS.map(c => (
                        <option key={c.grade} value={c.grade}>{c.grade}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1 font-sans">Condition Disclosure Description</label>
                    <textarea
                      rows={2}
                      value={conditionNotes}
                      onChange={(e) => {
                        setConditionNotes(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onFocus={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onBlur={(e) => {
                        e.target.style.height = 'auto';
                      }}
                      placeholder="Describe any sun fade, patina, single-stitch hem, hardware condition..."
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans resize-none overflow-y-auto max-h-[300px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1 font-sans">Fabric & Material Composition</label>
                    <textarea
                      rows={2}
                      value={fabric}
                      onChange={(e) => {
                        setFabric(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onFocus={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onBlur={(e) => {
                        e.target.style.height = 'auto';
                      }}
                      placeholder="e.g. 100% Heavy Cotton Canvas, 80% Wool / 20% Nylon Blend, Genuine Distressed Leather..."
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans text-xs resize-none overflow-y-auto max-h-[300px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1 font-sans">Disclosed Flaws / Wear Checklist (1 per line)</label>
                    <textarea
                      rows={2}
                      value={wearDetailText}
                      onChange={(e) => {
                        setWearDetailText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onFocus={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onBlur={(e) => {
                        e.target.style.height = 'auto';
                      }}
                      placeholder="e.g. Distressed collar&#10;Faint paint mark on hem"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans resize-none overflow-y-auto max-h-[300px]"
                    />
                  </div>

                  {/* Category-Aware Garment Measurements Grid */}
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3 font-sans">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
                      <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5 font-sans">
                        <Ruler className="w-4 h-4 text-amber-800" /> Item Measurement(s) <span className="font-normal text-[10px] text-amber-800/80">(Optional)</span>
                      </span>
                      
                      {/* Quick Category Toggle Buttons */}
                      <div className="flex items-center gap-1 bg-amber-100/80 p-0.5 rounded-lg text-[10px] font-sans">
                        <button
                          type="button"
                          onClick={() => setMeasurementMode('tops')}
                          className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                            effectiveMeasurementMode === 'tops' ? 'bg-amber-900 text-amber-50 shadow-2xs' : 'text-amber-900 hover:bg-amber-200/60'
                          }`}
                        >
                          Tops
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeasurementMode('bottoms')}
                          className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                            effectiveMeasurementMode === 'bottoms' ? 'bg-amber-900 text-amber-50 shadow-2xs' : 'text-amber-900 hover:bg-amber-200/60'
                          }`}
                        >
                          Pants
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeasurementMode('footwear')}
                          className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                            effectiveMeasurementMode === 'footwear' ? 'bg-amber-900 text-amber-50 shadow-2xs' : 'text-amber-900 hover:bg-amber-200/60'
                          }`}
                        >
                          Shoes/Bags
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeasurementMode('all')}
                          className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                            effectiveMeasurementMode === 'all' ? 'bg-amber-900 text-amber-50 shadow-2xs' : 'text-amber-900 hover:bg-amber-200/60'
                          }`}
                        >
                          All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {(effectiveMeasurementMode === 'tops' || effectiveMeasurementMode === 'all') && (
                        <>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Pit to Pit Chest (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={chest}
                              onChange={(e) => setChest(e.target.value)}
                              placeholder="e.g. 23.5"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Shoulder Span (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={shoulders}
                              onChange={(e) => setShoulders(e.target.value)}
                              placeholder="e.g. 21.0"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Back / Total Length (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={length}
                              onChange={(e) => setLength(e.target.value)}
                              placeholder="e.g. 27.0"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Sleeve Length (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={sleeve}
                              onChange={(e) => setSleeve(e.target.value)}
                              placeholder="e.g. 25.0"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                        </>
                      )}

                      {(effectiveMeasurementMode === 'bottoms' || effectiveMeasurementMode === 'all') && (
                        <>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Waist Size (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={waist}
                              onChange={(e) => setWaist(e.target.value)}
                              placeholder="e.g. 32.0"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Inseam Length (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={inseam}
                              onChange={(e) => setInseam(e.target.value)}
                              placeholder="e.g. 30.5"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Front Rise (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={rise}
                              onChange={(e) => setRise(e.target.value)}
                              placeholder="e.g. 11.5"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Outseam / Total Length (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={length}
                              onChange={(e) => setLength(e.target.value)}
                              placeholder="e.g. 41.0"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                        </>
                      )}

                      {(effectiveMeasurementMode === 'footwear' || effectiveMeasurementMode === 'all') && (
                        <>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Insole / Footbed Length (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={length}
                              onChange={(e) => setLength(e.target.value)}
                              placeholder="e.g. 11.0"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Width / Span (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={chest}
                              onChange={(e) => setChest(e.target.value)}
                              placeholder="e.g. 4.2"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-0.5 text-[11px] font-sans">Height / Depth (in)</label>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={rise}
                              onChange={(e) => setRise(e.target.value)}
                              placeholder="e.g. 6.5"
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none font-sans"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Search Tags (comma separated)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. Vintage, Boxy Fit, 90s, Heavyweight"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 font-sans text-xs focus:ring-1 focus:ring-amber-800 focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadingNew(false);
                    setEditingProduct(null);
                    setFormError('');
                  }}
                  className="px-4 py-2 border border-stone-300 text-xs font-semibold text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={price > MAX_PRICE_LIMIT || Boolean(originalRetailEstimate && originalRetailEstimate > MAX_PRICE_LIMIT)}
                  className="px-6 py-2.5 bg-stone-950 hover:bg-amber-950 disabled:bg-stone-400 disabled:cursor-not-allowed text-amber-50 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingProduct ? 'Save Changes to Listing' : 'Publish Listing to Boutique'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Customer Orders & Outbound Courier Fulfillment Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-sans text-lg font-bold text-stone-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-800" />
              <span>Customer Orders & Outbound Shipments ({sellerOrders.length})</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Live courier routing, sorting hub scans, and delivery checkpoints for pieces bought from your boutique.
            </p>
          </div>
        </div>

        {sellerOrders.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs font-sans">
            <Package className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-700">No outbound customer orders yet.</p>
            <p className="mt-1">When buyers purchase your listed pieces, their orders and courier tracking updates will appear here automatically.</p>
          </div>
        ) : (
          <div>
            {/* Mobile Cards View for Small Screens (< md) */}
            <div className="md:hidden divide-y divide-stone-100 font-sans">
              {sellerOrders.map((ord, oIdx) => {
                const myItems = ord.items.filter(i => 
                  !currentUser || 
                  i.product.sellerId === currentUser.id || 
                  (currentUser.role === 'seller' && currentUser.boutiqueName === i.product.sellerBoutique)
                );
                const itemsToShow = myItems.length > 0 ? myItems : ord.items;
                const currentScan = ord.courier?.timeline?.find(t => t.isCurrent) || ord.courier?.timeline?.[(ord.courier?.timeline?.length || 1) - 1];

                return (
                  <div key={`mob-order-${ord.id}-${oIdx}`} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-stone-950 text-sm">#{ord.orderNumber}</span>
                        <p className="text-xs font-semibold text-stone-800">{ord.shippingAddress.fullName}</p>
                        <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{ord.shippingAddress.city}, {ord.shippingAddress.province}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-serif font-bold text-sm text-stone-950">
                          ₱{ord.total?.toLocaleString()}
                        </div>
                        <span className="text-[9px] font-sans text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase font-bold">
                          {ord.paymentMethod} Paid
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-1.5 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      {itemsToShow.map((it, itIdx) => (
                        <div key={`mob-it-${it.product.id}-${itIdx}`} className="flex items-center gap-2">
                          <img
                            src={it.product?.images?.[0]}
                            alt={it.product.title}
                            className="w-8 h-9 object-cover rounded bg-stone-100 shrink-0 border border-stone-200"
                          />
                          <div className="truncate flex-1 min-w-0">
                            <p className="font-semibold text-stone-900 text-xs truncate">{it.product.title}</p>
                            <p className="text-[10px] text-stone-500 font-sans">
                              Size {it.product.size} • ₱{it.priceAtPurchase?.toLocaleString()} {it.quantity && it.quantity > 1 ? `(Qty: ${it.quantity})` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Logistics Status & Action */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-950 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                          <span className="truncate">{currentScan?.status || ord.orderStatus}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-1 truncate">
                          {ord.courier.provider} • {ord.courier.trackingNumber}
                        </p>
                      </div>
                      <button
                        id={`mob-track-seller-order-${ord.orderNumber}`}
                        onClick={() => openOrderTracking(ord.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-amber-950 text-amber-100 rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Track</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View for Medium+ Screens (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 font-sans text-[11px] text-stone-600">
                    <th className="p-4">Order # & Customer</th>
                    <th className="p-4">Items Sold</th>
                    <th className="p-4">Order Total / Payout</th>
                    <th className="p-4">Courier & Tracking Code</th>
                    <th className="p-4">Logistics Status</th>
                    <th className="p-4 text-right">Track Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {sellerOrders.map((ord, oIdx) => {
                    const myItems = ord.items.filter(i => 
                      !currentUser || 
                      i.product.sellerId === currentUser.id || 
                      (currentUser.role === 'seller' && currentUser.boutiqueName === i.product.sellerBoutique)
                    );
                    const itemsToShow = myItems.length > 0 ? myItems : ord.items;
                    const currentScan = ord.courier?.timeline?.find(t => t.isCurrent) || ord.courier?.timeline?.[(ord.courier?.timeline?.length || 1) - 1];

                    return (
                      <tr key={`${ord.id}-${oIdx}`} className="hover:bg-amber-50/30 transition-colors">
                        <td className="p-4 font-sans">
                          <div>
                            <span className="font-bold text-stone-950 block">#{ord.orderNumber}</span>
                            <span className="font-medium text-stone-700">{ord.shippingAddress.fullName}</span>
                            <span className="text-[10px] text-stone-400 block flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              {ord.shippingAddress.city}, {ord.shippingAddress.province}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 font-sans">
                          <div className="space-y-1">
                            {itemsToShow.map((it, itIdx) => (
                              <div key={`${it.product.id}-${itIdx}`} className="flex items-center gap-2">
                                <img
                                  src={it.product?.images?.[0]}
                                  alt={it.product.title}
                                  className="w-7 h-8 object-cover rounded bg-stone-100 shrink-0"
                                />
                                <div className="truncate max-w-[180px]">
                                  <p className="font-semibold text-stone-900 truncate">{it.product.title}</p>
                                  <p className="text-[10px] text-stone-500 font-sans">Size {it.product.size} • ₱{it.priceAtPurchase?.toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="p-4 font-sans">
                          <div className="font-serif font-bold text-sm text-stone-950">
                            ₱{ord.total?.toLocaleString()}
                          </div>
                          <span className="text-[10px] font-sans text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {ord.paymentMethod.toUpperCase()} Paid
                          </span>
                        </td>

                        <td className="p-4 font-sans">
                          <div className="text-stone-900 font-semibold text-[11px]">{ord.courier.provider}</div>
                          <div className="text-[10px] text-stone-500">{ord.courier.trackingNumber}</div>
                          <div className="text-[10px] text-amber-900 font-sans mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>{ord.courier.estimatedDelivery}</span>
                          </div>
                        </td>

                        <td className="p-4 font-sans">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-950 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                            <span>{currentScan?.status || ord.orderStatus}</span>
                          </div>
                          <div className="text-[10px] text-stone-500 mt-1 truncate max-w-[180px]">
                            {currentScan?.location}
                          </div>
                        </td>

                        <td className="p-4 text-right font-sans">
                          <button
                            id={`track-seller-order-${ord.orderNumber}`}
                            onClick={() => openOrderTracking(ord.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-amber-950 text-amber-100 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Track Parcel</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Listings Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden font-sans">
        <div className="p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-sans text-lg font-bold text-stone-900">
                Manage Thrift Inventory
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Search, filter, edit item specs, or select multiple pieces for bulk discounts & inventory management.
            </p>
          </div>

          {selectedProductIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in">
              <span className="hidden md:inline-flex px-2.5 py-1 bg-amber-100 text-amber-950 font-bold text-xs rounded-lg border border-amber-300">
                {selectedProductIds.length} Selected
              </span>

              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer border border-stone-200"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5 text-stone-500" />
                <span>Deselect</span>
              </button>

              <button
                type="button"
                onClick={handleOpenManageSalePricing}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Manage Sale Pricing</span>
              </button>

              <button
                type="button"
                onClick={handleBulkRemoveSale}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Remove discount and restore regular prices for selected items"
              >
                <Tag className="w-3.5 h-3.5 text-amber-800" />
                <span>Remove Sale</span>
              </button>

              <button
                type="button"
                onClick={handleBulkArchive}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-stone-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Archive Selected</span>
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar & 3 Filter Dropdowns */}
        <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 font-sans">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={inventorySearchQuery}
                onChange={(e) => {
                  setInventorySearchQuery(e.target.value);
                  setInventoryCurrentPage(1);
                }}
                placeholder="Search inventory by title, brand, era, size, price..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition-all shadow-xs"
              />
              {inventorySearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setInventorySearchQuery('');
                    setInventoryCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 rounded-md hover:bg-stone-100 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown 1: Category */}
            <select
              value={inventoryCategoryFilter}
              onChange={(e) => {
                setInventoryCategoryFilter(e.target.value);
                setInventoryCurrentPage(1);
              }}
              className="px-2.5 py-2 bg-white rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-800/30 font-sans cursor-pointer shadow-xs truncate max-w-[160px]"
            >
              <option value="All">All Categories ({distinctInventoryCategories.length})</option>
              {distinctInventoryCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Dropdown 2: Era */}
            <select
              value={inventoryEraFilter}
              onChange={(e) => {
                setInventoryEraFilter(e.target.value);
                setInventoryCurrentPage(1);
              }}
              className="px-2.5 py-2 bg-white rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-800/30 font-sans cursor-pointer shadow-xs truncate max-w-[150px]"
            >
              <option value="All">All Eras ({distinctInventoryEras.length})</option>
              {distinctInventoryEras.map(era => (
                <option key={era} value={era}>{era}</option>
              ))}
            </select>

            {/* Dropdown 3: Sort By */}
            <select
              value={inventorySortBy}
              onChange={(e) => {
                setInventorySortBy(e.target.value as any);
                setInventoryCurrentPage(1);
              }}
              className="px-2.5 py-2 bg-white rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-800/30 font-sans cursor-pointer shadow-xs"
            >
              <option value="default">Sort: Default</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="views-desc">Most Viewed</option>
              <option value="views-asc">Least Viewed</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-600 font-sans">
            <span className="font-semibold text-stone-700">
              {filteredSellerProducts.length === 0 ? (
                '0 items found'
              ) : (
                <>
                  Showing <span className="text-stone-900 font-bold">{(safeInventoryPage - 1) * INVENTORY_ITEMS_PER_PAGE + 1}–{Math.min(safeInventoryPage * INVENTORY_ITEMS_PER_PAGE, filteredSellerProducts.length)}</span> of <span className="text-stone-900 font-bold">{filteredSellerProducts.length}</span>
                  {(inventorySearchQuery || inventoryCategoryFilter !== 'All' || inventoryEraFilter !== 'All') && filteredSellerProducts.length !== sellerProducts.length && (
                    <span className="text-stone-400 font-normal"> (filtered from {sellerProducts.length})</span>
                  )}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Empty State for Search Results or Empty Inventory */}
        {filteredSellerProducts.length === 0 ? (
          <div className="p-12 text-center text-stone-500 font-sans">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="font-bold text-stone-900 text-base mb-1">
              {inventorySearchQuery ? 'No matching pieces found' : 'Your inventory is empty'}
            </p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              {inventorySearchQuery
                ? `No items found matching "${inventorySearchQuery}". Try adjusting your search keywords.`
                : 'Start listing vintage pieces to build and manage your curated thrift collection.'}
            </p>
            {inventorySearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setInventorySearchQuery('');
                  setInventoryCurrentPage(1);
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile View for Small Screens (< md) */}
            <div className="md:hidden px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 font-sans">
              <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    filteredSellerProducts.length > 0 && 
                    filteredSellerProducts.every(p => selectedProductIds.includes(p.id))
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-amber-800 border-stone-300 rounded cursor-pointer focus:ring-amber-800"
                />
                <span>Select All ({filteredSellerProducts.length})</span>
              </label>
              {selectedProductIds.length > 0 && (
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                  {selectedProductIds.length} selected
                </span>
              )}
            </div>

            <div className="md:hidden divide-y divide-stone-100 font-sans">
              {paginatedSellerProducts.map(item => {
                const isSelected = selectedProductIds.includes(item.id);
                return (
                  <div key={`mob-inv-${item.id}`} className={`p-4 space-y-3 transition-colors ${isSelected ? 'bg-amber-50/50' : 'bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 text-amber-800 border-stone-300 rounded cursor-pointer focus:ring-amber-800 mt-1 shrink-0"
                      />
                      <img
                        src={item?.images?.[0]}
                        alt={item.title}
                        className="w-16 h-18 object-cover rounded-xl bg-stone-100 shrink-0 cursor-pointer border border-stone-200"
                        onClick={() => openEditModal(item)}
                      />
                      <div className="flex-1 min-w-0">
                        <p 
                          onClick={() => openEditModal(item)}
                          className="font-bold text-stone-900 text-sm hover:text-amber-900 cursor-pointer transition-colors leading-tight line-clamp-2"
                          title="Click to edit item"
                        >
                          {item.title}
                        </p>
                        <p className="text-[10px] text-amber-900 uppercase font-semibold mt-0.5">
                          {item.brand} • Size {item.size} • {item.era}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-stone-500">
                          <span className="font-semibold text-stone-700">{item.condition}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3 text-stone-400" />{item.viewsCount || 0} views</span>
                        </div>
                      </div>
                    </div>

                    {/* Price and Stock Controls on Mobile */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                      <div>
                        <div className="flex items-baseline gap-1.5 font-bold text-stone-950 text-sm">
                          <span>₱{item.price?.toLocaleString()}</span>
                          {item.isOnSale && item.regularPrice && (
                            <span className="text-xs text-rose-700 line-through font-normal">
                              ₱{item.regularPrice?.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {item.isOnSale && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[9px] font-bold rounded uppercase w-fit font-sans">
                            <Tag className="w-2.5 h-2.5" />
                            {item.regularPrice && item.regularPrice > item.price
                              ? `${Math.round(((item.regularPrice - item.price) / item.regularPrice) * 100)}% OFF`
                              : 'Sale'}
                          </span>
                        )}
                      </div>

                      {/* Stock inline editor */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const currentStock = item.stock !== undefined ? item.stock : (item.status === 'sold' ? 0 : 1);
                              const newStock = Math.max(0, currentStock - 1);
                              updateProduct(item.id, { 
                                stock: newStock,
                                status: newStock === 0 ? 'sold' : 'available'
                              });
                            }}
                            disabled={item.stock === 0 || item.status === 'sold'}
                            className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={item.stock !== undefined ? item.stock : (item.status === 'sold' ? 0 : 1)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              const newStock = isNaN(val) ? 0 : Math.max(0, val);
                              updateProduct(item.id, { 
                                stock: newStock,
                                status: newStock === 0 ? 'sold' : 'available'
                              });
                            }}
                            className="w-10 px-1 py-0.5 text-center font-bold text-xs border border-stone-300 rounded bg-stone-50 text-stone-950"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const currentStock = item.stock !== undefined ? item.stock : (item.status === 'sold' ? 0 : 1);
                              const newStock = currentStock + 1;
                              updateProduct(item.id, { 
                                stock: newStock,
                                status: 'available'
                              });
                            }}
                            className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'available' && (item.stock || 0) > 0
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}>
                          {item.status === 'available' && (item.stock || 0) > 0
                            ? ((item.stock || 0) > 1 ? `${item.stock} Pieces Available` : '1 Piece Available')
                            : '✕ Sold Out'}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Actions Footer */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 text-xs">
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-2.5 py-1 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 font-semibold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => openProductDetail(item)}
                        className="px-2.5 py-1 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => setArchiveModalItems([item])}
                        className="px-2.5 py-1 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 font-semibold border border-amber-200"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                      <button
                        onClick={() => setDeleteModalItems([item])}
                        className="px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 font-semibold border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View for Medium+ Screens (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 font-sans text-[11px] text-stone-600">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredSellerProducts.length > 0 && 
                          filteredSellerProducts.every(p => selectedProductIds.includes(p.id))
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-amber-800 border-stone-300 rounded cursor-pointer focus:ring-amber-800"
                        title="Select / Deselect Filtered Items"
                      />
                    </th>
                    <th className="p-4">Garment</th>
                    <th className="p-4">Era & Category</th>
                    <th className="p-4">Condition & Wear</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Views</th>
                    <th className="p-4">Stock Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {paginatedSellerProducts.map(item => {
                    const isSelected = selectedProductIds.includes(item.id);
                    return (
                      <tr key={item.id} className={`transition-colors ${isSelected ? 'bg-amber-50/50' : 'hover:bg-stone-50/60'}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            className="w-4 h-4 text-amber-800 border-stone-300 rounded cursor-pointer focus:ring-amber-800"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item?.images?.[0]}
                              alt={item.title}
                              className="w-12 h-14 object-cover rounded-lg bg-stone-100 shrink-0 cursor-pointer"
                              onClick={() => openEditModal(item)}
                            />
                            <div>
                              <p 
                                onClick={() => openEditModal(item)}
                                className="font-bold text-stone-900 hover:text-amber-900 cursor-pointer transition-colors"
                                title="Click to edit item"
                              >
                                {item.title}
                              </p>
                              <p className="text-[10px] text-amber-900 uppercase font-semibold font-sans">{item.brand} • Size {item.size}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-sans text-stone-700">
                          <div className="font-semibold text-stone-900">{item.era} Era</div>
                          <div className="text-[10px] text-stone-500 font-sans">{item.category}</div>
                        </td>
                        <td className="p-4 font-sans">
                          <span className="font-semibold block text-stone-900">{item.condition}</span>
                          <span className="text-[10px] text-stone-500 line-clamp-1">{item.conditionNotes}</span>
                        </td>
                        <td className="p-4 font-sans text-xs">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-1.5 font-bold text-stone-950 text-sm">
                              <span>₱{item.price?.toLocaleString()}</span>
                              {item.isOnSale && item.regularPrice && (
                                <span className="text-xs text-rose-700 line-through font-normal">
                                  ₱{item.regularPrice?.toLocaleString()}
                                </span>
                              )}
                            </div>
                            {item.isOnSale && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-bold rounded uppercase w-fit font-sans">
                                <Tag className="w-2.5 h-2.5" />
                                {item.regularPrice && item.regularPrice > item.price
                                  ? `${Math.round(((item.regularPrice - item.price) / item.regularPrice) * 100)}% OFF`
                                  : 'On Sale'}
                              </span>
                            )}
                            {item.originalRetailEstimate && (
                              <span className="text-[10px] text-stone-500 font-sans">
                                Est. Orig: ₱{item.originalRetailEstimate?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-sans text-center">
                          <div className="flex flex-col items-center justify-center text-stone-500">
                            <span className="font-bold text-stone-900 text-sm flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-stone-400" />{item.viewsCount || 0}</span>
                            <span className="text-[10px] uppercase tracking-wider font-semibold">Views</span>
                          </div>
                        </td>
                        <td className="p-4 font-sans">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const currentStock = item.stock !== undefined ? item.stock : (item.status === 'sold' ? 0 : 1);
                                  const newStock = Math.max(0, currentStock - 1);
                                  updateProduct(item.id, { 
                                    stock: newStock,
                                    status: newStock === 0 ? 'sold' : 'available'
                                  });
                                }}
                                disabled={item.stock === 0 || item.status === 'sold'}
                                className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Reduce stock (-1)"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              
                              <input
                                type="number"
                                min={0}
                                value={item.stock !== undefined ? item.stock : (item.status === 'sold' ? 0 : 1)}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  const newStock = isNaN(val) ? 0 : Math.max(0, val);
                                  updateProduct(item.id, { 
                                    stock: newStock,
                                    status: newStock === 0 ? 'sold' : 'available'
                                  });
                                }}
                                className="w-12 px-1 py-0.5 text-center font-sans font-bold text-xs border border-stone-300 rounded bg-stone-50 hover:bg-white focus:bg-white focus:ring-1 focus:ring-amber-800 focus:outline-none transition-all text-stone-950"
                                title="Click or type to edit stock quantity directly"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const currentStock = item.stock !== undefined ? item.stock : (item.status === 'sold' ? 0 : 1);
                                  const newStock = currentStock + 1;
                                  updateProduct(item.id, { 
                                    stock: newStock,
                                    status: 'available'
                                  });
                                }}
                                className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                                title="Increase stock (+1)"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div
                              className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold leading-tight shrink-0 select-none ${
                                item.status === 'available' && (item.stock || 0) > 0
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}
                            >
                              {item.status === 'available' && (item.stock || 0) > 0 ? (
                                (item.stock || 0) > 1 ? (
                                  <span className="font-sans font-bold block whitespace-nowrap">
                                    {item.stock} Pieces Available
                                  </span>
                                ) : (
                                  <span className="font-sans font-bold block whitespace-nowrap">
                                    1 Piece Available
                                  </span>
                                )
                              ) : (
                                <span className="font-sans font-bold whitespace-nowrap">✕ Sold Out</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-1 whitespace-nowrap font-sans">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-stone-600 hover:text-amber-900 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                            title="Edit Item Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openProductDetail(item)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Inspect Listing"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setArchiveModalItems([item])}
                            className="p-1.5 text-stone-500 hover:text-amber-900 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                            title="Archive Item (Set as Sold Out)"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModalItems([item])}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Listing Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            <div className="p-4 bg-stone-50/80 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 font-sans">
              <div className="text-xs text-stone-600">
                Page <span className="font-bold text-stone-900">{safeInventoryPage}</span> of <span className="font-bold text-stone-900">{totalInventoryPages}</span>
                <span className="text-stone-400 ml-1.5">
                  ({filteredSellerProducts.length} total {filteredSellerProducts.length === 1 ? 'piece' : 'pieces'})
                </span>
              </div>

              {totalInventoryPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInventoryCurrentPage(1)}
                    disabled={safeInventoryPage <= 1}
                    className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white text-stone-700 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
                    title="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventoryCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={safeInventoryPage <= 1}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: totalInventoryPages }, (_, i) => i + 1).map((pageNum) => {
                      const isCurrent = pageNum === safeInventoryPage;
                      const isFirst = pageNum === 1;
                      const isLast = pageNum === totalInventoryPages;
                      const isAdjacent = Math.abs(pageNum - safeInventoryPage) <= 1;

                      if (!isFirst && !isLast && !isAdjacent) {
                        if (pageNum === 2 || pageNum === totalInventoryPages - 1) {
                          return <span key={`dots-${pageNum}`} className="px-1 text-stone-400 text-xs">...</span>;
                        }
                        return null;
                      }

                      return (
                        <button
                          key={`page-${pageNum}`}
                          type="button"
                          onClick={() => setInventoryCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-900 text-white shadow-xs'
                              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setInventoryCurrentPage(prev => Math.min(totalInventoryPages, prev + 1))}
                    disabled={safeInventoryPage >= totalInventoryPages}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setInventoryCurrentPage(totalInventoryPages)}
                    disabled={safeInventoryPage >= totalInventoryPages}
                    className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white text-stone-700 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
                    title="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bulk Sale Modal */}
      {isBulkSaleModalOpen && selectedProductIds.length > 0 && (
        <div 
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkSaleModalOpen(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-stone-950 text-base">
                    Manage Sale Pricing
                  </h3>
                  <p className="text-xs text-stone-500 font-sans">
                    Applying sale prices to {selectedProductIds.length} selected {selectedProductIds.length === 1 ? 'listing' : 'listings'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkSaleModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyBulkSale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1 font-sans">
                  Discount Percentage Off (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    required
                    value={bulkDiscountPercent}
                    onChange={(e) => setBulkDiscountPercent(Math.min(90, Math.max(1, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-950 font-bold focus:ring-1 focus:ring-amber-800 focus:outline-none text-sm font-sans"
                  />
                  <span className="text-stone-600 font-bold text-sm font-sans">% OFF</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {[10, 15, 20, 25, 30, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBulkDiscountPercent(pct)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer font-sans ${
                      bulkDiscountPercent === pct 
                        ? 'bg-amber-900 text-amber-50 border-amber-900'
                        : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-stone-800 font-sans">
                  Listings to put on sale ({selectedProductIds.length}):
                </p>
                <div className="max-h-52 overflow-y-auto space-y-2 border border-stone-200 rounded-xl p-3 bg-stone-50/60 divide-y divide-stone-100">
                  {sellerProducts
                    .filter(p => selectedProductIds.includes(p.id))
                    .map((it) => {
                      const origPrice = it.regularPrice || it.price;
                      const newPrice = Math.max(1, Math.round(origPrice * (1 - (bulkDiscountPercent || 0) / 100)));
                      return (
                        <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={it?.images?.[0]}
                              alt={it.title}
                              className="w-10 h-12 object-cover rounded-md bg-stone-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-sans font-bold text-stone-900 text-xs truncate">{it.title}</p>
                              <p className="text-[10px] text-stone-500 font-sans">{it.brand || 'Vintage'} • {it.era} • {it.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-[10px] text-stone-400 line-through">₱{origPrice?.toLocaleString()}</span>
                                <span className="font-sans font-bold text-rose-700 text-xs">₱{newPrice?.toLocaleString()}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                                {bulkDiscountPercent}% OFF
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedProductIds(prev => prev.filter(id => id !== it.id))}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Unselect this item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 font-sans">
                <button
                  type="button"
                  onClick={() => setIsBulkSaleModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedProductIds.length === 0}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Apply {bulkDiscountPercent}% Sale ({selectedProductIds.length})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {deleteModalItems && deleteModalItems.length > 0 && (
        <div 
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalItems(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-stone-950 text-base">
                    Permanently Delete {deleteModalItems.length} {deleteModalItems.length === 1 ? 'Listing' : 'Listings'}?
                  </h3>
                  <p className="text-xs text-stone-500 font-sans">
                    Double-check your selection below before confirming.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalItems(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-900 text-xs font-semibold mb-4 flex items-start gap-2 font-sans">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Warning: This action will permanently remove {deleteModalItems.length === 1 ? 'this listing' : 'these listings'} from your boutique vault and catalog. This decision cannot be reversed.
              </span>
            </div>

            <div className="space-y-2 mb-5">
              <p className="text-xs font-bold text-stone-800 font-sans">
                Listings to be permanently deleted ({deleteModalItems.length}):
              </p>
              <div className="max-h-56 overflow-y-auto space-y-2 border border-stone-200 rounded-xl p-3 bg-stone-50/60 divide-y divide-stone-100">
                {deleteModalItems.map((it) => (
                  <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={it?.images?.[0]}
                        alt={it.title}
                        className="w-10 h-12 object-cover rounded-md bg-stone-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-sans font-bold text-stone-900 text-xs truncate">{it.title}</p>
                        <p className="text-[10px] text-stone-500 font-sans">{it.brand || 'Vintage'} • {it.era} • {it.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-sans font-bold text-stone-950 text-xs">₱{it.price?.toLocaleString()}</p>
                        <span className="text-[10px] font-semibold text-stone-500 font-sans">Size {it.size}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const idToRem = it.id;
                          setDeleteModalItems(prev => {
                            if (!prev) return null;
                            const next = prev.filter(p => p.id !== idToRem);
                            return next.length > 0 ? next : null;
                          });
                          setSelectedProductIds(prev => prev.filter(id => id !== idToRem));
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Unselect this item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 font-sans">
              <button
                type="button"
                onClick={() => setDeleteModalItems(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete {deleteModalItems.length === 1 ? 'Listing' : `${deleteModalItems.length} Listings`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archiveModalItems && archiveModalItems.length > 0 && (
        <div 
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) setArchiveModalItems(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 font-bold">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-stone-950 text-base">
                    Archive {archiveModalItems.length} {archiveModalItems.length === 1 ? 'Listing' : 'Listings'} as Sold Out?
                  </h3>
                  <p className="text-xs text-stone-500 font-sans">
                    Set stock quantity to 0 and mark status as Sold Out.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setArchiveModalItems(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-xs font-semibold mb-4 flex items-start gap-2 font-sans">
              <CheckCircle2 className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
              <span>
                Archiving will automatically convert the stock of selected piece(s) to 0 and mark them as Sold Out. They will remain in your vault history for accounting and tracking.
              </span>
            </div>

            <div className="space-y-2 mb-5">
              <p className="text-xs font-bold text-stone-800 font-sans">
                Listings to be archived as Sold Out ({archiveModalItems.length}):
              </p>
              <div className="max-h-56 overflow-y-auto space-y-2 border border-stone-200 rounded-xl p-3 bg-stone-50/60 divide-y divide-stone-100">
                {archiveModalItems.map((it) => (
                  <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={it?.images?.[0]}
                        alt={it.title}
                        className="w-10 h-12 object-cover rounded-md bg-stone-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-sans font-bold text-stone-900 text-xs truncate">{it.title}</p>
                        <p className="text-[10px] text-stone-500 font-sans">{it.brand || 'Vintage'} • {it.era} • {it.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-sans font-bold text-stone-950 text-xs">₱{it.price?.toLocaleString()}</p>
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 font-sans">
                          Current Stock: {it.stock || 0}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const idToRem = it.id;
                          setArchiveModalItems(prev => {
                            if (!prev) return null;
                            const next = prev.filter(p => p.id !== idToRem);
                            return next.length > 0 ? next : null;
                          });
                          setSelectedProductIds(prev => prev.filter(id => id !== idToRem));
                        }}
                        className="p-1 text-stone-400 hover:text-amber-800 rounded-md hover:bg-amber-50 cursor-pointer transition-colors"
                        title="Unselect this item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 font-sans">
              <button
                type="button"
                onClick={() => setArchiveModalItems(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmArchive}
                className="px-5 py-2.5 bg-stone-950 hover:bg-amber-950 text-amber-50 text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-4 h-4 text-amber-400" />
                <span>Mark as Sold Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Sale Confirmation Modal */}
      {removeSaleModalItems && removeSaleModalItems.length > 0 && (
        <div 
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150 font-sans"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRemoveSaleModalItems(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-stone-950 text-base">
                    Restore Regular Price for {removeSaleModalItems.length} {removeSaleModalItems.length === 1 ? 'Listing' : 'Listings'}?
                  </h3>
                  <p className="text-xs text-stone-500 font-sans">
                    Restore original regular prices and turn off active discount badges.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRemoveSaleModalItems(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-xs font-semibold mb-4 flex items-start gap-2 font-sans">
              <Tag className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
              <span>
                Removing sale pricing will reset the listing prices back to their original regular prices and remove active sale tags from your store catalog.
              </span>
            </div>

            <div className="space-y-2 mb-5">
              <p className="text-xs font-bold text-stone-800 font-sans">
                Listings to restore to regular price ({removeSaleModalItems.length}):
              </p>
              <div className="max-h-56 overflow-y-auto space-y-2 border border-stone-200 rounded-xl p-3 bg-stone-50/60 divide-y divide-stone-100">
                {removeSaleModalItems.map((it) => (
                  <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={it?.images?.[0]}
                        alt={it.title}
                        className="w-10 h-12 object-cover rounded-md bg-stone-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-sans font-bold text-stone-900 text-xs truncate">{it.title}</p>
                        <p className="text-[10px] text-stone-500 font-sans">{it.brand || 'Vintage'} • {it.era} • {it.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-[10px] text-stone-400 line-through font-sans">₱{it.price?.toLocaleString()}</span>
                          <span className="font-sans font-bold text-stone-900 text-xs">₱{(it.regularPrice || it.price)?.toLocaleString()}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-sans">
                          Restore Regular Price
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const idToRem = it.id;
                          setRemoveSaleModalItems(prev => {
                            if (!prev) return null;
                            const next = prev.filter(p => p.id !== idToRem);
                            return next.length > 0 ? next : null;
                          });
                          setSelectedProductIds(prev => prev.filter(id => id !== idToRem));
                        }}
                        className="p-1 text-stone-400 hover:text-amber-800 rounded-md hover:bg-amber-50 cursor-pointer transition-colors"
                        title="Unselect this item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 font-sans">
              <button
                type="button"
                onClick={() => setRemoveSaleModalItems(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveSale}
                className="px-5 py-2.5 bg-amber-900 hover:bg-amber-950 text-amber-50 text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Tag className="w-4 h-4" />
                <span>Restore Regular Price ({removeSaleModalItems.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Crop Modal */}
      {isCropModalOpen && imageToCrop && (
        <div 
          className="fixed inset-0 bg-stone-950/95 backdrop-blur-sm z-[70] flex flex-col items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploadingImage) setIsCropModalOpen(false);
          }}
        >
          <div 
            className="relative w-full max-w-lg max-h-[70vh] bg-stone-900 rounded-2xl overflow-y-auto border border-stone-800 shadow-2xl flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
            >
              <img 
                ref={imgRef} 
                src={imageToCrop} 
                alt="Crop preview" 
                className="max-h-[60vh] w-auto object-contain"
                onLoad={e => {
                  // Set initial crop to full image width/height
                  const { width, height } = e.currentTarget;
                  setCrop({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
                  setCompletedCrop({ unit: 'px', width: height, height: height, x: 0, y: 0 });
                }}
              />
            </ReactCrop>
          </div>
          
          <div 
            className="mt-6 flex flex-col items-center gap-4 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-4 w-full px-6">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={showCroppedImage}
                disabled={isUploadingImage}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isUploadingImage ? 'Cropping...' : 'Save Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
