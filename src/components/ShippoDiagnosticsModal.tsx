import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Server, 
  ExternalLink, 
  Key, 
  Truck, 
  Clock, 
  Mail, 
  Code2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Activity,
  Layers
} from 'lucide-react';
import { useBodyScrollLock } from '../lib/useBodyScrollLock';

interface ShippoDiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShippoDiagnosticsModal: React.FC<ShippoDiagnosticsProps> = ({ isOpen, onClose }) => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [testLabelResult, setTestLabelResult] = useState<any>(null);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);

  useBodyScrollLock(isOpen);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/shipping/diagnostics');
      const data = await res.json();
      setDiagnostics(data);
    } catch (e: any) {
      setDiagnostics({
        isConnected: false,
        statusMessage: `Network error: ${e.message}`,
        carrierAccounts: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLabelGeneration = async () => {
    setIsGeneratingLabel(true);
    setTestLabelResult(null);
    try {
      const res = await fetch('/api/shipping/generate-test-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setTestLabelResult(data);
    } catch (e: any) {
      setTestLabelResult({ success: false, error: e.message });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-950 px-6 py-4.5 text-stone-100 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <Server className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-base text-white">Shippo Integration Status</h3>
                {diagnostics?.isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    HTTP {diagnostics.httpStatus || 200} OK
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {diagnostics?.httpStatus ? `HTTP ${diagnostics.httpStatus}` : 'Disconnected'}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Live carrier handshake & end-to-end verification diagnostic suite
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 font-sans">
          
          {/* Status Hero Card */}
          <div className={`p-4.5 rounded-2xl border ${
            diagnostics?.isConnected 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-stone-100 border-stone-200 text-stone-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                {diagnostics?.isConnected ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-stone-900">
                    {diagnostics?.isConnected 
                      ? 'Genuine Shippo API Handshake Verified' 
                      : 'Shippo API Not Fully Connected'}
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                    {diagnostics?.statusMessage || 'Checking connection with Shippo cloud servers...'}
                  </p>
                </div>
              </div>

              <button
                onClick={fetchDiagnostics}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-300' : ''}`} />
                <span>{isLoading ? 'Probing...' : 'Re-Probe API'}</span>
              </button>
            </div>
          </div>

          {/* Account & Handshake Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-500 font-semibold text-[11px] uppercase tracking-wider">
                <Key className="w-3.5 h-3.5 text-amber-700" />
                <span>Active API Token</span>
              </div>
              <p className="font-mono font-bold text-stone-900 text-xs">
                {diagnostics?.maskedApiKey || 'None'}
              </p>
              <p className="text-[10px] text-stone-500">
                {diagnostics?.hasApiKey ? 'Loaded securely from server environment' : 'Set SHIPPO_API_KEY in server'}
              </p>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-500 font-semibold text-[11px] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Roundtrip Latency</span>
              </div>
              <p className="font-mono font-bold text-stone-900 text-xs flex items-center gap-1">
                <span>{diagnostics?.latencyMs ? `${diagnostics.latencyMs} ms` : 'N/A'}</span>
                {diagnostics?.latencyMs && diagnostics.latencyMs < 1000 && (
                  <span className="text-[10px] text-emerald-700 font-sans font-normal">(Optimal)</span>
                )}
              </p>
              <p className="text-[10px] text-stone-500">
                Direct ping to https://api.goshippo.com
              </p>
            </div>
          </div>

          {/* Connected Carrier Accounts */}
          {diagnostics?.carrierAccounts && diagnostics.carrierAccounts.length > 0 && (
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-800" />
                  <span>Active Carrier Accounts in Shippo ({diagnostics.carrierAccounts.length})</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Verified in Account
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {diagnostics.carrierAccounts.map((c: any, idx: number) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-stone-800 text-xs capitalize">{c.carrier.replace('_', ' ')}</p>
                      <p className="text-[10px] font-mono text-stone-400 truncate max-w-[150px]">{c.accountId}</p>
                    </div>
                    {c.isTest && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200">
                        Test Mode
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar: End-to-End Test Shipment & Merchant Portal */}
          <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h5 className="font-bold text-sm text-amber-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>End-to-End Test Actions</span>
                </h5>
                <p className="text-xs text-stone-300 mt-0.5">
                  Verify label creation and open the official orders dashboard
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleTestLabelGeneration}
                  disabled={isGeneratingLabel || !diagnostics?.isConnected}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isGeneratingLabel ? 'Generating...' : '⚡ Test Label Flow'}
                </button>

                <a
                  href="https://apps.goshippo.com/orders"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs rounded-xl transition-all border border-stone-700 flex items-center gap-1.5"
                  title="Incoming orders waiting for label purchase"
                >
                  <span>Orders Queue</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="https://apps.goshippo.com/shipments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold text-xs rounded-xl transition-all border border-stone-700 flex items-center gap-1.5"
                  title="Purchased labels and live courier tracking progress on Shippo"
                >
                  <span>Tracked Shipments</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Test Label Result Preview */}
            {testLabelResult && (
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">
                    {testLabelResult.success ? '✓ Shippo Rate & Label Flow Executed' : '✗ Test Failed'}
                  </span>
                  {testLabelResult.amount && (
                    <span className="text-stone-300">
                      Rate: {testLabelResult.amount} {testLabelResult.currency}
                    </span>
                  )}
                </div>
                {testLabelResult.carrier && (
                  <p className="text-stone-400 text-[11px]">
                    Carrier Provider: {testLabelResult.carrier} (Sample Test Mode)
                  </p>
                )}
                {testLabelResult.error && (
                  <p className="text-rose-400 text-[11px] font-sans">{testLabelResult.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Raw JSON Debug Inspector */}
          <div className="space-y-2">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-700" />
              <span>{showRawJson ? 'Hide Live Shippo API Handshake Payload' : 'Inspect Live Shippo API Handshake Payload'}</span>
            </button>

            {showRawJson && diagnostics?.rawResponse && (
              <div className="relative bg-stone-950 text-emerald-400 p-4 rounded-xl border border-stone-800 font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(diagnostics.rawResponse, null, 2));
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }}
                  className="absolute top-3 right-3 px-2 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                </button>
                <pre>{JSON.stringify(diagnostics.rawResponse, null, 2)}</pre>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 font-sans">
          <span>Target: api.goshippo.com</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
