import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, RefreshCw, Package, 
  ChevronLeft, Share2, AlertTriangle, History
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

  useEffect(() => {
    const saved = localStorage.getItem('scanventory_v3');
    if (saved) setInventory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('scanventory_v3', JSON.stringify(inventory));
  }, [inventory]);

  const handleScan = useCallback((decodedText: string) => {
    if ('vibrate' in navigator) navigator.vibrate(100);
    const gs1 = decodeGS1(decodedText);
    
    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      code: decodedText,
      gtin: gs1.gtin || (gs1.sscc ? '' : decodedText),
      sscc: gs1.sscc || '',
      lot: gs1.lot || '-',
      expiry: gs1.expiryDate || gs1.bestBeforeDate || '-',
      serial: gs1.serial || '',
      quantity: 1,
      timestamp: new Date().toLocaleString('it-IT')
    };

    setInventory(prev => [newItem, ...prev]);
    setLastScanned(newItem.sscc || newItem.gtin);
    setShowScanner(false);
    setView('LIST');
    setTimeout(() => setLastScanned(null), 3000);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item));
  };

  const manualQuantity = (id: string, val: string) => {
    const n = parseInt(val);
    if (!isNaN(n)) setInventory(prev => prev.map(item => item.id === id ? { ...item, quantity: n } : item));
  };

  const removeItem = (id: string) => {
    if (confirm('Rimuovere articolo?')) setInventory(prev => prev.filter(item => item.id !== id));
  };

  const exportAndShare = async () => {
    if (inventory.length === 0) return;
    if (!confirm('Esportare in Excel?')) return;

    const data = inventory.map(item => ({
      'GTIN': item.gtin,
      'SSCC': item.sscc,
      'Quantità': item.quantity,
      'Lotto': item.lot,
      'Scadenza': item.expiry,
      'Seriale': item.serial,
      'Data Ora': item.timestamp,
      'Barcode Grezzo': item.code
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");

    const fileName = `inventario_${new Date().toISOString().slice(0,16).replace(/[:T]/g, '_')}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    try {
      const file = new File([blob], fileName, { type: blob.type });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Export Inventario ScanVentory',
          text: 'Rilevazioni inventariali magazzino.'
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('File scaricato localmente.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-xl mx-auto bg-slate-900 overflow-x-hidden text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== 'HOME' && <button onClick={() => setView('HOME')} className="p-2 text-slate-400"><ChevronLeft /></button>}
          <h1 className="text-lg font-bold">ScanVentory <span className="text-blue-500 text-xs">PRO</span></h1>
        </div>
        <button onClick={() => { if(confirm('Svuotare sessione?')) setInventory([]) }} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><RefreshCw size={18}/></button>
      </header>

      <main className="flex-1 pb-32">
        {view === 'HOME' ? (
          <div className="p-8 flex flex-col items-center justify-center min-h-[75vh] gap-10">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20"></div>
              <Package size={100} className="text-blue-500 relative" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold">Nuovo Inventario</h2>
              <p className="text-slate-400 text-sm italic">Standard GS1-128 & DataMatrix</p>
            </div>
            <div className="w-full space-y-4">
              <button onClick={() => setShowScanner(true)} className="w-full bg-blue-600 p-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"><Plus /> Scansiona Articolo</button>
              <button onClick={() => setView('LIST')} className="w-full bg-slate-800 p-4 rounded-2xl text-slate-300 flex items-center justify-center gap-3 transition-colors"><History size={20}/> Sessione ({inventory.length})</button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur py-3 sticky top-[65px] z-10">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lista Rilevazioni ({inventory.length})</span>
              {inventory.length > 0 && (
                <button onClick={exportAndShare} className="text-blue-500 text-xs font-bold flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full">
                  Condividi Excel <Share2 size={12}/>
                </button>
              )}
            </div>
            {inventory.length === 0 ? (
              <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <AlertTriangle className="mx-auto mb-3 text-slate-700" size={40} />
                <p className="text-slate-600">Nessuna riga inserita.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventory.map(item => (
                  <div key={item.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-blue-500 text-[9px] font-black uppercase mb-1">Identificativo</p>
                        <p className="text-white font-mono font-bold break-all">{item.gtin || item.sscc}</p>
                        {item.sscc && <p className="text-[10px] text-orange-400 font-bold mt-1">AI 00 (SSCC)</p>}
                        {item.serial && <p className="text-[10px] text-green-400 font-bold mt-1">SN: {item.serial}</p>}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-slate-600 p-2"><Trash2 size={18}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="bg-slate-900/50 p-2 rounded-lg">
                        <span className="text-slate-500 block uppercase text-[9px]">Lotto</span>
                        <span className="text-slate-200 font-bold">{item.lot}</span>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded-lg">
                        <span className="text-slate-500 block uppercase text-[9px]">Scadenza</span>
                        <span className="text-slate-200 font-bold">{item.expiry}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                      <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-700">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-10 h-10 text-xl">-</button>
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => manualQuantity(item.id, e.target.value)} 
                          className="w-12 bg-transparent text-center font-black text-blue-400 outline-none" 
                        />
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-10 h-10 text-xl">+</button>
                      </div>
                      <span className="text-[10px] text-slate-600 italic">{item.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-8 left-0 right-0 px-8 flex justify-center pointer-events-none z-50">
        <button onClick={() => setShowScanner(true)} className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-slate-900 pointer-events-auto active:scale-90 transition-transform"><Plus size={40} className="text-white"/></button>
      </div>

      {lastScanned && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-blue-600 px-6 py-3 rounded-full shadow-2xl z-[60] text-sm font-bold animate-bounce border border-blue-400">Letto: {lastScanned}</div>}
      {showScanner && <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
};

export default App;