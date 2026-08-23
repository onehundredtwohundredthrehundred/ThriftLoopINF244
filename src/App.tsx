import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { SellerDashboard } from './components/SellerDashboard';
import { PrintableReportModal } from './components/PrintableReportModal';
import { SellerProfileModal } from './components/SellerProfileModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { Footer } from './components/Footer';

function MainAppContent() {
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = useState<'catalog' | 'seller_dashboard'>(() => {
    return currentUser && currentUser.role === 'seller' ? 'seller_dashboard' : 'catalog';
  });

  // Automatically adjust view if non-seller is in seller dashboard
  useEffect(() => {
    if (!currentUser && currentView === 'seller_dashboard') {
      setCurrentView('catalog');
    }
  }, [currentUser, currentView]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-stone-900 font-sans">
      {/* Navigation Header */}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main View Display */}
      <main className="flex-1">
        {currentView === 'catalog' && (
          <ProductCatalog />
        )}

        {currentView === 'seller_dashboard' && (
          <SellerDashboard />
        )}
      </main>

      {/* Shared Modals & Drawers */}
      <AuthModal />
      <ProductDetailModal />
      <CartDrawer />
      <CheckoutModal />
      <OrderTrackerModal />
      <PrintableReportModal />
      <SellerProfileModal setCurrentView={setCurrentView} />
      <AccountSettingsModal />

      {/* Footer */}
      <Footer setCurrentView={setCurrentView} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <CartProvider>
          <MainAppContent />
        </CartProvider>
      </InventoryProvider>
    </AuthProvider>
  );
}
