import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useMphLang } from '../../lib/mandiPaddyHisabI18n';

interface MphConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const MphConfirmModal: React.FC<MphConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const { tr } = useMphLang();
  if (!isOpen) return null;
  const resolvedConfirm = confirmLabel || tr('Confirm', 'ਪੱਕਾ ਕਰੋ');
  const resolvedCancel = cancelLabel || tr('Cancel', 'ਰੱਦ ਕਰੋ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 print:hidden">
      <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${
                tone === 'danger' ? 'text-rose-600' : 'text-amber-600'
              }`}
            />
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};
