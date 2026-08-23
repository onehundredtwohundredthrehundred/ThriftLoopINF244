import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  SlidersHorizontal, 
  Check, 
  AlertCircle, 
  X,
  Tag,
  Sparkles,
  Layers,
  Eye
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { ProductCard } from './ProductCard';
import { CATEGORIES, ERAS, SIZES, CONDITIONS } from '../data/mockData';

export const ProductCatalog: React.FC = () => {
  const { 
    filteredProducts, 
    filterState, 
    setFilterState, 
    resetFilters 
  } = useInventory();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showUnhidePrompt, setShowUnhidePrompt] = useState(false);

  const handleSortChange = (newSort: string) => {
    setFilterState(prev => ({ ...prev, sortBy: newSort as any }));
    if (newSort === 'sold_first' && filterState.inStockOnly) {
      setShowUnhidePrompt(true);
    }
  };

  // Multi-select toggle helpers
  const toggleCategory = (cat: string) => {
    if (cat === 'All Vintage') {
      setFilterState(prev => ({ ...prev, categories: [] }));
      return;
    }
    setFilterState(prev => {
      const current = prev.categories || [];
      const exists = current.includes(cat);
      const newCategories = exists
        ? current.filter(c => c !== cat)
        : [...current, cat];
      return { ...prev, categories: newCategories };
    });
  };

  const toggleEra = (era: string) => {
    if (era === 'All Eras') {
      setFilterState(prev => ({ ...prev, eras: [] }));
      return;
    }
    setFilterState(prev => {
      const current = prev.eras || [];
      const exists = current.includes(era);
      const newEras = exists
        ? current.filter(e => e !== era)
        : [...current, era];
      return { ...prev, eras: newEras };
    });
  };

  const toggleSize = (size: string) => {
    if (size === 'All Sizes') {
      setFilterState(prev => ({ ...prev, sizes: [] }));
      return;
    }
    setFilterState(prev => {
      const current = prev.sizes || [];
      const exists = current.includes(size);
      const newSizes = exists
        ? current.filter(s => s !== size)
        : [...current, size];
      return { ...prev, sizes: newSizes };
    });
  };

  const toggleCondition = (grade: string) => {
    if (grade === 'All') {
      setFilterState(prev => ({ ...prev, conditions: [] }));
      return;
    }
    setFilterState(prev => {
      const current = prev.conditions || [];
      const exists = current.includes(grade);
      const newConditions = exists
        ? current.filter(c => c !== grade)
        : [...current, grade];
      return { ...prev, conditions: newConditions };
    });
  };

  const searchTerms = filterState.searchQuery.split(',').map(t => t.trim()).filter(t => t);

  // Count active filters
  const activeFiltersCount =
    (filterState.categories?.length || 0) +
    (filterState.eras?.length || 0) +
    (filterState.conditions?.length || 0) +
    (filterState.sizes?.length || 0) +
    searchTerms.length;

  const garmentCategories = CATEGORIES.filter(c => c !== 'All Vintage');
  const vintageEras = ERAS.filter(e => e !== 'All Eras');
  const availableSizes = SIZES.filter(s => s !== 'All Sizes');

  return (
    <div id="product-catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <span className="text-xs font-sans font-bold uppercase tracking-widest text-amber-900">
            Boutique Collection
          </span>
          <h1 className="font-sans text-3xl sm:text-4xl font-bold text-stone-950 mt-1">
            Curated Vintage Apparel
          </h1>
        </div>

        {/* Sorting Dropdown & Mobile Filter Toggle */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-filter-btn"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="md:hidden flex items-center gap-2 px-3.5 py-2 bg-stone-900 text-amber-50 rounded-lg text-xs font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters ({activeFiltersCount})</span>
          </button>

          <div className="flex items-center gap-2 bg-white border border-stone-300 rounded-lg px-3 py-1.5 shadow-xs">
            <span className="text-xs text-stone-500 font-medium whitespace-nowrap">Sort by:</span>
            <select
              value={filterState.sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="text-xs font-sans font-semibold text-stone-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="latest">Newest Arrivals</option>
              <option value="sold_first">Sold Out on Top</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rarity">Most Viewed / Rare</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-8">
        
        {/* LEFT SIDEBAR FILTERS (Desktop & Mobile Drawer) */}
        <aside className={`md:col-span-3 space-y-6 ${isMobileFilterOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-6">
            
            {/* Header with Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-xs font-bold font-sans uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-800" /> Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-900 text-amber-100 text-[10px] rounded-full font-bold font-sans">
                    {activeFiltersCount}
                  </span>
                )}
              </span>
              {activeFiltersCount > 0 && (
                <button
                  id="reset-all-filters-sidebar-btn"
                  onClick={resetFilters}
                  className="text-[11px] font-semibold font-sans text-amber-800 hover:text-amber-950 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset all
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 font-sans">
                Search Tags / Keyword
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder=""
                  value={filterState.searchQuery}
                  onChange={(e) => setFilterState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full pl-8 pr-7 py-1.5 text-xs font-sans bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800 text-stone-900"
                />
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                {filterState.searchQuery && (
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, searchQuery: '' }))}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories (Multi-Select) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Garment Category
                </label>
                {filterState.categories?.length > 0 && (
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, categories: [] }))}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-medium"
                  >
                    Clear ({filterState.categories.length})
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => toggleCategory('All Vintage')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    !filterState.categories || filterState.categories.length === 0
                      ? 'bg-stone-900 text-amber-100 font-bold'
                      : 'text-stone-600 hover:bg-stone-100 font-medium'
                  }`}
                >
                  <span>All Categories</span>
                  {(!filterState.categories || filterState.categories.length === 0) && (
                    <Check className="w-3.5 h-3.5 text-amber-300" />
                  )}
                </button>

                {garmentCategories.map(cat => {
                  const isSelected = filterState.categories?.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-900 text-white font-bold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-100 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-amber-500 border-amber-400 text-stone-950' : 'border-stone-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span>{cat}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Era Filter (Multi-Select) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-sans">
                  Vintage Era
                </label>
                {filterState.eras?.length > 0 && (
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, eras: [] }))}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-medium font-sans"
                  >
                    Clear ({filterState.eras.length})
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => toggleEra('All Eras')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors flex items-center justify-between ${
                    !filterState.eras || filterState.eras.length === 0
                      ? 'bg-stone-900 text-amber-100 font-bold'
                      : 'text-stone-600 hover:bg-stone-100 font-medium'
                  }`}
                >
                  <span>All Eras</span>
                  {(!filterState.eras || filterState.eras.length === 0) && (
                    <Check className="w-3.5 h-3.5 text-amber-300" />
                  )}
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                  {vintageEras.map(era => {
                    const isSelected = filterState.eras?.includes(era);
                    return (
                      <button
                        key={era}
                        onClick={() => toggleEra(era)}
                        className={`py-1 px-2 rounded text-xs font-sans transition-colors text-center border relative ${
                          isSelected
                            ? 'bg-amber-900 text-amber-100 border-amber-950 font-bold shadow-xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <span>{era}</span>
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Size Filter (Multi-Select) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-sans">
                  Size
                </label>
                {filterState.sizes?.length > 0 && (
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, sizes: [] }))}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-medium font-sans"
                  >
                    Clear ({filterState.sizes.length})
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => toggleSize('All Sizes')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors flex items-center justify-between ${
                    !filterState.sizes || filterState.sizes.length === 0
                      ? 'bg-stone-900 text-amber-100 font-bold'
                      : 'text-stone-600 hover:bg-stone-100 font-medium'
                  }`}
                >
                  <span>All Sizes</span>
                  {(!filterState.sizes || filterState.sizes.length === 0) && (
                    <Check className="w-3.5 h-3.5 text-amber-300" />
                  )}
                </button>
                <div className="grid grid-cols-4 gap-1.5">
                  {availableSizes.map(s => {
                    const isSelected = filterState.sizes?.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSize(s)}
                        className={`py-1 px-2 rounded text-xs font-sans font-medium transition-colors text-center border ${
                          isSelected
                            ? 'bg-amber-800 text-white border-amber-900 font-bold'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Condition Grade (Multi-Select) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 font-sans">
                  Condition Standard
                </label>
                {filterState.conditions?.length > 0 && (
                  <button
                    onClick={() => setFilterState(prev => ({ ...prev, conditions: [] }))}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-medium font-sans"
                  >
                    Clear ({filterState.conditions.length})
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => toggleCondition('All')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-sans transition-colors flex items-center justify-between ${
                    !filterState.conditions || filterState.conditions.length === 0
                      ? 'bg-stone-900 text-amber-100 font-bold'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span>All Conditions</span>
                  {(!filterState.conditions || filterState.conditions.length === 0) && (
                    <Check className="w-3.5 h-3.5 text-amber-300" />
                  )}
                </button>

                {CONDITIONS.map(cond => {
                  const isSelected = filterState.conditions?.includes(cond.grade);
                  return (
                    <button
                      key={cond.grade}
                      onClick={() => toggleCondition(cond.grade)}
                      className={`w-full text-left p-2 rounded-lg text-xs font-sans transition-all border ${
                        isSelected
                          ? 'bg-amber-50/90 border-amber-500 font-bold text-amber-950 shadow-xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-amber-800 border-amber-800 text-white' : 'border-stone-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span className="font-semibold">{cond.label}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-500 pl-5.5 mt-0.5 leading-tight">
                        {cond.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In-Stock Toggle */}
            <div className="pt-2 border-t border-stone-100">
              <label className="flex items-center justify-between text-xs text-stone-700 cursor-pointer">
                <span className="font-semibold">Hide Sold-Out Items</span>
                <input
                  type="checkbox"
                  checked={filterState.inStockOnly}
                  onChange={(e) => setFilterState(prev => ({ ...prev, inStockOnly: e.target.checked }))}
                  className="rounded border-stone-300 text-amber-800 focus:ring-amber-800"
                />
              </label>
            </div>

          </div>
        </aside>

        {/* RIGHT PRODUCTS GRID */}
        <main className="md:col-span-9 space-y-4">
          
          {/* Active Filter Chips Pill Bar */}
          {activeFiltersCount > 0 && (
            <div className="bg-stone-100/90 border border-stone-200/80 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-sans uppercase font-bold text-stone-500 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-800" /> Active ({activeFiltersCount}):
              </span>

              {/* Search query chips */}
              {searchTerms.map((term, idx) => (
                <button
                  key={`search-${idx}`}
                  onClick={() => {
                    const newQuery = searchTerms.filter((_, i) => i !== idx).join(', ');
                    setFilterState(prev => ({ ...prev, searchQuery: newQuery }));
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-stone-300 text-stone-800 text-xs hover:bg-stone-50 shadow-xs"
                >
                  <Search className="w-3 h-3 text-stone-500" />
                  <span>"{term}"</span>
                  <X className="w-3 h-3 text-stone-400 hover:text-stone-700" />
                </button>
              ))}

              {/* Category chips */}
              {filterState.categories?.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-900 text-amber-100 text-xs hover:bg-amber-950 shadow-xs"
                >
                  <span>{cat}</span>
                  <X className="w-3 h-3 text-amber-300 hover:text-white" />
                </button>
              ))}

              {/* Era chips */}
              {filterState.eras?.map(era => (
                <button
                  key={era}
                  onClick={() => toggleEra(era)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900 text-amber-200 font-sans text-xs hover:bg-stone-800 shadow-xs"
                >
                  <span>{era}</span>
                  <X className="w-3 h-3 text-amber-400 hover:text-white" />
                </button>
              ))}

              {/* Size chips */}
              {filterState.sizes?.map(size => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-800 text-white text-xs hover:bg-amber-900 shadow-xs"
                >
                  <span>Size {size}</span>
                  <X className="w-3 h-3 text-amber-200 hover:text-white" />
                </button>
              ))}

              {/* Condition chips */}
              {filterState.conditions?.map(cond => (
                <button
                  key={cond}
                  onClick={() => toggleCondition(cond)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs hover:bg-amber-200 shadow-xs font-semibold"
                >
                  <span>{cond}</span>
                  <X className="w-3 h-3 text-amber-800 hover:text-amber-950" />
                </button>
              ))}

              {/* Clear All button */}
              <button
                id="clear-all-active-filter-chips-btn"
                onClick={resetFilters}
                className="text-xs font-semibold text-amber-900 hover:underline ml-auto pl-2"
              >
                Clear all
              </button>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <AlertCircle className="w-10 h-10 text-stone-400 mx-auto mb-3" />
              <h3 className="font-sans text-xl font-bold text-stone-900">No Vintage Pieces Match Your Filter Combination</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Try removing one or more selected filters to widen your search across the vintage vault.
              </p>
              <button
                id="empty-results-reset-filters-btn"
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-stone-900 text-amber-50 text-xs font-semibold rounded-lg hover:bg-amber-900"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>

      </div>

      {/* Unhide Sold-Out Items Confirmation Modal */}
      {showUnhidePrompt && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto mb-3">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-950 font-sans mb-2">
              Unhide Sold-Out Items?
            </h3>
            <p className="text-xs text-stone-600 font-sans mb-6 leading-relaxed">
              You selected <strong className="text-stone-900 font-semibold">"Sold Out on Top"</strong>, but sold-out items are currently hidden by your filter settings. Would you like to unhide sold-out items so they can be displayed at the top?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFilterState(prev => ({ ...prev, inStockOnly: false }));
                  setShowUnhidePrompt(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-900 hover:bg-amber-950 text-amber-50 text-xs font-bold font-sans rounded-xl transition-colors shadow-xs"
              >
                Unhide Sold-Out Items
              </button>
              <button
                type="button"
                onClick={() => setShowUnhidePrompt(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold font-sans rounded-xl transition-colors"
              >
                Keep Hidden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
