import React, { useState } from 'react';
import { 
  ShoppingBag, 
  User as UserIcon, 
  Search, 
  Truck, 
  Package, 
  Store, 
  LogOut, 
  ChevronDown, 
  Sparkles,
  Layers,
  Edit3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useInventory } from '../context/InventoryContext';

interface NavbarProps {
  currentView: 'catalog' | 'seller_dashboard';
  setCurrentView: (view: 'catalog' | 'seller_dashboard') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const { currentUser, isAuthenticated, logout, openAuthModal } = useAuth();
  const { cart, setIsCartDrawerOpen, openOrderTracking, orders } = useCart();
  const { filterState, setFilterState, setIsStoreProfileModalOpen } = useInventory();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchChange = (value: string) => {
    setFilterState(prev => ({ ...prev, searchQuery: value }));
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
      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-8">
            <div 
              id="brand-logo"
              className="flex items-center gap-2.5 text-left select-none pointer-events-none"
            >
              <div className="w-9 h-9 rounded-lg bg-stone-900 text-amber-100 flex items-center justify-center font-serif text-2xl font-bold tracking-tight">
                TL
              </div>
              <div>
                <span className="font-serif text-2xl tracking-tight text-stone-900 font-bold block leading-none">
                  ThriftLoop
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links - Appears when you are a seller */}
            {currentUser?.role === 'seller' && (
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
            )}
          </div>

          {/* Center Search Bar (Desktop) */}
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

          {/* Right Action Icons & Auth Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Mobile Search Toggle */}
            <button
              id="mobile-search-toggle"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-stone-600 hover:text-stone-900 lg:hidden rounded-lg hover:bg-stone-100"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Shopping Cart Drawer Trigger */}
            <button
              id="nav-cart-btn"
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2 text-stone-800 hover:text-stone-950 rounded-lg hover:bg-stone-100 transition-colors flex items-center gap-1"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-800 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                </span>
              )}
            </button>

            {/* User Auth Section */}
            {isAuthenticated && currentUser ? (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-stone-100 transition-colors border border-stone-200 bg-white"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    style={{ objectPosition: currentUser.avatarPosition || '50% 50%' }}
                    className="w-7 h-7 rounded-full object-cover border border-stone-300"
                  />
                  <span className="text-xs font-semibold text-stone-800 hidden sm:inline max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase hidden sm:inline ${
                    currentUser.role === 'seller' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-amber-100/70 text-amber-900 border border-amber-200/80'
                  }`}>
                    {currentUser.role}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setIsUserMenuOpen(false)} 
                    />
                    <div 
                      id="user-dropdown-card"
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                    <div className="px-4 py-2.5 border-b border-stone-100">
                      <p className="text-xs text-stone-500 font-medium">Signed in as</p>
                      <div className="flex items-center justify-between gap-1.5 mt-0.5">
                        <p className="text-sm font-bold text-stone-900 truncate">{currentUser.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0 ${
                          currentUser.role === 'seller' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                            : 'bg-amber-100/70 text-amber-900 border border-amber-200/80'
                        }`}>
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">{currentUser.email}</p>
                      {currentUser.boutiqueName && (
                        <p className="text-[11px] text-amber-800 font-medium mt-1">
                          🏷️ {currentUser.boutiqueName}
                        </p>
                      )}
                    </div>

                    <div className="py-1">
                      {currentUser.role === 'seller' ? (
                        <>
                          <button
                            id="dropdown-seller-dashboard-btn"
                            onClick={() => {
                              setCurrentView('seller_dashboard');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                          >
                            <Store className="w-4 h-4 text-amber-700" />
                            <span>Seller Dashboard</span>
                          </button>

                          <button
                            id="dropdown-edit-store-btn"
                            onClick={() => {
                              setIsStoreProfileModalOpen(true);
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-amber-900 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4 text-amber-800" />
                            <span>Store & Account Settings</span>
                          </button>

                          <button
                            id="dropdown-view-vault-btn"
                            onClick={() => {
                              setCurrentView('catalog');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                          >
                            <Layers className="w-4 h-4 text-stone-600" />
                            <span>Browse Boutique</span>
                          </button>
                        </>
                      ) : (
                        <button
                          id="dropdown-buyer-account-settings-btn"
                          onClick={() => {
                            setIsStoreProfileModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-amber-900 hover:bg-amber-50 flex items-center gap-2 cursor-pointer"
                        >
                          <UserIcon className="w-4 h-4 text-amber-800" />
                          <span>Account Settings</span>
                        </button>
                      )}

                      <button
                        id="dropdown-track-orders-btn"
                        onClick={() => {
                          openOrderTracking();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                      >
                        <Truck className="w-4 h-4 text-stone-600" />
                        <span>Track Orders</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-stone-100">
                      <button
                        id="dropdown-logout-btn"
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
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

        {/* Mobile Search Bar Expandable */}
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
