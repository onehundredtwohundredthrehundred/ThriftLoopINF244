import React from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Download, 
  CheckCircle2, 
  Calendar,
  Building,
  DollarSign,
  Package
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const PrintableReportModal: React.FC = () => {
  const { isPrintReportOpen, setIsPrintReportOpen, products } = useInventory();
  const { currentUser } = useAuth();
  const { orders } = useCart();

  if (!isPrintReportOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const reportProducts = currentUser?.role === 'seller'
    ? products.filter(p => p.sellerId === currentUser.id || (currentUser.boutiqueName && p.sellerBoutique.toLowerCase() === currentUser.boutiqueName.toLowerCase()))
    : products;

  const totalInventoryValue = reportProducts.reduce((sum, p) => p.status === 'available' ? sum + p.price : sum, 0);
  const totalSoldValue = reportProducts.reduce((sum, p) => p.status === 'sold' ? sum + p.price : sum, 0);
  const inStockCount = reportProducts.filter(p => p.status === 'available').length;
  const soldCount = reportProducts.filter(p => p.status === 'sold').length;

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      id="printable-report-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsPrintReportOpen(false);
      }}
    >
      <div 
        id="printable-report-container"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden on actual print) */}
        <div className="bg-stone-900 px-6 py-4 text-amber-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Printable Inventory & Sales Module</h2>
              <p className="text-[11px] text-stone-400 font-mono">Audit-Ready Vintage Inventory Report</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="print-report-action-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={() => setIsPrintReportOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document (A4 Paper styled canvas) */}
        <div className="p-8 sm:p-12 max-h-[80vh] overflow-y-auto print:max-h-none print:p-0 font-sans text-stone-900 space-y-8 bg-white">
          
          {/* Official Letterhead */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-stone-900 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-8 h-8 rounded bg-stone-900 text-amber-100 flex items-center justify-center font-serif text-xl font-bold">
                  TL
                </span>
                <span className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
                  ThriftLoop Boutique Archive
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">Curated Vintage Apparel & Boutique Inventory Registry</p>
              <p className="text-xs text-stone-600 mt-1">
                Boutique: <span className="font-bold">{currentUser?.boutiqueName || 'Retro Archive Manila'}</span>
              </p>
              <p className="text-[11px] text-stone-500 font-mono">
                Operator: {currentUser?.name || 'Julian Rivera'} • {currentUser?.email || 'vault@thriftloop.store'}
              </p>
            </div>

            <div className="text-left sm:text-right text-xs font-mono text-stone-600">
              <p className="font-bold text-stone-900 text-sm">INVENTORY AUDIT REPORT</p>
              <p className="mt-1">Generated: {todayStr}</p>
              <p>Document ID: TL-RPT-{new Date().getFullYear()}-098</p>
              <p className="text-[10px] text-emerald-700 font-semibold mt-1">STATUS: VERIFIED INVENTORY</p>
            </div>
          </div>

          {/* KPI Summary Block */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Total Active Pieces</span>
              <span className="font-serif text-2xl font-bold text-stone-950">{inStockCount}</span>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Total Sold Out</span>
              <span className="font-serif text-2xl font-bold text-stone-950">{soldCount}</span>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Active Valuation</span>
              <span className="font-serif text-2xl font-bold text-amber-900">₱{totalInventoryValue?.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Gross Realized Sales</span>
              <span className="font-serif text-2xl font-bold text-emerald-800">₱{totalSoldValue?.toLocaleString()}</span>
            </div>
          </div>

          {/* Detailed Inventory Table */}
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-950 mb-3">
              1-of-1 Vintage Garment Registry
            </h3>

            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 font-mono text-[11px] text-stone-700">
                    <th className="p-3">SKU</th>
                    <th className="p-3">Item Title & Brand</th>
                    <th className="p-3">Era</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Condition Grade</th>
                    <th className="p-3">Wear & Flaw Notes</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-sans">
                  {reportProducts.map(item => (
                    <tr key={item.id} className="hover:bg-stone-50/50">
                      <td className="p-3 font-mono text-[10px] text-stone-500">{item.id}</td>
                      <td className="p-3">
                        <p className="font-bold text-stone-900">{item.title}</p>
                        <p className="text-[10px] text-stone-500 uppercase">{item.brand}</p>
                      </td>
                      <td className="p-3 font-mono text-stone-700">{item.era}</td>
                      <td className="p-3 font-bold">{item.size}</td>
                      <td className="p-3 text-[11px]">{item.condition}</td>
                      <td className="p-3 text-[11px] text-stone-600 max-w-xs">{item.conditionNotes}</td>
                      <td className="p-3 text-right font-serif font-bold text-stone-900">₱{item.price?.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          item.status === 'sold' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Boutique Sign-Off */}
          <div className="pt-8 border-t border-stone-300 flex flex-col sm:flex-row justify-between text-xs text-stone-600 gap-6">
            <div>
              <p className="font-bold text-stone-800">ThriftLoop Platform Verification:</p>
              <p className="text-[11px] text-stone-500">
                Official Vintage Vault & Boutique Inventory Audit<br />
                All 1-of-1 pieces cataloged with verified condition ratings.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="font-bold text-stone-800">Authorized Curator Signature:</p>
              <div className="mt-4 pt-2 border-t border-stone-400 font-mono text-[11px]">
                {currentUser?.name || 'Julian Rivera'} (Boutique Curator)
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
