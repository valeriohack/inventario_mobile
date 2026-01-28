
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Zap, ZapOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 25,
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
      () => {} // Ignora errori di frame non decodificati
    ).catch((err: any) => {
      console.error("Scanner failed", err);
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
        // Fix: 'torch' is an experimental property and not defined in standard MediaTrackConstraintSet.
        // We use type assertion to bypass the strict TypeScript check for this known browser-specific property.
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: state } as any]
        });
        setTorchOn(state);
      } catch (e) {
        console.warn("Torch not supported", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
            <Camera size={20} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-lg leading-none">Scansione</h2>
        </div>
        <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative">
        <div id="reader" className="w-full h-full bg-slate-900"></div>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
          </div>
        </div>
      </div>

      <div className="p-10 bg-black flex flex-col items-center gap-4">
        <button onClick={toggleTorch} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${torchOn ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
          {torchOn ? <ZapOff size={24} /> : <Zap size={24} />}
        </button>
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest text-center">Inquadra un Barcode o GS1 DataMatrix</p>
      </div>
    </div>
  );
};

export default Scanner;
