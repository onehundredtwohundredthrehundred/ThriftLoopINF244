import React, { useState } from 'react';
import {
  Store,
  ShoppingBag,
  User as UserIcon,
  Search,
  LogOut,
  Settings,
  Package,
  Truck,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  currentView: 'catalog' | 'seller_dashboard';
  setCurrentView: (view: 'catalog' | 'seller_dashboard') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { currentUser, logout, openAuthModal } = useAuth();
  const { filterState, setFilterState, setIsStoreProfileModalOpen } = useInventory();
  const { cart, setIsCartDrawerOpen, activeTrackingOrder, openOrderTracking } = useCart();
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const toggleCart = () => setIsCartDrawerOpen(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchChange = (query: string) => {
    setFilterState({ ...filterState, searchQuery: query });
    if (currentView !== 'catalog') {
      setCurrentView('catalog');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView !== 'catalog') {
      setCurrentView('catalog');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          <div className="flex items-center gap-8">
            <div id="brand-logo" className="flex items-center gap-2.5 text-left select-none pointer-events-none">
              <div className="w-9 h-9 rounded-lg bg-stone-900 text-amber-100 flex items-center justify-center font-serif text-2xl font-bold tracking-tight">
                TL
              </div>
              <div>
                <span className="font-serif text-2xl tracking-tight text-stone-900 font-bold block leading-none">
                  ThriftLoop
                </span>
              </div>
            </div>

            <nav className={`hidden md:flex items-center gap-1 text-sm font-medium text-stone-700 transition-all duration-300 overflow-hidden ${isSearchFocused ? 'w-0 opacity-0 px-0 mx-0' : 'opacity-100 ml-4'}`}>
              <button
                id="nav-catalog-link"
                onClick={() => setCurrentView('catalog')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  currentView === 'catalog'
                    ? 'text-amber-900 bg-amber-50 font-semibold'
                    : 'hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                Boutique
              </button>

              <button
                id="nav-seller-link"
                onClick={() => setCurrentView('seller_dashboard')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  currentView === 'seller_dashboard'
                    ? 'text-amber-900 bg-amber-50 font-semibold'
                    : 'hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Store className="w-4 h-4 text-amber-700" />
                Dashboard
              </button>
            </nav>
          </div>

          <div className={`hidden lg:flex flex-col flex-1 mx-6 transition-all duration-300 ease-in-out ${isSearchFocused ? 'max-w-2xl' : 'max-w-sm items-center'}`}>
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <input
                type="text"
                placeholder={isSearchFocused ? "Tags are separated by comma..." : "Search vintage items..."}
                value={filterState.searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-stone-100/80 border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white transition-all text-stone-800 placeholder:text-stone-400"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="lg:hidden p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
              aria-label="Toggle search"
            >
              <Search className="w-5 h-5" />
            </button>

            {activeTrackingOrder && (
              <button
                onClick={() => openOrderTracking()}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300/80 hover:bg-amber-100 rounded-full text-xs font-bold text-amber-900 transition-all shadow-xs animate-pulse"
              >
                <Truck className="w-3.5 h-3.5 text-amber-800" />
                <span className="hidden sm:inline">Track Courier</span>
              </button>
            )}

            <button
              id="cart-toggle-btn"
              onClick={toggleCart}
              className="relative p-2.5 text-stone-800 hover:bg-stone-100 rounded-full transition-colors flex items-center justify-center"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute top-1 right-1 bg-amber-800 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full border border-stone-200 hover:border-stone-300 bg-white transition-all shadow-xs"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-stone-200"
                  />
                  <span className="text-xs font-semibold text-stone-800 hidden sm:inline max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-20 text-xs animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="font-bold text-stone-900 truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-stone-500 truncate">{currentUser.email}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-semibold text-[10px] uppercase tracking-wider">
                            {currentUser.role}
                          </span>
                          {currentUser.boutiqueName && (
                            <span className="text-[10px] text-amber-800 font-medium truncate">
                              {currentUser.boutiqueName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setCurrentView('seller_dashboard');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium"
                        >
                          <Store className="w-4 h-4 text-stone-500" />
                          <span>Seller Dashboard</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            openOrderTracking();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium"
                        >
                          <Truck className="w-4 h-4 text-stone-500" />
                          <span>Order Tracking</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsStoreProfileModalOpen(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-stone-50 flex items-center gap-2.5 text-stone-700 font-medium"
                        >
                          <Settings className="w-4 h-4 text-stone-500" />
                          <span>Account Settings</span>
                        </button>
                      </div>

                      <div className="border-t border-stone-100 pt-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2.5 font-medium transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="nav-login-btn"
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-800 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Log In
                </button>
                <button
                  id="nav-register-btn"
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-stone-900 text-amber-50 hover:bg-amber-900 rounded-lg transition-colors shadow-xs"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>

        {isSearchOpen && (
          <div className="py-2.5 border-t border-stone-200 lg:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder={isSearchFocused ? "Tags are separated by comma..." : "Search..."}
                value={filterState.searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-stone-100 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:bg-white"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </form>
          </div>
        )}
      </div>
    </header>
  );
};
