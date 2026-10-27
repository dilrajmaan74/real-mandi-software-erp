import React, { useState } from 'react';
import { MandiTransaction } from '../types/mandi';
import { X, Copy, Check, Code, Download } from 'lucide-react';

interface JsonViewerModalProps {
  transaction: MandiTransaction | null;
  onClose: () => void;
}

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const jsonString = JSON.stringify(transaction, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transaction.id}_mandi_record.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-800 overflow-hidden text-gray-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Automated JSON Payload (Google Sheets Feed)</h3>
              <p className="text-xs text-gray-400">Strict schema conforming to KisanMitra ERP specs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold text-xs transition-colors cursor-pointer"
              title="Download JSON File"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-emerald-300 leading-relaxed bg-gray-950 flex-1">
          <pre>{jsonString}</pre>
        </div>

        {/* Footer info */}
        <div className="bg-gray-800/80 px-6 py-3 border-t border-gray-700 text-[11px] text-gray-400 flex items-center justify-between">
          <span>Distinct keys: master_record, crop_inward, bardana_tracking, procurement_agency, lifting_dispatch, labor_palledari, financial_ledger</span>
          <span className="font-mono text-emerald-400">{transaction.id}</span>
        </div>
      </div>
    </div>
  );
};
