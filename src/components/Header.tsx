import React from 'react';
import { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { GoogleSheetConfig } from '../types/mandi';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  LogOut, 
  MapPin, 
  Cloud,
  CloudUpload,
  RefreshCw,
  Lock,
  FileText
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  sheetConfig: GoogleSheetConfig | null;
  onOpenSheetModal: () => void;
  currentMandi: string;
  onMandiChange: (mandi: string) => void;
  cloudSyncActive?: boolean;
  isSyncingCloud?: boolean;
  onSyncLaptopData?: () => void;
  hasLocalDataToUpload?: boolean;
  onOpenLetterPad?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  sheetConfig,
  onOpenSheetModal,
  currentMandi,
  onMandiChange,
  cloudSyncActive = false,
  isSyncingCloud = false,
  onSyncLaptopData,
  hasLocalDataToUpload = false,
  onOpenLetterPad,
}) => {
  const mandiOptions = [
    'Khanna Grain Market (Asia’s Largest)',
    'Barnala Mandi',
    'Moga Grain Market',
    'Bhadaur Yard',
    'Sangrur Mandi',
    'Ludhiana Mandi',
    'Jalandhar Mandi',
    'Bathinda Mandi',
  ];

  return (
    <header className="print:hidden bg-emerald-950 text-white border-b border-emerald-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center shadow-lg border border-amber-400/30 flex-shrink-0">
              <span className="text-2xl select-none" role="img" aria-label="wheat">🌾</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  KisanMitra ERP
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-800/80 text-amber-300 font-semibold border border-emerald-700">
                    ਆੜ੍ਹਤ 2.0
                  </span>
                </h1>
              </div>
              <p className="text-xs text-emerald-200/80 flex items-center gap-1">
                <span>ਕਿਸਾਨ ਮਿੱਤਰ ਆੜ੍ਹਤ ਸਾਫਟਵੇਅਰ</span>
                <span className="text-emerald-400">•</span>
                <span>Punjab Mandi Commission Automation</span>
              </p>
            </div>
          </div>

          {/* Mandi selector & Google integration bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mandi Yard Selector */}
            <div className="flex items-center gap-1.5 bg-emerald-900/80 border border-emerald-700/60 rounded-lg px-2.5 py-1.5 text-xs text-emerald-100">
              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <select
                value={currentMandi}
                onChange={(e) => onMandiChange(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1 text-xs"
              >
                {mandiOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-emerald-950 text-white">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Letter Pad Access Button */}
            {onOpenLetterPad && (
              <button
                type="button"
                onClick={onOpenLetterPad}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-emerald-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
                title="ਦੋਵੇਂ ਫਰਮਾਂ ਦਾ ਲੈਟਰ ਪੈਡ ਖੋਲ੍ਹੋ (ਪ੍ਰਿੰਟ ਅਤੇ PDF)"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-950" />
                <span>ਲੈਟਰ ਪੈਡ (Letter Pad)</span>
                <span className="bg-emerald-950 text-amber-300 text-[10px] px-1 py-0.2 rounded font-bold">
                  Print & PDF
                </span>
              </button>
            )}

            {/* Cloud Sync Status Badge */}
            {user && (
              <div 
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                  cloudSyncActive
                    ? 'bg-emerald-900/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-gray-800/70 border-gray-700 text-gray-300'
                }`}
                title="ਕਲਾਊਡ ਸਿੰਕ ਐਕਟਿਵ: ਮੋਬਾਈਲ ਅਤੇ ਲੈਪਟਾਪ ਦੋਵਾਂ ਵਿੱਚ ਡਾਟਾ ਆਪਣੇ ਆਪ ਸਿੰਕ ਹੋ ਰਿਹਾ ਹੈ"
              >
                <Cloud className={`w-3.5 h-3.5 ${cloudSyncActive ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
                <span className="hidden sm:inline">ਮੋਬਾਈਲ+ਲੈਪਟਾਪ ਲਾਈਵ</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
            )}

            {/* Upload local laptop data button if needed */}
            {user && hasLocalDataToUpload && onSyncLaptopData && (
              <button
                onClick={onSyncLaptopData}
                disabled={isSyncingCloud}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-colors shadow-xs cursor-pointer animate-bounce"
                title="ਲੈਪਟਾਪ ਦਾ ਲੋਕਲ ਡਾਟਾ ਕਲਾਊਡ ਤੇ ਅਪਲੋਡ ਕਰੋ ਤਾਂ ਜੋ ਮੋਬਾਈਲ ਵਿੱਚ ਵੀ ਦਿਸੇ"
              >
                {isSyncingCloud ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ਅਪਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>ਲੈਪਟਾਪ ਡਾਟਾ ਸਿੰਕ ਕਰੋ</span>
                  </>
                )}
              </button>
            )}

            {/* Google Sheets Status */}
            {sheetConfig ? (
              <div className="flex items-center gap-1.5 bg-emerald-900/90 border border-emerald-700 rounded-lg px-3 py-1.5 text-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="max-w-[130px] truncate text-emerald-100 font-medium" title={sheetConfig.spreadsheetTitle}>
                  {sheetConfig.spreadsheetTitle}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> ਫਿਕਸਡ
                </span>
                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-0.5 ml-1 font-semibold underline decoration-amber-400/50"
                  title="ਲਾਈਵ ਗੂਗਲ ਸ਼ੀਟ ਖੋਲ੍ਹੋ"
                >
                  ਖੋਲ੍ਹੋ <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={onOpenSheetModal}
                  className="text-emerald-300 hover:text-white text-[11px] ml-1 bg-emerald-800/80 px-1.5 py-0.5 rounded cursor-pointer"
                  title="ਸ਼ੀਟ ਸੈਟਿੰਗਜ਼ ਬਦਲੋ"
                >
                  ਸੈਟਿੰਗ
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenSheetModal}
                className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ਗੂਗਲ ਸ਼ੀਟ ਲਿੰਕ ਕਰੋ</span>
              </button>
            )}

            {/* Google Account Authentication */}
            {user ? (
              <div className="flex items-center gap-2 bg-emerald-900/60 border border-emerald-800 rounded-lg pl-2 pr-1.5 py-1 text-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full ring-1 ring-emerald-500"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-[10px] font-bold text-white">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                <span className="text-emerald-100 font-medium max-w-[110px] truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={onLogout}
                  className="text-emerald-300 hover:text-rose-300 p-1 rounded transition-colors cursor-pointer"
                  title="ਗੂਗਲ ਅਕਾਊਂਟ ਤੋਂ ਬਾਹਰ ਆਓ (Sign out)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <GoogleSignInButton
                onClick={onLogin}
                isLoading={isLoggingIn}
                text="ਗੂਗਲ ਸਾਈਨ-ਇਨ (ਸਿੰਕ ਲਈ)"
                className="py-1.5 px-3 text-xs"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
