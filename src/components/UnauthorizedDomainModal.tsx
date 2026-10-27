import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Globe, 
  CheckCircle2, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryLogin?: () => void;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  onRetryLogin,
}) => {
  const [copied, setCopied] = useState(false);
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const projectId = firebaseConfig.projectId || 'gen-lang-client-0474301423';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator?.clipboard && currentDomain) {
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-amber-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/30 rounded-xl border border-amber-300/40">
              <AlertTriangle className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                ਗੂਗਲ ਲੌਗਇਨ: ਡੋਮੇਨ ਅਧਿਕਾਰਤ ਕਰੋ
              </h3>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Firebase Error: auth/unauthorized-domain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-gray-800 text-sm">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">ਕਾਰਨ (Reason):</span> ਗੂਗਲ ਸੁਰੱਖਿਆ ਨਿਯਮਾਂ ਅਨੁਸਾਰ, Firebase Authentication ਸਿਰਫ਼ ਉਹਨਾਂ ਵੈੱਬਸਾਈਟਾਂ ਤੋਂ ਲੌਗਇਨ ਦੀ ਆਗਿਆ ਦਿੰਦਾ ਹੈ ਜੋ ਤੁਹਾਡੇ ਪ੍ਰੋਜੈਕਟ ਦੇ <strong>Authorized Domains</strong> ਵਿੱਚ ਦਰਜ ਹੋਣ। ਮੌਜੂਦਾ ਐਪ ਡੋਮੇਨ ਨੂੰ Firebase Console ਵਿੱਚ 1 ਮਿੰਟ ਵਿੱਚ ਸ਼ਾਮਲ ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ।
          </div>

          {/* Current Domain Box with Copy */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-700" />
              <span>ਤੁਹਾਡਾ ਮੌਜੂਦਾ ਐਪ ਡੋਮੇਨ (Current App Domain):</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-gray-900 select-all overflow-x-auto truncate">
                {currentDomain}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-amber-300" />
                    <span>ਕਾਪੀ ਹੋ ਗਿਆ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>ਡੋਮੇਨ ਕਾਪੀ ਕਰੋ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step by Step Guide */}
          <div className="space-y-2.5 bg-stone-50 rounded-xl p-4 border border-stone-200">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>ਸਿਰਫ਼ 3 ਆਸਾਨ ਕਦਮਾਂ ਵਿੱਚ ਹੱਲ (3 Easy Steps):</span>
            </h4>
            
            <ol className="text-xs space-y-2 text-gray-700 pl-1">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">1</span>
                <span>
                  ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਆਪਣੇ Firebase ਪ੍ਰੋਜੈਕਟ (<strong>{projectId}</strong>) ਦੀ <strong>Authentication Settings</strong> ਖੋਲ੍ਹੋ।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">2</span>
                <span>
                  ਸਕ੍ਰੋਲ ਕਰਕੇ <strong>Authorized domains</strong> (ਅਧਿਕਾਰਤ ਡੋਮੇਨ) ਸੈਕਸ਼ਨ ਵਿੱਚ ਜਾਓ ਅਤੇ <strong>"Add domain"</strong> ਬਟਨ ਦਬਾਓ।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5">3</span>
                <span>
                  ਉੱਪਰੋਂ ਕਾਪੀ ਕੀਤਾ ਡੋਮੇਨ (<code>{currentDomain}</code>) ਪੇਸਟ ਕਰਕੇ <strong>Add</strong> ਦਬਾਓ। ਫਿਰ ਵਾਪਸ ਇੱਥੇ ਆ ਕੇ ਲੌਗਇਨ ਕਰੋ!
                </span>
              </li>
            </ol>
          </div>

          {/* Firebase Console Link Button */}
          <div className="pt-1">
            <a
              href={firebaseSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <span>Firebase Console ਵਿੱਚ Authorized Domains ਖੋਲ੍ਹੋ</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Local Mode Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ਚਿੰਤਾ ਦੀ ਕੋਈ ਗੱਲ ਨਹੀਂ - ਲੋਕਲ ਵਰਤੋਂ ਚਾਲੂ ਹੈ:</p>
              <p className="mt-0.5 text-emerald-800">
                ਤੁਹਾਡਾ ਸਾਫਟਵੇਅਰ (ਕਿਸਾਨ ਰਜਿਸਟਰ, ਫਸਲ ਆਵਕ ਬੈਚ ਐਂਟਰੀ, ਬਾਰਦਾਨਾ, ਲਿਫਟਿੰਗ, ਪ੍ਰਿੰਟ, ਲੈਟਰ ਪੈਡ, PDF) ਬਿਨਾਂ ਲੌਗਇਨ ਕੀਤੇ ਵੀ ਪੂਰੀ ਤਰ੍ਹਾਂ ਕੰਮ ਕਰਦਾ ਰਹੇਗਾ ਅਤੇ ਤੁਹਾਡਾ ਡਾਟਾ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਬਿਲਕੁਲ ਸੁਰੱਖਿਅਤ ਹੈ।
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            ਬੰਦ ਕਰੋ ਅਤੇ ਲੋਕਲ ਕੰਮ ਜਾਰੀ ਰੱਖੋ
          </button>
          {onRetryLogin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetryLogin();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>ਮੁੜ ਲੌਗਇਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
