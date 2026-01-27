
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Zap, ZapOff } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

declare const Html5Qrcode: any;

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<any>(null);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 20,
      qrbox: (viewWidth: number, viewHeight: number) => {
        const size = Math.min(viewWidth, viewHeight) * 0.7;
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
    };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText: string) => {
        onScan(decodedText);
      },
      () => { /* Ignora errori di scansione fallita */ }
    ).catch((err: any) => {
      console.error("Scanner startup failed", err);
      alert("Impossibile accedere alla fotocamera.");
      onClose();
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, onClose]);

  const toggleTorch = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const state = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: state }]
        });
        setTorchOn(state);
      } catch (e) {
        console.warn("Torch not supported", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col scan-active">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
            <Camera size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-none">Punta il Codice</h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Scanner Attivo</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Scanner Area */}
      <div className="flex-1 relative">
        <div id="reader" className="w-full h-full bg-slate-900"></div>
        
        {/* Aiming Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
            
            {/* Scanning Line Animation */}
            <div className="absolute left-4 right-4 h-0.5 bg-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-10 bg-black flex flex-col items-center gap-6">
        <button 
          onClick={toggleTorch}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${torchOn ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-slate-800 text-slate-400'}`}
        >
          {torchOn ? <ZapOff size={24} /> : <Zap size={24} />}
        </button>
        <p className="text-slate-500 text-xs text-center max-w-[200px]">
          Supporta EAN, Code128 e <span className="text-blue-500 font-bold">GS1 DataMatrix</span>.
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0.2; }
          50% { top: 90%; opacity: 1; }
        }
        #reader video {
          height: 100% !important;
          width: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
