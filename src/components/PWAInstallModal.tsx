import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Laptop, 
  Apple, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  WifiOff, 
  Share2, 
  PlusSquare, 
  ShieldCheck, 
  Zap, 
  Sparkles 
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isDesktop, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'desktop' | 'ios'>(
    isIOS ? 'ios' : isDesktop ? 'desktop' : 'android'
  );
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'dismissed'>('idle');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstallStatus('installing');
    const res = await install();
    if (res === 'accepted') {
      setInstallStatus('success');
      setTimeout(() => {
        onClose();
      }, 2500);
    } else if (res === 'dismissed') {
      setInstallStatus('dismissed');
    } else {
      setInstallStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-emerald-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-2 shadow-lg flex items-center justify-center border-2 border-white/40 shrink-0">
              <img src="/icon.svg" alt="Punjabi Mandi Software" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Punjabi Mandi Software ਐਪ ਇੰਸਟਾਲ ਕਰੋ</h3>
                <span className="px-2 py-0.5 bg-amber-400 text-emerald-950 font-black text-[10px] rounded-full uppercase tracking-wider">
                  ਪੰਜਾਬੀ ਮੰਡੀ ਐਪ
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                ਮੋਬਾਈਲ 'ਤੇ APK ਵਾਂਗ ਅਤੇ ਲੈਪਟਾਪ 'ਤੇ ਡੈਸਕਟਾਪ ਐਪ ਵਾਂਗ ਸਿੱਧਾ ਚਲਾਓ
              </p>
            </div>
          </div>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-3 pt-2 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2.5 px-3 rounded-t-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white border-t-2 border-x border-gray-200 text-emerald-900 border-t-emerald-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android ਫ਼ੋਨ (APK)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-2.5 px-3 rounded-t-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white border-t-2 border-x border-gray-200 text-emerald-900 border-t-emerald-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Laptop className="w-4 h-4 text-blue-600" />
            <span>ਲੈਪਟਾਪ / ਪੀਸੀ (Desktop)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2.5 px-3 rounded-t-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white border-t-2 border-x border-gray-200 text-emerald-900 border-t-emerald-600 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Apple className="w-4 h-4 text-gray-700" />
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 text-xs">
          
          {/* If already running in standalone installed mode */}
          {isInstalled && (
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">ਐਪ ਪਹਿਲਾਂ ਹੀ ਇੰਸਟਾਲ ਹੈ!</p>
                <p className="text-[11px] text-emerald-700">ਤੁਸੀਂ ਇਸ ਵੇਲੇ Punjabi Mandi Software ਨੂੰ ਸਿੱਧੀ ਇੰਸਟਾਲ ਹੋਈ ਐਪ ਵਜੋਂ ਵਰਤ ਰਹੇ ਹੋ।</p>
              </div>
            </div>
          )}

          {/* TAB 1: ANDROID PHONE */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-950 text-sm">Android ਫ਼ੋਨ ਵਿੱਚ ਸਿੱਧਾ ਇੰਸਟਾਲ ਕਰੋ (No PlayStore Required)</h4>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      ਇਹ ਐਪ ਬਿਨਾਂ ਕਿਸੇ ਵੱਡੀ ਫਾਈਲ ਡਾਊਨਲੋਡ ਦੇ, 1 ਸਕਿੰਟ ਵਿੱਚ ਤੁਹਾਡੇ ਫੋਨ ਦੀ ਹੋਮ ਸਕ੍ਰੀਨ 'ਤੇ ਓਰਿਜਨਲ ਐਪ ਵਾਂਗ ਆਈਕਨ ਬਣਾ ਦੇਵੇਗੀ।
                    </p>
                  </div>
                </div>

                {/* 1-Click Install Button */}
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer text-sm"
                  >
                    <Download className="w-5 h-5 text-amber-300" />
                    <span>ਫ਼ੋਨ ਵਿੱਚ ਐਪ ਇੰਸਟਾਲ ਕਰੋ (Install App)</span>
                  </button>
                ) : (
                  <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2">
                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>ਜੇਕਰ ਸਿੱਧਾ ਬਟਨ ਨਾ ਖੁੱਲ੍ਹੇ ਤਾਂ ਇਹ 2 ਆਸਾਨ ਕਦਮ ਕਰੋ:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1 font-medium">
                      <li>
                        ਆਪਣੇ ਫ਼ੋਨ ਵਿੱਚ <strong>Google Chrome</strong> ਦੇ ਸਭ ਤੋਂ ਉੱਪਰ ਸੱਜੇ ਪਾਸੇ <strong>3 ਬਿੰਦੂ (⋮)</strong> ਦਬਾਓ।
                      </li>
                      <li>
                        ਲਿਸਟ ਵਿੱਚੋਂ <strong>&quot;Install app&quot;</strong> ਜਾਂ <strong>&quot;Add to Home screen (ਹੋਮ ਸਕ੍ਰੀਨ 'ਤੇ ਜੋੜੋ)&quot;</strong> ਉੱਤੇ ਕਲਿੱਕ ਕਰੋ।
                      </li>
                      <li>
                        <strong>&quot;Install&quot;</strong> ਦਬਾਓ — Punjabi Mandi Software ਤੁਹਾਡੇ ਮੋਬਾਈਲ ਵਿੱਚ WhatsApp ਵਾਂਗ ਇੱਕ ਓਰਿਜਨਲ ਐਪ ਬਣ ਜਾਵੇਗੀ!
                      </li>
                    </ol>
                  </div>
                )}

                {installStatus === 'success' && (
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ਐਪ ਸਫਲਤਾਪੂਰਵਕ ਇੰਸਟਾਲ ਹੋ ਗਈ! ਤੁਹਾਡੀ ਹੋਮ ਸਕ੍ਰੀਨ 'ਤੇ ਸ਼ਾਮਲ ਹੋ ਗਈ ਹੈ।</span>
                  </div>
                )}
              </div>

              {/* Benefits Pills */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>ਪੂਰੀ ਫੁੱਲ ਸਕ੍ਰੀਨ (No Browser Bar)</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ਫੋਨ ਦੀ ਮੈਮੋਰੀ ਬਹੁਤ ਘੱਟ ਲੈਂਦੀ ਹੈ (Under 2MB)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DESKTOP / LAPTOP */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-700 text-white rounded-xl shadow-xs shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-blue-950 text-sm">ਲੈਪਟਾਪ / ਪੀਸੀ ਵਿੱਚ ਡੈਸਕਟਾਪ ਐਪ ਵਜੋਂ ਚਲਾਓ</h4>
                    <p className="text-blue-800 text-[11px] mt-0.5">
                      ਕੰਪਿਊਟਰ ਦੇ ਟਾਸਕਬਾਰ ਅਤੇ ਡੈਸਕਟਾਪ 'ਤੇ ਇਸ ਦਾ ਆਪਣਾ ਵੱਖਰਾ ਸ਼ਾਰਟਕੱਟ ਆਈਕਨ ਬਣ ਜਾਵੇਗਾ।
                    </p>
                  </div>
                </div>

                {isInstallable ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 active:scale-98 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer text-sm"
                  >
                    <Download className="w-5 h-5 text-amber-300" />
                    <span>ਲੈਪਟਾਪ ਵਿੱਚ ਡੈਸਕਟਾਪ ਐਪ ਇੰਸਟਾਲ ਕਰੋ (Install on Laptop)</span>
                  </button>
                ) : (
                  <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2">
                    <p className="font-bold text-blue-900 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span>ਲੈਪਟਾਪ ਬ੍ਰਾਊਜ਼ਰ (Chrome / Edge) ਤੋਂ ਇੰਸਟਾਲ ਕਰਨ ਦਾ ਤਰੀਕਾ:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 pl-1 font-medium">
                      <li>
                        ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਸਭ ਤੋਂ ਉੱਪਰ ਵੈੱਬਸਾਈਟ ਲਿੰਕ (URL Bar) ਦੇ ਸੱਜੇ ਪਾਸੇ <strong>ਇੰਸਟਾਲ ਆਈਕਨ (🖥️ ਜਾਂ ⬇️)</strong> 'ਤੇ ਕਲਿੱਕ ਕਰੋ।
                      </li>
                      <li>
                        ਜਾਂ ਉੱਪਰ ਸੱਜੇ <strong>3 ਬਿੰਦੂ (⋮)</strong> 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ <strong>&quot;Install Punjabi Mandi Software&quot;</strong> ਚੁਣੋ।
                      </li>
                      <li>
                        ਲੈਪਟਾਪ ਦੀ ਡੈਸਕਟਾਪ ਸਕ੍ਰੀਨ 'ਤੇ Punjabi Mandi Software ਦਾ ਆਈਕਨ ਬਣ ਜਾਵੇਗਾ ਅਤੇ ਇਹ ਵੱਖਰੀ ਵਿੰਡੋ ਵਿੱਚ ਬਿਨਾਂ ਬ੍ਰਾਊਜ਼ਰ ਟੈਬਸ ਦੇ ਖੁੱਲ੍ਹੇਗੀ।
                      </li>
                    </ol>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-[11px] text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ਕੀਬੋਰਡ ਨਾਲ ਤੇਜ਼ ਐਂਟਰੀ, ਫਾਸਟ ਪ੍ਰਿੰਟ ਅਤੇ ਵੱਡੀ ਸਕ੍ਰੀਨ 'ਤੇ ਪੂਰੇ ਚਾਰਟ ਦੇਖਣ ਲਈ ਲੈਪਟਾਪ ਐਪ ਸਭ ਤੋਂ ਵਧੀਆ ਹੈ।</span>
              </div>
            </div>
          )}

          {/* TAB 3: IPHONE / IPAD */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-gray-900 text-white rounded-xl shadow-xs shrink-0">
                    <Apple className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-950 text-sm">iPhone ਜਾਂ iPad 'ਤੇ ਇੰਸਟਾਲ ਕਰਨ ਦਾ ਤਰੀਕਾ</h4>
                    <p className="text-gray-600 text-[11px] mt-0.5">
                      Apple Safari ਬ੍ਰਾਊਜ਼ਰ ਰਾਹੀਂ 2 ਸੈਕਿੰਡ ਵਿੱਚ ਹੋਮ ਸਕ੍ਰੀਨ 'ਤੇ ਐਪ ਆਈਕਨ ਜੋੜੋ:
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Safari ਦੇ ਹੇਠਾਂ ਦਿੱਤੇ <strong>Share</strong> ਬਟਨ</span>
                      <Share2 className="w-4 h-4 text-blue-600 inline" />
                      <span>'ਤੇ ਕਲਿੱਕ ਕਰੋ।</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div className="flex items-center gap-2">
                      <span>ਹੇਠਾਂ ਵੱਲ ਸਕ੍ਰੌਲ ਕਰਕੇ <strong>&quot;Add to Home Screen&quot;</strong></span>
                      <PlusSquare className="w-4 h-4 text-gray-700 inline" />
                      <span>ਦਬਾਓ।</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <div>
                      <span>ਉੱਪਰ ਸੱਜੇ ਪਾਸੇ <strong>&quot;Add&quot;</strong> ਦਬਾਓ — ਐਪ ਤੁਹਾਡੇ ਆਈਫੋਨ 'ਤੇ ਸੇਵ ਹੋ ਜਾਵੇਗੀ।</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ਫਾਸਟ, ਸੁਰੱਖਿਅਤ ਤੇ ਆਟੋ-ਅੱਪਡੇਟ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 rounded-xl transition cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

// Top Navigation Install App Button
export const PWAInstallNavButton: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();

  // If already installed in standalone mode, display a subtle "App Installed" status indicator or keep it minimal
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800/60 text-emerald-200 border border-emerald-700/50 rounded-xl text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>ਐਪ ਇੰਸਟਾਲ ਹੈ</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        // If native prompt is ready, we can trigger directly or open modal
        if (isInstallable) {
          install().then((res) => {
            if (res !== 'accepted') {
              onOpenModal();
            }
          });
        } else {
          onOpenModal();
        }
      }}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer border border-amber-300 animate-pulse hover:animate-none"
      title="ਮੋਬਾਈਲ ਵਿੱਚ APK ਵਾਂਗ ਅਤੇ ਲੈਪਟਾਪ ਵਿੱਚ ਡੈਸਕਟਾਪ ਐਪ ਵਜੋਂ ਇੰਸਟਾਲ ਕਰੋ"
    >
      <Download className="w-4 h-4 text-blue-950 shrink-0" />
      <span className="hidden md:inline">📲 ਐਪ ਇੰਸਟਾਲ ਕਰੋ (Install App)</span>
      <span className="inline md:hidden">📲 ਇੰਸਟਾਲ ਕਰੋ</span>
    </button>
  );
};

// Mandi Offline Connectivity Indicator
export const MandiOfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-600 text-white px-4 py-2.5 text-xs font-bold shadow-xl border-2 border-white animate-bounce">
      <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
      <div>
        <p className="font-bold">ਇੰਟਰਨੈੱਟ ਬੰਦ ਹੈ (Offline Mode)</p>
        <p className="text-[10px] text-amber-100 font-normal">ਸਾਫਟਵੇਅਰ ਕੈਸ਼ ਡਾਟਾ ਵਰਤ ਰਿਹਾ ਹੈ। ਨੈੱਟ ਆਉਣ 'ਤੇ ਸਿੰਕ ਹੋਵੇਗਾ।</p>
      </div>
    </div>
  );
};
