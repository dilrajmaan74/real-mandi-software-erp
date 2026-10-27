import React from 'react';
import { MandiTransaction, GoogleSheetConfig } from '../types/mandi';
import { FileSpreadsheet, AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';

interface SheetsSyncConfirmModalProps {
  isOpen: boolean;
  transaction: MandiTransaction | null;
  sheetConfig: GoogleSheetConfig | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSyncing: boolean;
}

export const SheetsSyncConfirmModal: React.FC<SheetsSyncConfirmModalProps> = ({
  isOpen,
  transaction,
  sheetConfig,
  onConfirm,
  onCancel,
  isSyncing,
}) => {
  if (!isOpen || !transaction || !sheetConfig) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden text-gray-900">
        
        {/* Header */}
        <div className="bg-emerald-900 text-white p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Confirm Google Sheets Sync</h3>
            <p className="text-xs text-emerald-200">Append transaction records to connected spreadsheet</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Target Spreadsheet:</span>
              <span className="font-bold text-gray-900 max-w-[200px] truncate">
                {sheetConfig.spreadsheetTitle}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Farmer Name:</span>
              <span className="font-bold text-gray-900">{transaction.master_record.main_farmer_name}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Crop & Bags:</span>
              <span className="font-bold text-gray-900">{transaction.crop_inward.crop_type} ({transaction.crop_inward.total_bags} Bags)</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Net Payable Balance:</span>
              <span className="font-bold text-emerald-950 font-mono">
                ₹{transaction.financial_ledger.net_payable_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-800">This action will append rows into the following 5 tabs:</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-600 pl-1 font-mono text-[11px]">
              <li>Master_ERP_Feed (Master log)</li>
              <li>Mandi_Inward_Auction (Arrival & MSP)</li>
              <li>Bardana_Inventory (Gunny bags stock)</li>
              <li>Lifting_Dispatches (Truck & dispatch status)</li>
              <li>Kisan_Khata_Ledger (Account & Net Payable)</li>
            </ul>
          </div>

          <p className="text-[11px] text-gray-500 italic">
            Note: Existing data rows will not be deleted or overwritten; new rows are appended to the bottom of each tab.
          </p>
        </div>

        {/* Buttons */}
        <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSyncing}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {isSyncing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Syncing to Google Sheets...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Append Rows</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
