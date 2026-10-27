import React from 'react';
import { MandiTransaction } from '../types/mandi';
import { X, Printer, Check, Building, ShieldCheck } from 'lucide-react';

interface JFormModalProps {
  transaction: MandiTransaction | null;
  onClose: () => void;
  currentMandi: string;
}

export const JFormModal: React.FC<JFormModalProps> = ({
  transaction,
  onClose,
  currentMandi,
}) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = transaction.procurement_agency.auction_date || new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-200 overflow-hidden print:border-none print:shadow-none print:max-w-full">
        
        {/* Header Bar - Hidden during print */}
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h3 className="font-bold text-base">Punjab Mandi Board - Form 'J' (ਫਾਰਮ 'ਜੇ')</h3>
              <p className="text-xs text-emerald-200">Official Farmer Sale Slip & Commission Receipt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print J-Form</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable J-Form Canvas */}
        <div className="p-8 print:p-4 text-gray-900 font-serif">
          {/* Official Mandi Header */}
          <div className="border-b-2 border-gray-900 pb-4 text-center">
            <div className="text-[11px] font-sans uppercase tracking-widest text-gray-600 mb-1">
              Punjab State Agricultural Marketing Board (ਪੰਜਾਬ ਰਾਜ ਖੇਤੀਬਾੜੀ ਮੰਡੀਕਰਨ ਬੋਰਡ)
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">
              FORM 'J' / ਫਾਰਮ 'ਜੇ'
            </h2>
            <div className="text-xs font-sans text-gray-600 mt-0.5">
              [See Rule 24(1) of Punjab Agricultural Produce Markets (General) Rules, 1962]
            </div>
            <div className="text-xs font-sans font-semibold text-emerald-800 mt-1">
              Market Committee: {currentMandi}
            </div>
          </div>

          {/* Meta Info Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 border-b border-gray-300 text-xs font-sans">
            <div>
              <span className="text-gray-500 block">J-Form No:</span>
              <span className="font-bold font-mono text-sm">{transaction.id}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Date of Sale / Auction:</span>
              <span className="font-semibold">{currentDate}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Gate Pass / Token No:</span>
              <span className="font-mono font-semibold">{transaction.procurement_agency.gate_pass_number || 'GP-2026-PB'}</span>
            </div>
          </div>

          {/* Parties Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-gray-300 text-xs font-sans">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-[11px] uppercase tracking-wide font-bold text-gray-500 block mb-1">
                Kisan / Seller Details (ਵੇਚਣ ਵਾਲਾ ਕਿਸਾਨ)
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-gray-900">
                  {transaction.master_record.main_farmer_name}
                </div>
                {transaction.master_record.father_husband_name && (
                  <div className="text-gray-600">
                    S/o, W/o: {transaction.master_record.father_husband_name}
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Village (ਪਿੰਡ):</span> <span className="font-semibold">{transaction.master_record.village}</span>
                </div>
                {transaction.master_record.mobile_number && (
                  <div>
                    <span className="text-gray-500">Mobile:</span> <span className="font-mono">{transaction.master_record.mobile_number}</span>
                  </div>
                )}
                {transaction.master_record.billed_to_name && (
                  <div className="mt-1 pt-1 border-t border-gray-200 text-emerald-800 font-semibold">
                    Billed to: {transaction.master_record.billed_to_name}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-[11px] uppercase tracking-wide font-bold text-gray-500 block mb-1">
                Arhtia / Commission Agent & Agency
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-gray-900">
                  {transaction.procurement_agency.seller_name}
                </div>
                <div className="text-gray-600">
                  Commission Agent License No: <span className="font-mono font-semibold">PB/KHM/2026/048</span>
                </div>
                <div>
                  <span className="text-gray-500">Purchasing Agency:</span>{' '}
                  <span className="font-bold text-emerald-900">{transaction.procurement_agency.purchasing_agency}</span>
                </div>
                <div>
                  <span className="text-gray-500">Lifting Status:</span>{' '}
                  <span className="font-semibold">{transaction.lifting_dispatch.lifting_status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Commodity Table */}
          <div className="py-4">
            <table className="w-full text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-gray-100 border-y-2 border-gray-900 text-left text-gray-800">
                  <th className="py-2 px-2">Crop Description (ਫਸਲ)</th>
                  <th className="py-2 px-2 text-right">Bags (ਗੱਟੇ)</th>
                  <th className="py-2 px-2 text-right">Net Weight (Qtl)</th>
                  <th className="py-2 px-2 text-right">Rate (₹/Qtl)</th>
                  <th className="py-2 px-2 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2.5 px-2 font-medium">
                    {transaction.crop_inward.crop_type}{' '}
                    {transaction.crop_inward.crop_variety && `(${transaction.crop_inward.crop_variety})`}
                    <div className="text-[10px] text-gray-500">
                      Standard Mandi Packing: {transaction.bardana_tracking.bardana_type || 'Gunny Bags'}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-semibold">
                    {transaction.crop_inward.total_bags}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-semibold">
                    {transaction.crop_inward.weight_quintals.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    ₹{transaction.crop_inward.rate_per_quintal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900">
                    ₹{transaction.crop_inward.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions & Accounting Breakdown */}
          <div className="border-t-2 border-gray-900 pt-3 text-xs font-sans">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>Palledari / Labor ({transaction.crop_inward.total_bags} bags @ ₹{transaction.labor_palledari.palledari_rate_per_bag}):</span>
                  <span className="font-mono">₹{transaction.labor_palledari.total_palledari_expense.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Old Balance / Khata (ਪੁਰਾਣਾ ਖਾਤਾ):</span>
                  <span className="font-mono">₹{transaction.financial_ledger.previous_balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Advance Cash Paid (ਪੇਸ਼ਗੀ ਕਟੌਤੀ):</span>
                  <span className="font-mono font-semibold">- ₹{transaction.financial_ledger.advance_paid.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs text-emerald-900 font-semibold mb-1">
                  <span>Final Net Payable to Farmer (ਕਿਸਾਨ ਦਾ ਸ਼ੁੱਧ ਬਣਦਾ):</span>
                </div>
                <div className="text-xl font-black font-mono text-emerald-950 text-right">
                  ₹{transaction.financial_ledger.net_payable_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="mt-8 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs font-sans">
            <div className="text-center pt-8 border-t border-dashed border-gray-400">
              <span className="font-semibold text-gray-700 block">Signature / Thumb Impression of Farmer</span>
              <span className="text-[10px] text-gray-500">(ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ / ਅੰਗੂਠਾ)</span>
            </div>

            <div className="text-center pt-8 border-t border-dashed border-gray-400">
              <span className="font-semibold text-gray-700 block">Authorized Signatory / Arhtia Stamp</span>
              <span className="text-[10px] text-gray-500">M/s {transaction.procurement_agency.seller_name}</span>
            </div>
          </div>

          {/* Verification footer note */}
          <div className="mt-6 text-center text-[10px] text-gray-400 font-sans print:block">
            Generated via KisanMitra ERP • Authenticated for Punjab Grain Markets & Mandi Board Sync
          </div>
        </div>

      </div>
    </div>
  );
};
