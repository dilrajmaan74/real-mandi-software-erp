import React, { useState } from 'react';
import { GoogleSheetConfig } from '../types/mandi';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Plus, 
  Check, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Layers, 
  Database,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2
} from 'lucide-react';
import { createMandiSpreadsheet, testSheetAccess } from '../lib/sheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  currentConfig: GoogleSheetConfig | null;
  onSaveConfig: (config: GoogleSheetConfig) => void;
  currentMandi: string;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  token,
  currentConfig,
  onSaveConfig,
  currentMandi,
}) => {
  const [sheetInput, setSheetInput] = useState(currentConfig?.spreadsheetId || '');
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleCreateNew = async () => {
    if (!token) {
      setStatusMessage({ type: 'error', text: 'ਪਹਿਲਾਂ ਗੂਗਲ ਅਕਾਊਂਟ ਨਾਲ ਸਾਈਨ-ਇਨ ਕਰੋ ਜੀ (Please sign in with Google first).' });
      return;
    }

    setIsCreating(true);
    setStatusMessage(null);
    try {
      const year = new Date().getFullYear();
      const title = `KisanMitra ERP - ${currentMandi} (${year})`;
      const result = await createMandiSpreadsheet(token, title);

      const newConfig: GoogleSheetConfig = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: result.title,
        spreadsheetUrl: result.spreadsheetUrl,
        connectedAt: new Date().toISOString(),
      };

      onSaveConfig(newConfig);
      setStatusMessage({
        type: 'success',
        text: `ਸ਼ੀਟ ਸਫਲਤਾਪੂਰਵਕ ਬਣ ਗਈ ਅਤੇ ਪੱਕੀ ਫਿਕਸ ਕਰ ਦਿੱਤੀ ਗਈ: "${result.title}"`,
      });
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'ਗੂਗਲ ਡਰਾਈਵ ਤੇ ਸ਼ੀਟ ਬਣਾਉਣ ਵਿੱਚ ਗਲਤੀ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'ਪਹਿਲਾਂ ਗੂਗਲ ਅਕਾਊਂਟ ਨਾਲ ਸਾਈਨ-ਇਨ ਕਰੋ ਜੀ (Please sign in with Google first).' });
      return;
    }

    if (!sheetInput.trim()) {
      setStatusMessage({ type: 'error', text: 'ਕਿਰਪਾ ਕਰਕੇ ਗੂਗਲ ਸ਼ੀਟ ਦਾ ਲਿੰਕ (URL) ਜਾਂ ਸ਼ੀਟ ID ਦਾਖਲ ਕਰੋ।' });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);
    try {
      const meta = await testSheetAccess(token, sheetInput.trim());
      const cleanId = sheetInput.includes('/d/')
        ? sheetInput.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || sheetInput
        : sheetInput;

      const newConfig: GoogleSheetConfig = {
        spreadsheetId: cleanId,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        connectedAt: new Date().toISOString(),
      };

      onSaveConfig(newConfig);
      setStatusMessage({
        type: 'success',
        text: `ਸ਼ੀਟ ਪੱਕੀ ਫਿਕਸ ਹੋ ਗਈ: "${meta.title}"! ਹੁਣ ਮੋਬਾਈਲ ਅਤੇ ਲੈਪਟਾਪ ਦੋਵਾਂ ਤੇ ਇਹੀ ਸ਼ੀਟ ਖੁੱਲ੍ਹੇਗੀ।`,
      });
    } catch (err: any) {
      console.error('Error testing spreadsheet:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'ਸ਼ੀਟ ਖੋਲ੍ਹਣ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਲਿੰਕ ਅਤੇ ਪਰਮਿਸ਼ਨ ਚੈੱਕ ਕਰੋ।',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden text-gray-900">
        
        {/* Header */}
        <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-lg text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">ਮਾਸਟਰ ਗੂਗਲ ਸ਼ੀਟ ਸੈਟਅੱਪ</h3>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  ਪੱਕਾ ਫਿਕਸ ਲਿੰਕ
                </span>
              </div>
              <p className="text-xs text-emerald-200">ਮੋਬਾਈਲ ਅਤੇ ਲੈਪਟਾਪ ਦੋਵਾਂ ਲਈ ਇੱਕੋ ਸਥਾਈ ਸ਼ੀਟ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Multi-device sync explanation note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700 flex-shrink-0 mt-0.5">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-bold mb-0.5 flex items-center gap-1">
                <span>ਲੈਪਟਾਪ ਅਤੇ ਮੋਬਾਈਲ ਲਈ ਇੱਕੋ ਸ਼ੀਟ ਫਿਕਸ ਕਰੋ:</span>
              </p>
              <p className="text-blue-800">
                ਇੱਕ ਵਾਰ ਲਿੰਕ ਕਰਨ ਤੋਂ ਬਾਅਦ ਤੁਹਾਡੀ ਗੂਗਲ ਸ਼ੀਟ ਕਲਾਊਡ ਵਿੱਚ ਪੱਕੀ ਲਾਕ ਹੋ ਜਾਵੇਗੀ। ਤੁਸੀਂ ਮੋਬਾਈਲ ਤੋਂ ਐਂਟਰੀ ਕਰੋ ਜਾਂ ਆਫਿਸ ਲੈਪਟਾਪ ਤੋਂ, ਹਰ ਵਾਰ ਇੱਕੋ ਸ਼ੀਟ ਵਿੱਚ ਸਾਰਾ ਡਾਟਾ ਲਾਈਵ ਅਪਡੇਟ ਹੋਵੇਗਾ।
              </p>
            </div>
          </div>

          {/* Active connection card if already connected */}
          {currentConfig && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 flex items-start justify-between gap-3 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ਮੌਜੂਦਾ ਪੱਕੀ ਸ਼ੀਟ (Currently Fixed Sheet)
                  </span>
                </div>
                <h4 className="font-bold text-sm text-gray-900 mt-1">
                  {currentConfig.spreadsheetTitle}
                </h4>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate max-w-sm">
                  ID: {currentConfig.spreadsheetId}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-800 font-medium">
                  <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> ਮੋਬਾਈਲ ਐਕਟਿਵ</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Laptop className="w-3 h-3" /> ਲੈਪਟਾਪ ਐਕਟਿਵ</span>
                </div>
              </div>

              <a
                href={currentConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <span>ਸ਼ੀਟ ਖੋਲ੍ਹੋ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Feedback message banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 flex-shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Option A: Connect Existing Google Sheet from Laptop */}
          <form onSubmit={handleConnectExisting} className="border border-blue-200 rounded-xl p-4 bg-blue-50/40">
            <h4 className="text-sm font-bold text-blue-950 flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4 text-blue-700" />
              ਵਿਕਲਪ 1: ਲੈਪਟਾਪ ਵਾਲੀ ਪੁਰਾਣੀ ਸ਼ੀਟ ਦਾ ਲਿੰਕ ਪਾ ਕੇ ਪੱਕਾ ਫਿਕਸ ਕਰੋ
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              ਜੋ ਗੂਗਲ ਸ਼ੀਟ ਤੁਸੀਂ ਪਹਿਲਾਂ ਲੈਪਟਾਪ ਵਿੱਚ ਬਣਾਈ ਸੀ, ਉਸਦਾ ਲਿੰਕ (URL) ਇੱਥੇ ਪੇਸਟ ਕਰੋ:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR.../edit ਜਾਂ Sheet ID"
                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:border-blue-600 focus:outline-none font-mono"
              />
              <button
                type="submit"
                disabled={isTesting || !token || !sheetInput.trim()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex-shrink-0 flex items-center gap-1.5"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>ਲਿੰਕ ਫਿਕਸ ਕਰੋ</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Option B: One-click Create New Mandi Spreadsheet */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  ਵਿਕਲਪ 2: ਬਿਲਕੁਲ ਨਵੀਂ ਆਟੋਮੈਟਿਕ ਮੰਡੀ ਸ਼ੀਟ ਬਣਾਓ
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  ਤੁਹਾਡੀ ਗੂਗਲ ਡਰਾਈਵ ਤੇ 5 ਸਪੈਸ਼ਲ ਟੈਬਾਂ (Tabs) ਨਾਲ ਨਵੀਂ ਮਾਸਟਰ ਸ਼ੀਟ ਆਪਣੇ ਆਪ ਬਣ ਜਾਵੇਗੀ:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Master_ERP_Feed',
                    'Mandi_Inward_Auction',
                    'Bardana_Inventory',
                    'Lifting_Dispatches',
                    'Kisan_Khata_Ledger',
                  ].map((tab) => (
                    <span
                      key={tab}
                      className="text-[10px] bg-white border border-gray-300 px-2 py-0.5 rounded text-gray-700 font-mono font-medium"
                    >
                      {tab}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={isCreating || !token}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ਸ਼ੀਟ ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>ਨਵੀਂ ਸ਼ੀਟ ਆਟੋ-ਜਨਰੇਟ ਕਰੋ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {!token && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-700" />
              <span>ਗੂਗਲ ਸ਼ੀਟ ਲਿੰਕ ਕਰਨ ਲਈ ਉੱਪਰ ਦਿੱਤੇ ਬਟਨ ਤੋਂ ਗੂਗਲ ਅਕਾਊਂਟ ਨਾਲ ਲੌਗਿਨ ਕਰੋ।</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
