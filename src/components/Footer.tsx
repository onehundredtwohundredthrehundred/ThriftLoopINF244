import React from 'react';
import { useAuth } from '../context/AuthContext';

interface FooterProps {
    setCurrentView: (view: 'catalog' | 'seller_dashboard') => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentView }) => {
    const { currentUser } = useAuth();
    const handleNav = (view: 'catalog' | 'seller_dashboard') => {
        setCurrentView(view);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    return (
      <footer className="bg-stone-900 text-stone-300 pt-14 pb-10 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-stone-800">
            <div className="md:col-span-5 space-y-4">
              <button onClick={() => {
                if (currentUser && currentUser.role === 'seller') {
                  handleNav('seller_dashboard');
                } else {
                  handleNav('catalog');
                }
              }} className="flex items-center gap-2.5 text-left group">
                <div className="w-8 h-8 rounded-lg bg-amber-900 text-amber-200 flex items-center justify-center font-serif text-xl font-bold">
                  TL
                </div>
                <span className="font-serif text-2xl font-bold tracking-tight text-white">
                  ThriftLoop
                </span>
              </button>
              <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
                A curated vintage clothing & apparel boutique platform.
              </p>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h4 className="font-sans text-xs uppercase font-bold text-amber-200 tracking-wider">
                Explore Boutique
              </h4>
              <ul className="space-y-2 text-xs text-stone-400">
                <li>
                  <button onClick={() => handleNav('catalog')} className="hover:text-amber-300 transition-colors">
                    Shop 90s & Y2K Archive
                  </button>
                </li>
                {currentUser?.role === 'seller' && (
                  <li>
                    <button onClick={() => handleNav('seller_dashboard')} className="hover:text-amber-300 transition-colors">
                      Boutique Seller Portal
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h4 className="font-sans text-xs uppercase font-bold text-amber-200 tracking-wider">
                Authenticity & Standards
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                we are authentic and we have standards
              </p>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
            <p>© {new Date().getFullYear()} ThriftLoop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
};
