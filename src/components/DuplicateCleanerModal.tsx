import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  X, 
  Copy, 
  ShieldAlert, 
  Sparkles,
  Wheat,
  ShoppingBag,
  Users
} from 'lucide-react';
import { CropArrivalEntry, AgencyPurchaseEntry, FarmerMaster } from '../types/mandi';
import { 
  findDuplicateArrivals, 
  findDuplicatePurchases, 
  findDuplicateFarmers 
} from '../lib/duplicates';

interface DuplicateCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cropArrivals: CropArrivalEntry[];
  agencyPurchases: AgencyPurchaseEntry[];
  farmers: FarmerMaster[];
  onDeleteArrivals: (ids: string[]) => void;
  onDeletePurchases: (ids: string[]) => void;
  onDeleteFarmers: (ids: string[]) => void;
}

export const DuplicateCleanerModal: React.FC<DuplicateCleanerModalProps> = ({
  isOpen,
  onClose,
  cropArrivals,
  agencyPurchases,
  farmers,
  onDeleteArrivals,
  onDeletePurchases,
  onDeleteFarmers,
}) => {
  const [activeTab, setActiveTab] = useState<'arrivals' | 'purchases' | 'farmers'>('arrivals');

  // Compute duplicate groups
  const duplicateArrivals = useMemo(() => findDuplicateArrivals(cropArrivals), [cropArrivals]);
  const duplicatePurchases = useMemo(() => findDuplicatePurchases(agencyPurchases), [agencyPurchases]);
  const duplicateFarmers = useMemo(() => findDuplicateFarmers(farmers), [farmers]);

  const totalDuplicateArrivalsCount = duplicateArrivals.reduce((sum, g) => sum + g.duplicates.length, 0);
  const totalDuplicatePurchasesCount = duplicatePurchases.reduce((sum, g) => sum + g.duplicates.length, 0);
  const totalDuplicateFarmersCount = duplicateFarmers.reduce((sum, g) => sum + g.duplicates.length, 0);
  const grandTotalDuplicates = totalDuplicateArrivalsCount + totalDuplicatePurchasesCount + totalDuplicateFarmersCount;

  if (!isOpen) return null;

  // 1-Click Delete All Duplicate Copies for active tab
  const handleDeleteAllActiveDuplicates = () => {
    if (activeTab === 'arrivals') {
      const idsToDelete = duplicateArrivals.flatMap((g) => g.duplicates.map((d) => d.id));
      if (idsToDelete.length === 0) return;
      if (confirm(`ਕੀ ਤੁਸੀਂ ਵਾਕਈ ਸਾਰੀਆਂ ${idsToDelete.length} ਡੁਪਲੀਕੇਟ ਆਵਕ ਕਾਪੀਆਂ ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ? (ਹਰੇਕ ਗਰੁੱਪ ਦਾ ਪਹਿਲਾ ਮੂਲ ਰਿਕਾਰਡ ਸੁਰੱਖਿਅਤ ਰਹੇਗਾ)`)) {
        onDeleteArrivals(idsToDelete);
      }
    } else if (activeTab === 'purchases') {
      const idsToDelete = duplicatePurchases.flatMap((g) => g.duplicates.map((d) => d.id));
      if (idsToDelete.length === 0) return;
      if (confirm(`ਕੀ ਤੁਸੀਂ ਵਾਕਈ ਸਾਰੀਆਂ ${idsToDelete.length} ਡੁਪਲੀਕੇਟ ਖਰੀਦ ਕਾਪੀਆਂ ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ? (ਮੂਲ ਖਰੀਦ ਸੁਰੱਖਿਅਤ ਰਹੇਗੀ)`)) {
        onDeletePurchases(idsToDelete);
      }
    } else if (activeTab === 'farmers') {
      const idsToDelete = duplicateFarmers.flatMap((g) => g.duplicates.map((d) => d.id));
      if (idsToDelete.length === 0) return;
      if (confirm(`ਕੀ ਤੁਸੀਂ ਵਾਕਈ ਸਾਰੀਆਂ ${idsToDelete.length} ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ ਕਾਪੀਆਂ ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
        onDeleteFarmers(idsToDelete);
      }
    }
  };

  // 1-Click Clean Entire Software
  const handleCleanEntireSoftware = () => {
    const arrIds = duplicateArrivals.flatMap((g) => g.duplicates.map((d) => d.id));
    const purIds = duplicatePurchases.flatMap((g) => g.duplicates.map((d) => d.id));
    const farIds = duplicateFarmers.flatMap((g) => g.duplicates.map((d) => d.id));

    const total = arrIds.length + purIds.length + farIds.length;
    if (total === 0) return;

    if (confirm(`ਕੀ ਤੁਸੀਂ ਪੂਰੇ ਸਾਫਟਵੇਅਰ ਵਿੱਚੋਂ ਸਾਰੀਆਂ ਕੁੱਲ ${total} ਡੁਪਲੀਕੇਟ ਐਂਟਰੀਆਂ ਇੱਕ ਕਲਿੱਕ ਵਿੱਚ ਸਾਫ਼ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?\n(ਹਰੇਕ ਡਾਟਾ ਦਾ ਪਹਿਲਾ ਅਸਲੀ ਰਿਕਾਰਡ ਬਿਲਕੁਲ ਸੁਰੱਖਿਅਤ ਰਹੇਗਾ)`)) {
      if (arrIds.length > 0) onDeleteArrivals(arrIds);
      if (purIds.length > 0) onDeletePurchases(purIds);
      if (farIds.length > 0) onDeleteFarmers(farIds);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-gray-300 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-900 via-rose-950 to-amber-950 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-800/80 rounded-2xl text-amber-300 border border-red-700 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>ਡੁਪਲੀਕੇਟ ਡਾਟਾ ਪ੍ਰਬੰਧਕ ਤੇ ਸਫਾਈ (Duplicate Data Cleaner)</span>
                {grandTotalDuplicates > 0 && (
                  <span className="text-xs bg-amber-400 text-red-950 px-2.5 py-0.5 rounded-full font-mono font-black shadow-xs animate-pulse">
                    {grandTotalDuplicates} ਡੁਪਲੀਕੇਟ ਮਿਲੇ
                  </span>
                )}
              </h2>
              <p className="text-xs text-red-200">
                ਮੋਬਾਈਲ ਜਾਂ ਲੈਪਟਾਪ 'ਤੇ ਗਲਤੀ ਨਾਲ ਦੋ ਵਾਰ ਦਰਜ ਹੋਈਆਂ ਐਂਟਰੀਆਂ ਨੂੰ ਲੱਭੋ ਅਤੇ 1 ਕਲਿੱਕ ਵਿੱਚ ਸਾਫ਼ ਕਰੋ।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global 1-Click Clean Banner if duplicates exist anywhere */}
        {grandTotalDuplicates > 0 && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-amber-950 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                ਸਾਫਟਵੇਅਰ ਵਿੱਚ ਕੁੱਲ <strong>{grandTotalDuplicates}</strong> ਡੁਪਲੀਕੇਟ ਐਂਟਰੀਆਂ ਪਾਈਆਂ ਗਈਆਂ ਹਨ (ਆਵਕ: {totalDuplicateArrivalsCount}, ਖਰੀਦ: {totalDuplicatePurchasesCount}, ਕਿਸਾਨ: {totalDuplicateFarmersCount})।
              </span>
            </div>
            <button
              type="button"
              onClick={handleCleanEntireSoftware}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ਪੂਰੇ ਸਾਫਟਵੇਅਰ ਵਿੱਚੋਂ ਸਾਰੇ ਡੁਪਲੀਕੇਟ ਸਾਫ਼ ਕਰੋ ({grandTotalDuplicates})</span>
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-4 pt-3 bg-gray-100 border-b border-gray-200 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('arrivals')}
            className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'arrivals'
                ? 'bg-white text-emerald-950 border-t-2 border-emerald-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <Wheat className="w-4 h-4 text-emerald-700" />
            <span>1. ਫਸਲ ਆਵਕ ਐਂਟਰੀਆਂ (Arrivals)</span>
            {totalDuplicateArrivalsCount > 0 ? (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {totalDuplicateArrivalsCount}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-bold">✓ ਸਾਫ਼</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-white text-blue-950 border-t-2 border-blue-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-blue-700" />
            <span>2. ਸਰਕਾਰੀ ਖਰੀਦ ਐਂਟਰੀਆਂ (Purchases)</span>
            {totalDuplicatePurchasesCount > 0 ? (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {totalDuplicatePurchasesCount}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-bold">✓ ਸਾਫ਼</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('farmers')}
            className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'farmers'
                ? 'bg-white text-indigo-950 border-t-2 border-indigo-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-700" />
            <span>3. ਰਜਿਸਟਰਡ ਕਿਸਾਨ (Farmers)</span>
            {totalDuplicateFarmersCount > 0 ? (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                {totalDuplicateFarmersCount}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-bold">✓ ਸਾਫ਼</span>
            )}
          </button>
        </div>

        {/* Tab Content & Duplicate Groups */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: ARRIVALS */}
          {activeTab === 'arrivals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-gray-700">
                  <span className="font-bold text-gray-950">ਨਿਯਮ:</span> ਇੱਕੋ ਕਿਸਾਨ, ਇੱਕੋ ਮਿਤੀ ਅਤੇ ਇੱਕੋ ਜਿਹੇ ਬੋਰੀਆਂ/ਪਰਚੀ ਵਾਲੀਆਂ ਐਂਟਰੀਆਂ।
                </div>
                {totalDuplicateArrivalsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllActiveDuplicates}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ਸਾਰੀਆਂ ਡੁਪਲੀਕੇਟ ਆਵਕ ਕਾਪੀਆਂ ਹਟਾਓ ({totalDuplicateArrivalsCount})</span>
                  </button>
                )}
              </div>

              {duplicateArrivals.length === 0 ? (
                <div className="p-10 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-emerald-950 text-sm">ਕੋਈ ਡੁਪਲੀਕੇਟ ਆਵਕ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ!</p>
                  <p className="text-xs text-emerald-700">ਤੁਹਾਡਾ ਫਸਲ ਆਵਕ ਰਿਕਾਰਡ ਬਿਲਕੁਲ ਸਾਫ਼ ਅਤੇ ਸਹੀ ਹੈ।</p>
                </div>
              ) : (
                duplicateArrivals.map((group, gIdx) => (
                  <div key={group.groupKey || gIdx} className="border-2 border-amber-300 rounded-2xl overflow-hidden bg-white shadow-xs space-y-2.5 p-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                          {gIdx + 1}
                        </span>
                        <div>
                          <span className="font-black text-gray-950 text-sm">{group.farmerName}</span>
                          <span className="text-xs text-gray-600 font-mono ml-2">
                            ਮਿਤੀ: {group.date ? group.date.split('-').reverse().join('/') : '-'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-950 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                        {group.allEntries.length} ਵਾਰ ਦਰਜ ({group.duplicates.length} ਡੁਪਲੀਕੇਟ)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.allEntries.map((entry, idx) => {
                        const isOriginal = idx === 0;
                        return (
                          <div 
                            key={entry.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              isOriginal
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                                : 'bg-red-50/70 border-red-300 text-red-950'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isOriginal ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    ਮੂਲ ਐਂਟਰੀ (ਸੁਰੱਖਿਅਤ)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-red-700 text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                                    <Copy className="w-3 h-3" />
                                    ਡੁਪਲੀਕੇਟ ਕਾਪੀ
                                  </span>
                                )}
                                <span className="font-mono text-gray-500 text-[11px]">ID: {entry.id}</span>
                                <span className="font-mono font-bold text-gray-900">ਪਰਚੀ: {entry.parchi_no || entry.gate_pass_no || '-'}</span>
                              </div>
                              <div className="text-gray-700 flex items-center gap-3 flex-wrap">
                                <span>ਪਿੰਡ: <strong>{entry.village || 'N/A'}</strong></span>
                                <span>ਗੱਟੇ: <strong>{entry.total_bags_arrived} Bags</strong> ({entry.new_jute_bags || 0}N + {entry.old_jute_bags || 0}O)</span>
                                <span>ਵਜ਼ਨ: <strong>{entry.weight_quintals} Qtl</strong></span>
                                <span>ਟਰਾਲੀ: <strong>{entry.vehicle_trolley_no || '-'}</strong></span>
                              </div>
                            </div>

                            {!isOriginal && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`ਕੀ ਤੁਸੀਂ ਇਹ ਡੁਪਲੀਕੇਟ ਐਂਟਰੀ (${entry.id}) ਹਟਾਉਣੀ ਚਾਹੁੰਦੇ ਹੋ?`)) {
                                    onDeleteArrivals([entry.id]);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ਹਟਾਓ (Delete)</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: PURCHASES */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-gray-700">
                  <span className="font-bold text-gray-950">ਨਿਯਮ:</span> ਇੱਕੋ ਕਿਸਾਨ, ਇੱਕੋ ਮਿਤੀ, ਇੱਕੋ ਜਿਹੀਆਂ ਬੋਰੀਆਂ ਅਤੇ ਏਜੰਸੀ ਵਾਲੀਆਂ ਐਂਟਰੀਆਂ।
                </div>
                {totalDuplicatePurchasesCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllActiveDuplicates}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ਸਾਰੀਆਂ ਡੁਪਲੀਕੇਟ ਖਰੀਦ ਕਾਪੀਆਂ ਹਟਾਓ ({totalDuplicatePurchasesCount})</span>
                  </button>
                )}
              </div>

              {duplicatePurchases.length === 0 ? (
                <div className="p-10 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-emerald-950 text-sm">ਕੋਈ ਡੁਪਲੀਕੇਟ ਖਰੀਦ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ!</p>
                  <p className="text-xs text-emerald-700">ਸਰਕਾਰੀ ਖਰੀਦ ਤੇ ਜੇ-ਫਾਰਮ ਰਿਕਾਰਡ ਬਿਲਕੁਲ ਸਹੀ ਹੈ।</p>
                </div>
              ) : (
                duplicatePurchases.map((group, gIdx) => (
                  <div key={group.groupKey || gIdx} className="border-2 border-amber-300 rounded-2xl overflow-hidden bg-white shadow-xs space-y-2.5 p-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                          {gIdx + 1}
                        </span>
                        <div>
                          <span className="font-black text-gray-950 text-sm">{group.farmerName}</span>
                          <span className="text-xs text-gray-600 font-mono ml-2">
                            ਮਿਤੀ: {group.date ? group.date.split('-').reverse().join('/') : '-'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-950 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                        {group.allEntries.length} ਵਾਰ ਦਰਜ ({group.duplicates.length} ਡੁਪਲੀਕੇਟ)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.allEntries.map((entry, idx) => {
                        const isOriginal = idx === 0;
                        return (
                          <div 
                            key={entry.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              isOriginal
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                                : 'bg-red-50/70 border-red-300 text-red-950'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isOriginal ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    ਮੂਲ ਖਰੀਦ (ਸੁਰੱਖਿਅਤ)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-red-700 text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                                    <Copy className="w-3 h-3" />
                                    ਡੁਪਲੀਕੇਟ ਕਾਪੀ
                                  </span>
                                )}
                                <span className="font-mono text-gray-500 text-[11px]">ID: {entry.id}</span>
                                <span className="font-bold text-indigo-900">{entry.purchasing_agency}</span>
                              </div>
                              <div className="text-gray-700 flex items-center gap-3 flex-wrap">
                                <span>ਬਿਲਡ ਨਾਮ: <strong>{entry.billed_to_name}</strong></span>
                                <span>ਗੱਟੇ: <strong>{entry.total_bags} Bags</strong></span>
                                <span>ਵਜ਼ਨ: <strong>{entry.weight_quintals} Qtl</strong></span>
                                <span className="font-mono font-bold text-emerald-900">ਰਕਮ: ₹{entry.total_amount}</span>
                              </div>
                            </div>

                            {!isOriginal && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`ਕੀ ਤੁਸੀਂ ਇਹ ਡੁਪਲੀਕੇਟ ਖਰੀਦ (${entry.id}) ਹਟਾਉਣੀ ਚਾਹੁੰਦੇ ਹੋ?`)) {
                                    onDeletePurchases([entry.id]);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ਹਟਾਓ (Delete)</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: FARMERS */}
          {activeTab === 'farmers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-gray-700">
                  <span className="font-bold text-gray-950">ਨਿਯਮ:</span> ਇੱਕੋ ਨਾਮ ਅਤੇ ਮੋਬਾਈਲ/ਪਿੰਡ ਵਾਲੇ ਦੋਹਰੇ ਰਜਿਸਟਰ ਹੋਏ ਕਿਸਾਨ।
                </div>
                {totalDuplicateFarmersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllActiveDuplicates}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ਸਾਰੇ ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ ਖਾਤੇ ਹਟਾਓ ({totalDuplicateFarmersCount})</span>
                  </button>
                )}
              </div>

              {duplicateFarmers.length === 0 ? (
                <div className="p-10 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-emerald-950 text-sm">ਕੋਈ ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ ਖਾਤਾ ਨਹੀਂ ਮਿਲਿਆ!</p>
                  <p className="text-xs text-emerald-700">ਸਾਰੇ ਕਿਸਾਨ ਖਾਤੇ ਵਿਲੱਖਣ ਅਤੇ ਸਹੀ ਹਨ।</p>
                </div>
              ) : (
                duplicateFarmers.map((group, gIdx) => (
                  <div key={group.groupKey || gIdx} className="border-2 border-amber-300 rounded-2xl overflow-hidden bg-white shadow-xs space-y-2.5 p-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {gIdx + 1}
                        </span>
                        <div>
                          <span className="font-black text-gray-950 text-sm">{group.farmerName}</span>
                          <span className="text-xs text-gray-600 ml-2">{group.details}</span>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-950 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                        {group.allEntries.length} ਵਾਰ ਰਜਿਸਟਰ
                      </span>
                    </div>

                    <div className="space-y-2">
                      {group.allEntries.map((farmer, idx) => {
                        const isOriginal = idx === 0;
                        return (
                          <div 
                            key={farmer.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              isOriginal
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                                : 'bg-red-50/70 border-red-300 text-red-950'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isOriginal ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    ਮੂਲ ਖਾਤਾ (ਸੁਰੱਖਿਅਤ)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-red-700 text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                                    <Copy className="w-3 h-3" />
                                    ਡੁਪਲੀਕੇਟ ਖਾਤਾ
                                  </span>
                                )}
                                <span className="font-mono text-gray-500 text-[11px]">ID: {farmer.id}</span>
                              </div>
                              <div className="text-gray-700 flex items-center gap-3 flex-wrap">
                                <span>ਪਿਤਾ: <strong>{farmer.father_husband_name_en || '-'}</strong></span>
                                <span>ਪਿੰਡ: <strong>{farmer.village_en || '-'}</strong></span>
                                <span>ਮੋਬਾਈਲ: <strong>{farmer.mobile_number || '-'}</strong></span>
                                <span>ਲਿੰਕਡ ਮੈਂਬਰ: <strong>{farmer.linked_farmers?.length || 0}</strong></span>
                              </div>
                            </div>

                            {!isOriginal && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`ਕੀ ਤੁਸੀਂ ਇਹ ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ ਖਾਤਾ (${farmer.id}) ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
                                    onDeleteFarmers([farmer.id]);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ਹਟਾਓ (Delete)</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-gray-500 italic">
            * ਡੁਪਲੀਕੇਟ ਹਟਾਉਣ ਸਮੇਂ ਹਮੇਸ਼ਾ ਪਹਿਲਾ ਅਸਲੀ ਰਿਕਾਰਡ ਬਚਾਇਆ ਜਾਂਦਾ ਹੈ ਅਤੇ ਸਿਰਫ਼ ਵਾਧੂ ਕਾਪੀਆਂ ਹਟਾਈਆਂ ਜਾਂਦੀਆਂ ਹਨ।
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
