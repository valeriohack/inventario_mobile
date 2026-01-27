
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  RefreshCw, 
  List, 
  Package, 
  ClipboardCheck,
  ChevronLeft,
  Share2,
  AlertTriangle,
  History,
  ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { decodeGS1 } from './services/gs1Decoder';
import { InventoryItem, AppState } from './types';
import Scanner from './components/Scanner';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>('HOME');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('scanventory_v1');
    if (saved) {
      try {
        setInventory(JSON.parse(saved));
      } catch (e) {
        console.error("Storage Error", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scanventory_v1', JSON.stringify(inventory));
  }, [inventory]);

  const handleScan = useCallback((decodedText: string) => {
    if ('vibrate' in navigator) navigator.vibrate(100);
    
    const gs1 = decodeGS1(decodedText);
    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      code: decodedText,
      gtin: gs1.gtin || decodedText,
      lot: gs1.lot || '-',
      expiry: gs1.expiryDate || '-',
      quantity: 1,
      timestamp: new Date().toLocaleString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit', 
        day: '2-digit', 
        month: '2-digit' 
      })
    };

    setInventory(prev => [newItem, ...prev]);
    setLastScanned(newItem.gtin);
    setShowScanner(false);
    setView('LIST');

    setTimeout(() => setLastScanned(null), 3000);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const manualQuantity = (id: string, val: string) => {
    const n = parseInt(val);
    if (!isNaN(n)) {
      setInventory(prev => prev.map(item => item.id === id ? { ...item, quantity: n } : item));
    }
  };

  const removeItem = (id: string) => {
    if (confirm('Rimuovere questo articolo dall\'elenco?')) {
      setInventory(prev => prev.filter(item => item.id !== id));
    }
  };

  const startNewSession = () => {
    if (inventory.length > 0 && confirm('Attenzione: cancellare tutti i dati e iniziare una nuova sessione?')) {
      setInventory([]);
      setView('HOME');
    } else if (inventory.length === 0) {
      setView('HOME');
    }
  };

  const exportAndShare = async () => {
    if (inventory.length === 0) {
      alert("Nulla da esportare.");
      return;
    }

    if (!confirm(`Esportare ${inventory.length} righe in formato Excel?`)) return;

    try {
      const data = inventory.map(item => ({
        'GTIN/Codice': item.gtin,
        'Quantità': item.quantity,
        'Lotto': item.lot,
        'Scadenza': item.expiry,
        'Timestamp': item.timestamp,
        'Full_Barcode': item.code
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
      const fileName = `inventario_${dateStr}_${timeStr}.xlsx`;

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Export Inventario ScanVentory',
          text: `Rilevazione inventariale del ${now.toLocaleString()}`
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error", err);
      alert("Errore durante l'esportazione.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-xl mx-auto bg-slate-900 shadow-2xl overflow-hidden selection:bg-blue-500/30">
      {/* App Bar */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== 'HOME' && (
            <button onClick={() => setView('HOME')} className="p-2 -ml-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400">
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">ScanVentory <span className="text-blue-500">PRO</span></h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Warehouse Management</p>
          </div>
        </div>
        <button 
          onClick={startNewSession}
          className="p-2 text-slate-400 hover:text-orange-400 transition-colors"
          title="Nuova Sessione"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      {/* View Engine */}
      <main className="flex-1 overflow-y-auto pb-32">
        {view === 'HOME' && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative w-32 h-32 bg-slate-800 border border-slate-700 text-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
                <Package size={64} strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tight">Pronto per la rilevazione?</h2>
                <p className="text-slate-400 max-w-[250px] mx-auto text-sm leading-relaxed">
                  Scansiona barcode 1D o GS1 DataMatrix.
                </p>
              </div>
              
              {/* Badge Informativa Sincronizzazione */}
              <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-full">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Dati Locali & Privati</span>
              </div>
            </div>

            <div className="flex flex-col w-full gap-4 max-w-xs">
              <button 
                onClick={() => setShowScanner(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Plus size={24} /> Inizia Scansione
              </button>
              <button 
                onClick={() => setView('LIST')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-4 px-8 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all border border-slate-700"
              >
                <History size={20} /> Storico ({inventory.length})
              </button>
            </div>
            
            <p className="text-slate-600 text-[10px] max-w-[200px] leading-tight">
              I dati sono salvati solo su questo dispositivo. Esporta il file Excel per condividerli.
            </p>
          </div>
        )}

        {view === 'LIST' && (
          <div className="p-4 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between sticky top-0 bg-slate-900/90 py-2 z-10 backdrop-blur-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <List size={14} /> Articoli in sessione ({inventory.length})
              </h3>
              {inventory.length > 0 && (
                <button onClick={exportAndShare} className="text-blue-500 text-sm font-bold flex items-center gap-1">
                  Esporta <Share2 size={14} />
                </button>
              )}
            </div>

            {inventory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700">
                <AlertTriangle size={40} className="text-slate-600 mb-4" />
                <p className="text-slate-500 text-sm">Nessuna rilevazione presente.</p>
                <button onClick={() => setShowScanner(true)} className="mt-4 text-blue-500 font-bold">Scansiona ora</button>
              </div>
            ) : (
              <div className="grid gap-3">
                {inventory.map((item) => (
                  <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm flex flex-col group">
                    <div className="p-4 flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">GTIN / Codice</span>
                        <p className="text-lg font-mono font-bold text-white break-all">{item.gtin}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Lotto</span>
                            <span className="text-xs text-slate-300 font-medium">{item.lot}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Scadenza</span>
                            <span className="text-xs text-slate-300 font-medium">{item.expiry}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-3 bg-slate-900 text-slate-600 hover:text-red-500 rounded-xl transition-colors active:bg-red-500/10"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="bg-slate-900/50 px-4 py-3 flex items-center justify-between border-t border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-transform"
                          >
                            -
                          </button>
                          <input 
                            type="number"
                            value={item.quantity}
                            onChange={(e) => manualQuantity(item.id, e.target.value)}
                            className="w-14 bg-transparent text-center text-white font-black text-xl outline-none"
                          />
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-transform"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600">{item.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quick Action Dock */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none z-50">
        <div className="max-w-md mx-auto flex items-end justify-between pointer-events-auto">
          {view === 'LIST' && inventory.length > 0 && (
             <button 
              onClick={exportAndShare}
              className="w-14 h-14 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-green-900/40 active:scale-90 transition-all border border-green-500"
            >
              <Share2 size={24} />
            </button>
          )}
          <div className="flex-1"></div>
          <button 
            onClick={() => setShowScanner(true)}
            className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900/40 active:scale-90 transition-all border-4 border-slate-900 group"
          >
            <Plus size={40} className="group-active:rotate-90 transition-transform" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {lastScanned && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[60] flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <ClipboardCheck size={20} />
          <span className="text-sm font-bold">Aggiunto: {lastScanned}</span>
        </div>
      )}

      {/* Scanner Overlay */}
      {showScanner && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
};

export default App;
