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
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Compass
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryLogin?: () => void;
  onRetryRedirectLogin?: () => void;
  lastError?: { code?: string; message?: string } | null;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  onRetryLogin,
  onRetryRedirectLogin,
  lastError,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'firebase' | 'cloud_console' | 'redirect_login'>('firebase');
  
  const currentDomain = typeof window !== 'undefined' && window.location.hostname 
    ? window.location.hostname 
    : 'real-mandi-software-erp.vercel.app';
  
  const fullOrigin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : `https://${currentDomain}`;

  const projectId = firebaseConfig.projectId || 'gen-lang-client-0474301423';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
  const gcpCredentialsUrl = `https://console.cloud.google.com/apis/credentials?project=${projectId}`;

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-amber-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/30 rounded-xl border border-amber-300/40">
              <AlertTriangle className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                ਗੂਗਲ ਲੌਗਇਨ ਸਮੱਸਿਆ ਨਿਵਾਰਣ (Google Login Troubleshooter)
              </h3>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Vercel Custom Domain: <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded text-amber-200">{currentDomain}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'firebase'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            1. Firebase Domain ਜਾਂਚ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cloud_console')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'cloud_console'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            2. Google Cloud Origins
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('redirect_login')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'redirect_login'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            3. ਬਿਨਾਂ ਪੌਪ-ਅੱਪ ਲੌਗਇਨ
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-gray-800 text-sm">
          
          {/* Live Error Alert if present */}
          {lastError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900 flex items-start gap-2.5">
              <Terminal className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <span className="font-bold">ਬ੍ਰਾਊਜ਼ਰ ਤੋਂ ਪ੍ਰਾਪਤ ਐਰਰ:</span>{' '}
                <code className="font-mono font-bold text-red-700 bg-red-100/70 px-1 rounded">
                  {lastError.code || 'UNKNOWN_ERROR'}
                </code>
                <p className="mt-1 font-mono text-[11px] text-red-800 break-all">
                  {lastError.message}
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: Firebase Domain */}
          {activeTab === 'firebase' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 leading-relaxed">
                <p className="font-bold text-sm text-amber-900 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  ਸਭ ਤੋਂ ਵੱਡੀ ਆਮ ਗਲਤੀ (Common Mistake):
                </p>
                <p>
                  Firebase ਵਿੱਚ ਡੋਮੇਨ ਜੋੜਦੇ ਸਮੇਂ ਅਕਸਰ ਲੋਕ ਪੂਰਾ URL ਕਾਪੀ ਕਰਕੇ <code className="bg-red-100 text-red-800 px-1 py-0.5 rounded font-bold line-through">https://real-mandi-software-erp.vercel.app/</code> ਪਾ ਦਿੰਦੇ ਹਨ।
                </p>
                <p className="mt-1.5 font-bold text-emerald-900 bg-emerald-100/80 p-2 rounded-lg border border-emerald-300">
                  ਸਹੀ ਤਰੀਕਾ: ਸਿਰਫ਼ <code className="text-emerald-900 font-bold underline">{currentDomain}</code> ਹੀ ਪਾਓ! ਨਾ ਅੱਗੇ https:// ਲਗਾਓ ਅਤੇ ਨਾ ਹੀ ਪਿੱਛੇ / ਲਗਾਓ।
                </p>
              </div>

              {/* Exact Domain Box with Copy */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-700" />
                    ਬਿਲਕੁਲ ਸਾਫ਼ ਡੋਮੇਨ (Firebase ਲਈ ਕਾਪੀ ਕਰੋ):
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">100% ਸਹੀ ਫਾਰਮੈਟ</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-emerald-900 select-all overflow-x-auto truncate">
                    {currentDomain}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentDomain)}
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
                        <span>ਸਿਰਫ਼ ਡੋਮੇਨ ਕਾਪੀ ਕਰੋ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step by Step Guide */}
              <div className="space-y-2 bg-stone-50 rounded-xl p-3.5 border border-stone-200 text-xs">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>ਕਿਵੇਂ ਜੋੜਨਾ ਹੈ (30 ਸੈਕਿੰਡ ਦਾ ਕੰਮ):</span>
                </h4>
                <ol className="space-y-1.5 text-gray-700 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                    <span>ਹੇਠਾਂ ਦਿੱਤੇ ਬਟਨ ਤੋਂ Firebase Console (ਪ੍ਰੋਜੈਕਟ: <strong>{projectId}</strong>) ਖੋਲ੍ਹੋ।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                    <span>ਸਕ੍ਰੋਲ ਕਰਕੇ <strong>Authorized domains</strong> ਵਿੱਚ <strong>"Add domain"</strong> ਦਬਾਓ।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                    <span>ਉੱਪਰੋਂ ਕਾਪੀ ਕੀਤਾ ਡੋਮੇਨ (<code>{currentDomain}</code>) ਪੇਸਟ ਕਰਕੇ ਸੇਵ ਕਰੋ। (ਨੋਟ: ਨਵੇਂ ਡੋਮੇਨ ਨੂੰ ਲਾਈਵ ਹੋਣ ਵਿੱਚ 2-5 ਮਿੰਟ ਲੱਗ ਸਕਦੇ ਹਨ)।</span>
                  </li>
                </ol>
              </div>

              {/* Firebase Console Link Button */}
              <a
                href={firebaseSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                <span>Firebase Console Authorized Domains ਖੋਲ੍ਹੋ</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* TAB 2: Google Cloud Console */}
          {activeTab === 'cloud_console' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-950 leading-relaxed">
                <p className="font-bold text-sm text-sky-900 mb-1 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-sky-700" />
                  ਗੂਗਲ ਕਲਾਊਡ ਕੰਸੋਲ (Error 400: origin_mismatch ਦਾ ਹੱਲ):
                </p>
                <p>
                  ਜੇਕਰ ਗੂਗਲ ਲੌਗਇਨ ਪੌਪ-ਅੱਪ ਖੁੱਲ੍ਹਣ ਤੋਂ ਬਾਅਦ ਕਹਿੰਦਾ ਹੈ: <em>"Access blocked: This app's request is invalid"</em> ਜਾਂ <em>"Error 400: origin_mismatch"</em>, ਤਾਂ ਇਸਦਾ ਮਤਲਬ ਹੈ ਕਿ ਗੂਗਲ ਕਲਾਊਡ ਵਿੱਚ Authorized Origin ਦਰਜ ਨਹੀਂ ਹੈ।
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Authorized JavaScript Origin (ਪੂਰਾ URL ਕਾਪੀ ਕਰੋ):</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-sky-900 select-all truncate">
                    {fullOrigin}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(fullOrigin)}
                    className="inline-flex items-center gap-1.5 bg-sky-800 hover:bg-sky-900 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>Origin ਕਾਪੀ ਕਰੋ</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 bg-stone-50 rounded-xl p-3.5 border border-stone-200 text-xs text-gray-700">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider">ਕਦਮ:</h4>
                <ol className="space-y-1.5 pl-1">
                  <li>1. ਹੇਠਾਂ ਦਿੱਤੇ ਲਿੰਕ ਤੋਂ <strong>Google Cloud Console Credentials</strong> ਖੋਲ੍ਹੋ।</li>
                  <li>2. <strong>OAuth 2.0 Client IDs</strong> ਅਧੀਨ ਆਪਣੇ ਵੈੱਬ ਕਲਾਇੰਟ (Web client) 'ਤੇ ਕਲਿੱਕ ਕਰੋ।</li>
                  <li>3. <strong>Authorized JavaScript origins</strong> ਵਿੱਚ ਜਾ ਕੇ <code className="font-bold text-sky-900">{fullOrigin}</code> ਸ਼ਾਮਲ ਕਰੋ ਅਤੇ Save ਦਬਾਓ।</li>
                </ol>
              </div>

              <a
                href={gcpCredentialsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-sky-800 hover:bg-sky-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
              >
                <span>Google Cloud Console Credentials ਖੋਲ੍ਹੋ</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* TAB 3: Redirect Login */}
          {activeTab === 'redirect_login' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 leading-relaxed">
                <p className="font-bold text-sm text-emerald-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  ਬਿਨਾਂ ਪੌਪ-ਅੱਪ ਦੇ ਸਿੱਧਾ ਲੌਗਇਨ (Redirect Sign-In):
                </p>
                <p>
                  Chrome ਬ੍ਰਾਊਜ਼ਰ ਕਈ ਵਾਰ Vercel ਉੱਤੇ ਪੌਪ-ਅੱਪ ਵਿੰਡੋ ਜਾਂ ਥਰਡ-ਪਾਰਟੀ ਕੁਕੀਜ਼ ਨੂੰ ਬਲੌਕ ਕਰ ਦਿੰਦਾ ਹੈ। 
                  ਹੇਠਾਂ ਦਿੱਤਾ <strong>"ਪੂਰੇ ਪੇਜ ਰਾਹੀਂ ਲੌਗਇਨ"</strong> ਬਟਨ ਬਿਨਾਂ ਕਿਸੇ ਪੌਪ-ਅੱਪ ਦੇ ਸਿੱਧਾ ਗੂਗਲ ਪੇਜ 'ਤੇ ਲੈ ਜਾਂਦਾ ਹੈ ਅਤੇ ਲੌਗਇਨ ਕਰਵਾ ਕੇ ਵਾਪਸ ਲੈ ਆਉਂਦਾ ਹੈ।
                </p>
              </div>

              {onRetryRedirectLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRetryRedirectLogin();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-lg transition-all active:scale-[0.99] cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>ਪੂਰੇ ਪੇਜ ਰਾਹੀਂ ਗੂਗਲ ਲੌਗਇਨ ਕਰੋ (Redirect Sign-In)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700">
                <p className="font-bold text-gray-900">Chrome Pop-up Unblock ਕਰਨ ਦਾ ਤਰੀਕਾ:</p>
                <p className="mt-1">
                  Chrome ਵਿੱਚ ਉੱਪਰ URL ਬਾਰ ਦੇ ਖੱਬੇ ਪਾਸੇ ਦਿੱਤੇ ਸੈਟਿੰਗਜ਼/ਲੌਕ ਆਈਕਨ 'ਤੇ ਕਲਿੱਕ ਕਰੋ ਅਤੇ <strong>"Pop-ups and redirects"</strong> ਨੂੰ <strong>Allow</strong> ਕਰੋ।
                </p>
              </div>
            </div>
          )}

          {/* Local Mode Notice */}
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-3 text-xs text-gray-700 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900">ਲੋਕਲ ਮੋਡ ਵਿੱਚ ਸਾਰਾ ਕੰਮ ਚਾਲੂ ਰਹੇਗਾ:</p>
              <p className="mt-0.5 text-gray-600">
                ਕਿਸਾਨ ਰਜਿਸਟਰ, ਬੈਚ ਐਂਟਰੀ, ਸੁਕਾਈ/ਡਬਲ ਪੱਖਾ ਕਟੌਤੀ, ਬਾਰਦਾਨਾ, ਲਿਫਟਿੰਗ, ਪ੍ਰਿੰਟ, ਲੈਟਰ ਪੈਡ, PDF - ਸਭ ਕੁਝ ਬਿਨਾਂ ਲੌਗਇਨ ਕੀਤੇ ਵੀ 100% ਚੱਲਦਾ ਹੈ ਅਤੇ ਡਾਟਾ ਸੁਰੱਖਿਅਤ ਹੈ। ਲੌਗਇਨ ਸਿਰਫ਼ ਗੂਗਲ ਸ਼ੀਟ ਨਾਲ ਆਟੋਮੈਟਿਕ ਸਿੰਕ ਕਰਨ ਲਈ ਹੈ।
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (ਲੋਕਲ ਕੰਮ ਜਾਰੀ ਰੱਖੋ)
          </button>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onRetryRedirectLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetryRedirectLogin();
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Redirect ਲੌਗਇਨ</span>
              </button>
            )}

            {onRetryLogin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetryLogin();
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ (Popup)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
