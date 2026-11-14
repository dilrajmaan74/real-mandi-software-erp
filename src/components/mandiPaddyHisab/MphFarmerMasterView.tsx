import React, { useMemo, useState } from 'react';
import {
  MphAdvance,
  MphArrival,
  MphFarmer,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../../types/mandiPaddyHisab';
import {
  computeFarmerAccountSummary,
  findDuplicateMphFarmer,
  formatINR,
  safeStr,
} from '../../lib/mandiPaddyHisabUtils';
import { useMphLang } from '../../lib/mandiPaddyHisabI18n';
import { BookOpen, Edit3, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';

interface MphFarmerMasterViewProps {
  farmers: MphFarmer[];
  arrivals: MphArrival[];
  jForms: MphJForm[];
  otherEntries: MphOtherEntry[];
  advances: MphAdvance[];
  settings: MphSettings;
  onSaveFarmer: (farmer: MphFarmer) => void;
  onDeleteFarmer: (farmer: MphFarmer) => void;
  onOpenLedger: (farmerId: string) => void;
}

export const MphFarmerMasterView: React.FC<MphFarmerMasterViewProps> = ({
  farmers,
  arrivals,
  jForms,
  otherEntries,
  advances,
  settings,
  onSaveFarmer,
  onDeleteFarmer,
  onOpenLedger,
}) => {
  const { tr } = useMphLang();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [village, setVillage] = useState('');
  const [mobile, setMobile] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setFatherName('');
    setVillage('');
    setMobile('');
    setErrorMsg(null);
  };

  const handleEditClick = (f: MphFarmer) => {
    setEditingId(f.id);
    setName(f.name);
    setFatherName(f.fatherName);
    setVillage(f.village);
    setMobile(f.mobile);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanFather = fatherName.trim();
    const cleanVillage = village.trim();
    const cleanMobile = mobile.replace(/\s+/g, '').trim();

    if (!cleanName) {
      setErrorMsg(tr('Please enter Farmer Name.', 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ।'));
      return;
    }
    if (!cleanVillage) {
      setErrorMsg(tr('Please enter Village.', 'ਕਿਰਪਾ ਕਰਕੇ ਪਿੰਡ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ।'));
      return;
    }
    if (cleanMobile && !/^\d{10}$/.test(cleanMobile.replace(/\D/g, ''))) {
      setErrorMsg(
        tr('Mobile number must be 10 digits.', 'ਮੋਬਾਈਲ ਨੰਬਰ 10 ਅੰਕਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।')
      );
      return;
    }

    const dup = findDuplicateMphFarmer(
      { name: cleanName, fatherName: cleanFather, village: cleanVillage, mobile: cleanMobile },
      farmers,
      editingId || undefined
    );
    if (dup) {
      setErrorMsg(
        tr(
          `Duplicate farmer found: "${dup.name}" (${dup.village}) is already registered.`,
          `ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ ਮਿਲਿਆ: "${dup.name}" (${dup.village}) ਪਹਿਲਾਂ ਹੀ ਦਰਜ ਹੈ।`
        )
      );
      return;
    }

    const now = new Date().toISOString();
    const existing = editingId ? farmers.find((f) => f.id === editingId) : null;

    const record: MphFarmer = {
      id: existing ? existing.id : `MPHF_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      fatherName: cleanFather,
      village: cleanVillage,
      mobile: cleanMobile.replace(/\D/g, ''),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    onSaveFarmer(record);
    resetForm();
  };

  const filteredFarmers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...farmers]
      .sort((a, b) => safeStr(a.name).localeCompare(safeStr(b.name)))
      .filter((f) => {
        if (!q) return true;
        return (
          safeStr(f.name).toLowerCase().includes(q) ||
          safeStr(f.fatherName).toLowerCase().includes(q) ||
          safeStr(f.village).toLowerCase().includes(q) ||
          safeStr(f.mobile).includes(q)
        );
      });
  }, [farmers, search]);

  const summaryMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeFarmerAccountSummary>>();
    for (const f of farmers) {
      map.set(
        f.id,
        computeFarmerAccountSummary(f, arrivals, jForms, otherEntries, settings, advances)
      );
    }
    return map;
  }, [farmers, arrivals, jForms, otherEntries, settings, advances]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Form: Add / Edit Farmer */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? tr('Edit Farmer', 'ਕਿਸਾਨ ਸੋਧੋ') : tr('Add New Farmer', 'ਨਵਾਂ ਕਿਸਾਨ ਜੋੜੋ')}
            </h3>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{tr('Cancel', 'ਰੱਦ ਕਰੋ')}</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Farmer Name *', 'ਕਿਸਾਨ ਦਾ ਨਾਮ *')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr('e.g. Gurpreet Singh', 'ਜਿਵੇਂ: ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ')}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Father Name', 'ਪਿਤਾ ਦਾ ਨਾਮ')}
            </label>
            <input
              type="text"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder={tr('e.g. Harbans Singh', 'ਜਿਵੇਂ: ਹਰਬੰਸ ਸਿੰਘ')}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Village *', 'ਪਿੰਡ *')}
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={tr('e.g. Bhadaur', 'ਜਿਵੇਂ: ਭਦੌੜ')}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tr('Mobile Number', 'ਮੋਬਾਈਲ ਨੰਬਰ')}
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder={tr('10-digit mobile number', '10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ')}
              maxLength={15}
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{editingId ? tr('Update Farmer', 'ਕਿਸਾਨ ਅੱਪਡੇਟ ਕਰੋ') : tr('Save Farmer', 'ਕਿਸਾਨ ਸੇਵ ਕਰੋ')}</span>
          </button>
        </form>
      </div>

      {/* Right Table: Farmer Master Directory */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {tr('Farmer Master List', 'ਕਿਸਾਨ ਸੂਚੀ')} ({filteredFarmers.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              {tr(
                'Separate farmer database exclusively for Mandi Paddy Hisab',
                'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ ਲਈ ਵੱਖਰਾ ਕਿਸਾਨ ਰਿਕਾਰਡ'
              )}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr('Search name, village, mobile...', 'ਨਾਮ, ਪਿੰਡ ਜਾਂ ਮੋਬਾਈਲ ਖੋਜੋ...')}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {filteredFarmers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {farmers.length === 0
              ? tr(
                  'No farmers registered yet. Use the form on the left to add a farmer.',
                  'ਅਜੇ ਕੋਈ ਕਿਸਾਨ ਦਰਜ ਨਹੀਂ ਹੈ। ਖੱਬੇ ਪਾਸੇ ਫਾਰਮ ਤੋਂ ਕਿਸਾਨ ਜੋੜੋ।'
                )
              : tr('No matching farmers found for your search.', 'ਤੁਹਾਡੀ ਖੋਜ ਮੁਤਾਬਕ ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ।')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">{tr('Farmer Name', 'ਕਿਸਾਨ ਦਾ ਨਾਮ')}</th>
                  <th className="py-2.5 px-3 font-semibold">{tr('Father Name', 'ਪਿਤਾ ਦਾ ਨਾਮ')}</th>
                  <th className="py-2.5 px-3 font-semibold">{tr('Village', 'ਪਿੰਡ')}</th>
                  <th className="py-2.5 px-3 font-semibold">{tr('Mobile', 'ਮੋਬਾਈਲ')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tr('Net Balance', 'ਕੁੱਲ ਬਕਾਇਆ')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tr('Actions', 'ਕਾਰਵਾਈ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFarmers.map((f, idx) => {
                  const summary = summaryMap.get(f.id);
                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{f.name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{f.fatherName || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-700">{f.village}</td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-700">
                        {f.mobile || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {summary ? (
                          <div>
                            <span
                              className={`font-bold ${
                                summary.combinedBalanceStatus === 'payable'
                                  ? 'text-emerald-700'
                                  : summary.combinedBalanceStatus === 'receivable'
                                  ? 'text-rose-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {formatINR(Math.abs(summary.combinedFinalBalance), false)}{' '}
                              <span className="text-[10px] font-sans font-normal text-slate-500">
                                {summary.combinedBalanceStatus === 'payable'
                                  ? tr('(Payable)', '(ਦੇਣੇ ਹਨ)')
                                  : summary.combinedBalanceStatus === 'receivable'
                                  ? tr('(Receivable)', '(ਲੈਣੇ ਹਨ)')
                                  : ''}
                              </span>
                            </span>
                            {summary.totalAdvanceWithInterest > 0 && (
                              <div className="text-[10px] text-amber-700 font-normal">
                                {tr('Adv P+I', 'ਪੇਸ਼ਗੀ ਮੂਲ+ਵਿਆਜ')}:{' '}
                                {formatINR(summary.totalAdvanceWithInterest, false)}
                              </div>
                            )}
                          </div>
                        ) : (
                          '₹0.00'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenLedger(f.id)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md cursor-pointer"
                            title={tr('Open Farmer Hisab & Ledgers', 'ਕਿਸਾਨ ਹਿਸਾਬ ਅਤੇ ਖਾਤਾ ਖੋਲ੍ਹੋ')}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditClick(f)}
                            className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                            title={tr('Edit Farmer', 'ਕਿਸਾਨ ਸੋਧੋ')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteFarmer(f)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                            title={tr('Delete Farmer', 'ਕਿਸਾਨ ਹਟਾਓ')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
