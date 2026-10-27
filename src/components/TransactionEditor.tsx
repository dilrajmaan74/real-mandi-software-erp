import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Wheat, 
  Package, 
  Building2, 
  Truck, 
  Users, 
  Wallet, 
  FileSpreadsheet, 
  Printer, 
  Code, 
  Save, 
  CheckCircle,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { MandiTransaction, FarmerMaster, LinkedFarmer } from '../types/mandi';

interface TransactionEditorProps {
  transaction: MandiTransaction;
  onChange: (updated: MandiTransaction) => void;
  onSyncSheets: () => void;
  onOpenJForm: () => void;
  onOpenJson: () => void;
  onSaveLocal: () => void;
  isSyncing: boolean;
  hasGoogleToken: boolean;
  registeredFarmers?: FarmerMaster[];
}

export const TransactionEditor: React.FC<TransactionEditorProps> = ({
  transaction,
  onChange,
  onSyncSheets,
  onOpenJForm,
  onOpenJson,
  onSaveLocal,
  isSyncing,
  hasGoogleToken,
  registeredFarmers = [],
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'crop' | 'bardana' | 'lifting' | 'finance'>('all');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');

  // Real-time recalculator whenever numbers change
  const handleNumericChange = (
    section: 'crop_inward' | 'bardana_tracking' | 'lifting_dispatch' | 'labor_palledari' | 'financial_ledger',
    field: string,
    value: number
  ) => {
    const updated = { ...transaction };
    (updated[section] as any)[field] = value;

    // Recalculate Crop total
    if (section === 'crop_inward') {
      const w = updated.crop_inward.weight_quintals || 0;
      const r = updated.crop_inward.rate_per_quintal || 0;
      updated.crop_inward.total_amount = Number((w * r).toFixed(2));

      // Also adjust pending lifting
      const totalBags = updated.crop_inward.total_bags || 0;
      const lifted = updated.lifting_dispatch.lifted_bags || 0;
      updated.lifting_dispatch.pending_lifting_bags = Math.max(0, totalBags - lifted);
      updated.lifting_dispatch.lifting_status =
        updated.lifting_dispatch.pending_lifting_bags === 0 && totalBags > 0
          ? 'Fully Lifted'
          : lifted > 0
          ? 'Partially Lifted'
          : 'Pending';

      // Also adjust palledari
      const pRate = updated.labor_palledari.palledari_rate_per_bag || 14;
      updated.labor_palledari.total_palledari_expense = Number((totalBags * pRate).toFixed(2));
    }

    // Recalculate Bardana
    if (section === 'bardana_tracking') {
      const recv = updated.bardana_tracking.bardana_received_from_agency || 0;
      const issued = updated.bardana_tracking.bardana_issued_to_farmer || 0;
      updated.bardana_tracking.bardana_balance = recv - issued;
    }

    // Recalculate Lifting
    if (section === 'lifting_dispatch') {
      const totalBags = updated.crop_inward.total_bags || 0;
      const lifted = updated.lifting_dispatch.lifted_bags || 0;
      updated.lifting_dispatch.pending_lifting_bags = Math.max(0, totalBags - lifted);
      updated.lifting_dispatch.lifting_status =
        updated.lifting_dispatch.pending_lifting_bags === 0 && totalBags > 0
          ? 'Fully Lifted'
          : lifted > 0
          ? 'Partially Lifted'
          : 'Pending';
    }

    // Recalculate Labor
    if (section === 'labor_palledari') {
      const totalBags = updated.crop_inward.total_bags || 0;
      const pRate = updated.labor_palledari.palledari_rate_per_bag || 0;
      updated.labor_palledari.total_palledari_expense = Number((totalBags * pRate).toFixed(2));
    }

    // Recalculate Net Payable
    const cropTotal = updated.crop_inward.total_amount || 0;
    const oldBal = updated.financial_ledger.previous_balance || 0;
    const adv = updated.financial_ledger.advance_paid || 0;
    updated.financial_ledger.net_payable_balance = Number((cropTotal + oldBal - adv).toFixed(2));

    onChange(updated);
  };

  const handleTextChange = (
    section: 'master_record' | 'crop_inward' | 'bardana_tracking' | 'procurement_agency' | 'lifting_dispatch' | 'financial_ledger',
    field: string,
    value: string
  ) => {
    const updated = { ...transaction };
    (updated[section] as any)[field] = value;
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden">
      {/* Action Header */}
      <div className="bg-emerald-50/70 border-b border-emerald-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-700 text-white font-mono text-xs font-bold">
              {transaction.id}
            </span>
            <h3 className="text-base font-bold text-gray-900">
              Verified Mandi Record & Accounting Ledger
            </h3>
            {transaction.synced_to_sheets && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> Synced to Sheets
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            ਸਾਰੇ ਖੇਤਰਾਂ ਦੀ ਸਮੀਖਿਆ ਕਰੋ ਅਤੇ ਲੋੜ ਅਨੁਸਾਰ ਸੋਧ ਕਰੋ (All calculated values update in real-time)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Inspect clean JSON format for automated Google Sheets feeds"
          >
            <Code className="w-3.5 h-3.5 text-gray-500" />
            <span>Raw JSON</span>
          </button>

          <button
            type="button"
            onClick={onOpenJForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Preview Printable Punjab Mandi Board J-Form"
          >
            <Printer className="w-3.5 h-3.5 text-amber-700" />
            <span>ਜੇ-ਫਾਰਮ (J-Form)</span>
          </button>

          <button
            type="button"
            onClick={onSaveLocal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Save to local browser ledger"
          >
            <Save className="w-3.5 h-3.5 text-emerald-600" />
            <span>Save Entry</span>
          </button>

          <button
            type="button"
            onClick={onSyncSheets}
            disabled={isSyncing}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
              hasGoogleToken
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            title="Sync this Mandi entry across all 4 Google Sheets tabs"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Writing to Sheets...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Sync to Google Sheets</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Punjabi Spoken Summary Alert */}
      {transaction.summary_punjabi && (
        <div className="bg-amber-50/70 border-b border-amber-100 px-6 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <span className="font-bold text-amber-800 flex-shrink-0">ਮੰਡੀ ਰਸੀਦ ਸੰਖੇਪ (Summary):</span>
          <p className="leading-relaxed font-sans">{transaction.summary_punjabi}</p>
        </div>
      )}

      {/* Operational Field Cards Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Farmer Identification */}
        <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <UserIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">1. Farmer Identification</h4>
                <p className="text-[11px] text-gray-500">ਕਿਸਾਨ ਪਹਿਚਾਣ ਤੇ ਤੋਲੇ ਦਾ ਬਿੱਲ</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
              Master Record
            </span>
          </div>

          {/* Quick Select from Farmer Master Register */}
          {registeredFarmers.length > 0 && (
            <div className="mb-3 p-2.5 bg-emerald-100/70 rounded-lg border border-emerald-300/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                Select from Farmer Register (ਰਜਿਸਟਰਡ ਕਿਸਾਨ ਚੁਣੋ):
              </span>
              <select
                value={selectedFarmerId}
                onChange={(e) => {
                  const fid = e.target.value;
                  setSelectedFarmerId(fid);
                  const found = registeredFarmers.find((rf) => rf.id === fid);
                  if (found) {
                    const updated = { ...transaction };
                    updated.master_record.farmer_id = found.id;
                    updated.master_record.main_farmer_name = found.name_en;
                    updated.master_record.main_farmer_name_pa = found.name_pa;
                    updated.master_record.father_husband_name = found.father_husband_name_en;
                    updated.master_record.father_husband_name_pa = found.father_husband_name_pa;
                    updated.master_record.village = found.village_en;
                    updated.master_record.village_pa = found.village_pa;
                    updated.master_record.mobile_number = found.mobile_number;
                    updated.master_record.aadhaar_number = found.aadhaar_number;
                    updated.master_record.billed_to_name = found.name_en;
                    onChange(updated);
                  }
                }}
                className="bg-white border border-emerald-400 rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-950 focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Registered Farmer --</option>
                {registeredFarmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name_en} ({f.name_pa}) - Pind {f.village_en} [{f.linked_farmers?.length || 0} Linked]
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">
                Main Farmer Name (ਕਿਸਾਨ ਦਾ ਨਾਮ) *
              </label>
              <input
                type="text"
                value={transaction.master_record.main_farmer_name}
                onChange={(e) => handleTextChange('master_record', 'main_farmer_name', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-semibold focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">
                Father / Husband Name (ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ)
              </label>
              <input
                type="text"
                value={transaction.master_record.father_husband_name}
                onChange={(e) => handleTextChange('master_record', 'father_husband_name', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">
                Village (ਪਿੰਡ) *
              </label>
              <input
                type="text"
                value={transaction.master_record.village}
                onChange={(e) => handleTextChange('master_record', 'village', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-medium focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">
                Mobile Number (ਮੋਬਾਈਲ)
              </label>
              <input
                type="text"
                value={transaction.master_record.mobile_number}
                onChange={(e) => handleTextChange('master_record', 'mobile_number', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none font-mono"
              />
            </div>

            {/* Multi Linked Farmers Selector for Tola / J-Form Entry */}
            {(() => {
              const currentFarmer = registeredFarmers.find(
                (f) =>
                  f.id === transaction.master_record.farmer_id ||
                  f.name_en.toLowerCase() === transaction.master_record.main_farmer_name.toLowerCase()
              );
              const linkedList = currentFarmer?.linked_farmers || [];

              return (
                <div className="sm:col-span-2 bg-amber-50/70 border border-amber-200/90 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-amber-950 font-bold">
                      Billed To Name (ਤੋਲੇ ਦਾ ਬਿੱਲ / ਜੇ-ਫਾਰਮ ਕਿਸਦੇ ਨਾਮ ਕੱਟਣਾ ਹੈ): *
                    </label>
                    {linkedList.length > 0 && (
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-semibold">
                        {linkedList.length} Linked Members Available
                      </span>
                    )}
                  </div>

                  {/* Quick Select Buttons for Linked Farmers */}
                  {linkedList.length > 0 && currentFarmer && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTextChange('master_record', 'billed_to_name', currentFarmer.name_en)}
                        className={`px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          transaction.master_record.billed_to_name === currentFarmer.name_en
                            ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-300'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        Self: {currentFarmer.name_en} ({currentFarmer.name_pa})
                      </button>

                      {linkedList.map((lf) => {
                        const isChosen = transaction.master_record.billed_to_name === lf.name_en;
                        return (
                          <button
                            key={lf.id}
                            type="button"
                            onClick={() => handleTextChange('master_record', 'billed_to_name', lf.name_en)}
                            className={`px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300'
                                : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/60'
                            }`}
                          >
                            {lf.name_en} ({lf.relation})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <input
                    type="text"
                    value={transaction.master_record.billed_to_name}
                    onChange={(e) => handleTextChange('master_record', 'billed_to_name', e.target.value)}
                    placeholder="Enter family member / joint partner name"
                    className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-bold focus:border-amber-600 focus:outline-none"
                  />
                </div>
              );
            })()}
          </div>
        </div>

        {/* Card 2: Crop & Inward Details */}
        <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Wheat className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">2. Crop & Inward Details</h4>
                <p className="text-[11px] text-gray-500">ਆਵਕ ਤੇ ਬੋਲੀ ਦਾ ਹਿਸਾਬ</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
              Crop Inward
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">Crop (ਫਸਲ)</label>
              <input
                type="text"
                value={transaction.crop_inward.crop_type}
                onChange={(e) => handleTextChange('crop_inward', 'crop_type', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-semibold focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Variety (ਕਿਸਮ)</label>
              <input
                type="text"
                value={transaction.crop_inward.crop_variety}
                onChange={(e) => handleTextChange('crop_inward', 'crop_variety', e.target.value)}
                placeholder="PR-126, 1121..."
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Total Bags (ਬੋਰੀਆਂ/ਗੱਟੇ)</label>
              <input
                type="number"
                value={transaction.crop_inward.total_bags}
                onChange={(e) => handleNumericChange('crop_inward', 'total_bags', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-bold focus:border-emerald-600 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Weight (Quintals / ਕੁਇੰਟਲ)</label>
              <input
                type="number"
                step="0.01"
                value={transaction.crop_inward.weight_quintals}
                onChange={(e) => handleNumericChange('crop_inward', 'weight_quintals', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-bold focus:border-emerald-600 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Rate (₹ / Quintal)</label>
              <input
                type="number"
                step="0.01"
                value={transaction.crop_inward.rate_per_quintal}
                onChange={(e) => handleNumericChange('crop_inward', 'rate_per_quintal', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-bold focus:border-emerald-600 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1 flex items-center justify-between">
                <span>Total Amount (ਕੁੱਲ ਰਕਮ)</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1 rounded">Auto</span>
              </label>
              <div className="w-full bg-emerald-100/60 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-emerald-950 font-bold font-mono">
                ₹{transaction.crop_inward.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Bardana Management */}
        <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">3. Bardana Management</h4>
                <p className="text-[11px] text-gray-500">ਬਾਰਦਾਨਾ ਤੇ ਗੱਟਿਆਂ ਦਾ ਸਟਾਕ</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-orange-800 bg-orange-100/70 px-2 py-0.5 rounded">
              Gunny Bags
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">
                Recv from Agency (ਮਿਲਿਆ)
              </label>
              <input
                type="number"
                value={transaction.bardana_tracking.bardana_received_from_agency}
                onChange={(e) => handleNumericChange('bardana_tracking', 'bardana_received_from_agency', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">
                Issued to Farmer (ਦਿੱਤਾ)
              </label>
              <input
                type="number"
                value={transaction.bardana_tracking.bardana_issued_to_farmer}
                onChange={(e) => handleNumericChange('bardana_tracking', 'bardana_issued_to_farmer', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1 flex items-center justify-between">
                <span>Bardana Balance (ਬਕਾਇਆ)</span>
                <span className="text-[10px] text-orange-700 bg-orange-100 px-1 rounded">Stock</span>
              </label>
              <div className={`w-full rounded-lg px-2.5 py-1.5 font-bold font-mono border ${
                transaction.bardana_tracking.bardana_balance < 0 
                  ? 'bg-rose-100 text-rose-900 border-rose-300' 
                  : 'bg-orange-100/60 text-orange-950 border-orange-300'
              }`}>
                {transaction.bardana_tracking.bardana_balance} Bags
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-gray-600 font-medium mb-1">Bardana Bag Type</label>
              <input
                type="text"
                value={transaction.bardana_tracking.bardana_type}
                onChange={(e) => handleTextChange('bardana_tracking', 'bardana_type', e.target.value)}
                placeholder="Jute Gunny (ਸਣ/ਪੁਰਾਣਾ), HDPE Plastic, New Markfed/Pungrain"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Procurement & Agency Details */}
        <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">4. Procurement & Agency</h4>
                <p className="text-[11px] text-gray-500">ਸਰਕਾਰੀ/ਪ੍ਰਾਈਵੇਟ ਖਰੀਦ ਏਜੰਸੀ</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded">
              Procurement
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">Purchasing Agency (ਖਰੀਦਦਾਰ ਏਜੰਸੀ)</label>
              <input
                type="text"
                value={transaction.procurement_agency.purchasing_agency}
                onChange={(e) => handleTextChange('procurement_agency', 'purchasing_agency', e.target.value)}
                placeholder="Pungrain, Markfed, Punsup, FCI, Miller..."
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-semibold focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Seller / Arhtia Name (ਆੜ੍ਹਤੀਆ)</label>
              <input
                type="text"
                value={transaction.procurement_agency.seller_name}
                onChange={(e) => handleTextChange('procurement_agency', 'seller_name', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Auction Date (ਬੋਲੀ ਮਿਤੀ)</label>
              <input
                type="date"
                value={transaction.procurement_agency.auction_date}
                onChange={(e) => handleTextChange('procurement_agency', 'auction_date', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">ਪਰਚੀ ਨੰਬਰ (Parchi No / Token)</label>
              <input
                type="text"
                value={transaction.procurement_agency.gate_pass_number}
                onChange={(e) => handleTextChange('procurement_agency', 'gate_pass_number', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Card 5: Lifting & Dispatch Report */}
        <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">5. Lifting & Dispatch</h4>
                <p className="text-[11px] text-gray-500">ਮੰਡੀ ਲਿਫਟਿੰਗ ਤੇ ਚਲਾਨ ਰਿਪੋਰਟ</p>
              </div>
            </div>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
              transaction.lifting_dispatch.lifting_status === 'Fully Lifted'
                ? 'bg-emerald-100 text-emerald-800'
                : transaction.lifting_dispatch.lifting_status === 'Partially Lifted'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {transaction.lifting_dispatch.lifting_status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">Lifted Bags (ਚੁੱਕੇ ਗੱਟੇ)</label>
              <input
                type="number"
                value={transaction.lifting_dispatch.lifted_bags}
                onChange={(e) => handleNumericChange('lifting_dispatch', 'lifted_bags', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono font-bold focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1 flex items-center justify-between">
                <span>Pending in Yard</span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-1 rounded">Yard</span>
              </label>
              <div className="w-full bg-purple-100/60 border border-purple-300 rounded-lg px-2.5 py-1.5 text-purple-950 font-bold font-mono">
                {transaction.lifting_dispatch.pending_lifting_bags} Bags
              </div>
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Truck / Vehicle No.</label>
              <input
                type="text"
                value={transaction.lifting_dispatch.transporter_truck_no}
                onChange={(e) => handleTextChange('lifting_dispatch', 'transporter_truck_no', e.target.value)}
                placeholder="PB-10-XX-XXXX"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 focus:border-emerald-600 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Card 6: Labor & Palledari Calculation */}
        <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">6. Labor & Palledari</h4>
                <p className="text-[11px] text-gray-500">ਮਜ਼ਦੂਰੀ, ਤੁਲਾਈ ਤੇ ਸਿਲਾਈ ਖਰਚਾ</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
              Palledari
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">Laborers Engaged</label>
              <input
                type="number"
                value={transaction.labor_palledari.total_laborers_engaged}
                onChange={(e) => handleNumericChange('labor_palledari', 'total_laborers_engaged', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1">Rate / Bag (₹)</label>
              <input
                type="number"
                step="0.5"
                value={transaction.labor_palledari.palledari_rate_per_bag}
                onChange={(e) => handleNumericChange('labor_palledari', 'palledari_rate_per_bag', parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 font-mono focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-600 font-medium mb-1 flex items-center justify-between">
                <span>Total Palledari</span>
                <span className="text-[10px] text-teal-700 bg-teal-100 px-1 rounded">Auto</span>
              </label>
              <div className="w-full bg-teal-100/60 border border-teal-300 rounded-lg px-2.5 py-1.5 text-teal-950 font-bold font-mono">
                ₹{transaction.labor_palledari.total_palledari_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Card 7: Ledger Balance & Financial Accounting */}
        <div className="bg-emerald-950 text-white rounded-xl border border-emerald-800 p-4 lg:col-span-2 shadow-inner">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">7. Financial Ledger & Settlement</h4>
                <p className="text-[11px] text-emerald-200">ਕਿਸਾਨ ਖਾਤਾ ਬਕਾਇਆ ਤੇ ਨੈੱਟ ਅਦਾਇਗੀ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-800/80 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-bold">
                Accounting Rule: (Crop Total + Old Khata - Advance)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-emerald-200 font-medium mb-1">
                Crop Gross Sale (ਕੁੱਲ ਵਿਕਰੀ)
              </label>
              <div className="w-full bg-emerald-900/90 border border-emerald-700 rounded-lg px-3 py-2 text-white font-bold font-mono text-sm">
                ₹{transaction.crop_inward.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="block text-emerald-200 font-medium mb-1">
                Old Balance / Khata (ਪੁਰਾਣਾ ਬਕਾਇਆ)
              </label>
              <input
                type="number"
                step="1"
                value={transaction.financial_ledger.previous_balance}
                onChange={(e) => handleNumericChange('financial_ledger', 'previous_balance', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-emerald-900/90 border border-emerald-700 rounded-lg px-3 py-2 text-amber-300 font-bold font-mono text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-emerald-200 font-medium mb-1">
                Advance Paid (ਪੇਸ਼ਗੀ ਨਕਦ/ਬੈਂਕ)
              </label>
              <input
                type="number"
                step="1"
                value={transaction.financial_ledger.advance_paid}
                onChange={(e) => handleNumericChange('financial_ledger', 'advance_paid', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-emerald-900/90 border border-emerald-700 rounded-lg px-3 py-2 text-rose-300 font-bold font-mono text-sm focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-amber-300 font-bold mb-1 flex items-center justify-between">
                <span>Net Payable (ਕੁੱਲ ਬਣਦਾ ਲੈਣ-ਦੇਣ)</span>
                <span className="text-[10px] bg-amber-400 text-emerald-950 px-1 rounded font-bold">FINAL</span>
              </label>
              <div className="w-full bg-gradient-to-r from-amber-500 to-amber-400 border border-amber-300 rounded-lg px-3 py-2 text-emerald-950 font-black font-mono text-base shadow-md">
                ₹{transaction.financial_ledger.net_payable_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
