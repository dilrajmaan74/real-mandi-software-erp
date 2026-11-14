import React, { useEffect, useMemo, useState } from 'react';
import {
  MphAdvance,
  MphFarmer,
  MphInterestBasis,
} from '../../types/mandiPaddyHisab';
import {
  calculateAdvanceDaysAndInterest,
  formatDateDMY,
  formatINR,
} from '../../lib/mandiPaddyHisabUtils';
import { Calculator, Edit3, Percent, Plus, Search, Trash2, X } from 'lucide-react';

interface MphAdvanceViewProps {
  farmers: MphFarmer[];
  advances: MphAdvance[];
  onSaveAdvance: (advance: MphAdvance) => void;
  onDeleteAdvance: (advance: MphAdvance) => void;
  onGoToFarmers: () => void;
}

const QUICK_RATES = ['0', '1', '1.5', '2'];
const QUICK_PURPOSES = [
  'Pre-Season Advance (ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਪੇਸ਼ਗੀ)',
  'Other Work Payment (ਹੋਰ ਕੰਮ ਲਈ ਰਕਮ)',
  'Fertilizer / Seed (ਖਾਦ / ਬੀਜ)',
  'Diesel / Tractor (ਡੀਜ਼ਲ / ਟਰੈਕਟਰ)',
];

export const MphAdvanceView: React.FC<MphAdvanceViewProps> = ({
  farmers,
  advances,
  onSaveAdvance,
  onDeleteAdvance,
  onGoToFarmers,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string>(farmers[0]?.id || '');
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [purpose, setPurpose] = useState<string>('Pre-Season Advance (ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਪੇਸ਼ਗੀ)');
  const [principalAmount, setPrincipalAmount] = useState<string>('');
  const [interestRateMonthly, setInterestRateMonthly] = useState<string>('1.5');
  const [interestBasis, setInterestBasis] = useState<MphInterestBasis>('daily_30');
  const [customInterestOverride, setCustomInterestOverride] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterFarmerId, setFilterFarmerId] = useState('all');

  useEffect(() => {
    if (!farmerId && farmers.length > 0) {
      setFarmerId(farmers[0].id);
    }
  }, [farmers, farmerId]);

  const parsedPrincipal = Math.max(0, Number(principalAmount) || 0);
  const parsedRate = Math.max(0, Number(interestRateMonthly) || 0);

  const liveCalc = useMemo(() => {
    return calculateAdvanceDaysAndInterest(
      parsedPrincipal,
      parsedRate,
      startDate,
      endDate,
      interestBasis
    );
  }, [parsedPrincipal, parsedRate, startDate, endDate, interestBasis]);

  const effectiveInterest =
    customInterestOverride.trim() !== ''
      ? Math.max(0, Math.round((Number(customInterestOverride) || 0) * 100) / 100)
      : liveCalc.interestAmount;

  const effectiveTotal = Math.round((parsedPrincipal + effectiveInterest) * 100) / 100;

  const resetForm = () => {
    setEditingId(null);
    setStartDate(today);
    setEndDate(today);
    setPurpose('Pre-Season Advance (ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਪੇਸ਼ਗੀ)');
    setPrincipalAmount('');
    setInterestRateMonthly('1.5');
    setInterestBasis('daily_30');
    setCustomInterestOverride('');
    setErrorMsg(null);
  };

  const handleEditClick = (item: MphAdvance) => {
    setEditingId(item.id);
    setFarmerId(item.farmerId);
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setPurpose(item.purpose);
    setPrincipalAmount(String(item.principalAmount));
    setInterestRateMonthly(String(item.interestRateMonthly));
    setInterestBasis(item.interestBasis || 'daily_30');

    const recomputed = calculateAdvanceDaysAndInterest(
      item.principalAmount,
      item.interestRateMonthly,
      item.startDate,
      item.endDate,
      item.interestBasis || 'daily_30'
    );
    if (Math.abs(recomputed.interestAmount - item.interestAmount) > 0.01) {
      setCustomInterestOverride(String(item.interestAmount));
    } else {
      setCustomInterestOverride('');
    }
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedFarmer = farmers.find((f) => f.id === farmerId);
    if (!selectedFarmer) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਚੁਣੋ (Please select a farmer).');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਸ਼ੁਰੂ ਅਤੇ ਅੰਤ ਦੀ ਤਾਰੀਖ ਦਰਜ ਕਰੋ।');
      return;
    }
    if (endDate < startDate) {
      setErrorMsg('ਅੰਤ ਤਾਰੀਖ (End Date) ਸ਼ੁਰੂ ਤਾਰੀਖ (Start Date) ਤੋਂ ਪਹਿਲਾਂ ਨਹੀਂ ਹੋ ਸਕਦੀ।');
      return;
    }
    if (!purpose.trim()) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਵੇਰਵਾ / ਕਿਸ ਕੰਮ ਲਈ (Purpose) ਲਿਖੋ।');
      return;
    }
    if (parsedPrincipal <= 0) {
      setErrorMsg('ਮੂਲ ਰਕਮ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (Principal amount must be > 0).');
      return;
    }

    const now = new Date().toISOString();
    const existingItem = editingId ? advances.find((a) => a.id === editingId) || null : null;

    const record: MphAdvance = {
      id: existingItem
        ? existingItem.id
        : `MPHA_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      startDate,
      endDate,
      days: liveCalc.days,
      purpose: purpose.trim(),
      principalAmount: Math.round(parsedPrincipal * 100) / 100,
      interestRateMonthly: Math.round(parsedRate * 1000) / 1000,
      interestBasis,
      monthlyInterestAmount: liveCalc.monthlyInterestAmount,
      interestAmount: effectiveInterest,
      totalAmount: effectiveTotal,
      createdAt: existingItem ? existingItem.createdAt : now,
      updatedAt: now,
    };

    onSaveAdvance(record);
    resetForm();
  };

  const filteredAdvances = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...advances]
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt))
      .filter((adv) => {
        if (filterFarmerId !== 'all' && adv.farmerId !== filterFarmerId) return false;
        if (!q) return true;
        return (
          adv.farmerName.toLowerCase().includes(q) ||
          adv.purpose.toLowerCase().includes(q) ||
          adv.startDate.includes(q) ||
          adv.endDate.includes(q)
        );
      });
  }, [advances, filterFarmerId, search]);

  const totals = useMemo(() => {
    const principal =
      Math.round(filteredAdvances.reduce((s, a) => s + (Number(a.principalAmount) || 0), 0) * 100) /
      100;
    const interest =
      Math.round(filteredAdvances.reduce((s, a) => s + (Number(a.interestAmount) || 0), 0) * 100) /
      100;
    const total = Math.round((principal + interest) * 100) / 100;
    return { principal, interest, total };
  }, [filteredAdvances]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Form: Advance & Interest Entry */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? 'Edit Advance / Interest (ਸੋਧੋ)' : 'New Advance & Interest (ਪੇਸ਼ਗੀ/ਵਿਆਜ)'}
            </h3>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {farmers.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-xs text-slate-600">
              Please add a farmer in Farmer Master before recording advances & interest.
            </p>
            <button
              type="button"
              onClick={onGoToFarmers}
              className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Go to Farmer Master
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Farmer (ਕਿਸਾਨ ਚੁਣੋ) *
              </label>
              <select
                value={farmerId}
                onChange={(e) => setFarmerId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-amber-600"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.village})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purpose / Payment For (ਕਿਸ ਕੰਮ ਲਈ / ਵੇਰਵਾ) *
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Season Advance, Diesel, Seed, Other Payment..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {QUICK_PURPOSES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPurpose(p)}
                    className={`px-2 py-0.5 text-[10px] rounded border cursor-pointer ${
                      purpose === p
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Principal Amount (ਮੂਲ ਰਕਮ ₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={principalAmount}
                  onChange={(e) => {
                    setPrincipalAmount(e.target.value);
                    setCustomInterestOverride('');
                  }}
                  placeholder="e.g. 100000"
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Rate % (ਵਿਆਜ ਦਰ) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={interestRateMonthly}
                  onChange={(e) => {
                    setInterestRateMonthly(e.target.value);
                    setCustomInterestOverride('');
                  }}
                  placeholder="e.g. 1.5"
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                />
                <div className="flex items-center gap-1 mt-1">
                  {QUICK_RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setInterestRateMonthly(r);
                        setCustomInterestOverride('');
                      }}
                      className={`px-2 py-0.5 text-[10.5px] font-mono font-bold rounded border cursor-pointer ${
                        interestRateMonthly === r
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date (ਪੇਸ਼ਗੀ ਤਾਰੀਖ) *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCustomInterestOverride('');
                  }}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date (ਵਿਆਜ ਅੰਤ ਤਾਰੀਖ) *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCustomInterestOverride('');
                  }}
                  className="w-full px-2.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Interest Calculation Method (ਵਿਆਜ ਹਿਸਾਬ ਤਰੀਕਾ)
              </label>
              <select
                value={interestBasis}
                onChange={(e) => {
                  setInterestBasis(e.target.value as MphInterestBasis);
                  setCustomInterestOverride('');
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="daily_30">Auto Days Basis (Exact Days ÷ 30 × Monthly Rate)</option>
                <option value="monthly_30">Calendar Month Basis (30-Day Months + Extra Days)</option>
              </select>
            </div>

            {/* Live Calculation Preview */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-amber-700" />
                  <span>Auto Days ({formatDateDMY(startDate)} → {formatDateDMY(endDate)}):</span>
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-900">
                  {liveCalc.days} Days
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Monthly Interest ({parsedRate}% / month):</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatINR(liveCalc.monthlyInterestAmount)} / mo
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Auto Calculated Interest:</span>
                <span className="font-mono tabular-nums font-bold text-rose-700">
                  {formatINR(liveCalc.interestAmount)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-amber-200/80">
                <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                  Edit Interest Manually (Optional — leave blank for auto)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customInterestOverride}
                  onChange={(e) => setCustomInterestOverride(e.target.value)}
                  placeholder={`Auto: ${liveCalc.interestAmount}`}
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-amber-300 rounded bg-white focus:outline-none focus:border-amber-600"
                />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200 font-bold text-sm text-slate-950">
                <span>Total (Principal + Interest):</span>
                <span className="font-mono tabular-nums text-rose-800">
                  {formatINR(effectiveTotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'Update Advance Entry (ਅੱਪਡੇਟ ਕਰੋ)' : 'Save Advance & Interest (ਸੇਵ ਕਰੋ)'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Right Table: Advance & Interest Register */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Advance & Interest Register (ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਰਜਿਸਟਰ - {filteredAdvances.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Multiple dates, independent end dates, auto days & custom monthly interest rates
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search farmer, purpose..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
              />
            </div>
            <select
              value={filterFarmerId}
              onChange={(e) => setFilterFarmerId(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Farmers</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredAdvances.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No Advance or Interest entries recorded matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-2.5 font-semibold">#</th>
                  <th className="py-2.5 px-2.5 font-semibold">Farmer & Purpose</th>
                  <th className="py-2.5 px-2.5 font-semibold">Start → End Date</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Days</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Principal</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Rate</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Interest</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Total (P+I)</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvances.map((adv, idx) => (
                  <tr key={adv.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-2.5 font-mono tabular-nums text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-slate-900">{adv.farmerName}</div>
                      <div className="text-[10.5px] text-slate-500">{adv.purpose}</div>
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums text-[11px] whitespace-nowrap text-slate-700">
                      {formatDateDMY(adv.startDate)} → {formatDateDMY(adv.endDate)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-700">
                      {adv.days}d
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatINR(adv.principalAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {adv.interestRateMonthly}%
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-amber-800 whitespace-nowrap">
                      {formatINR(adv.interestAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                      {formatINR(adv.totalAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(adv)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAdvance(adv)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={4} className="py-2.5 px-2.5">
                    Total ({filteredAdvances.length} Entries)
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatINR(totals.principal)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">—</td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-amber-900 whitespace-nowrap">
                    {formatINR(totals.interest)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap">
                    {formatINR(totals.total)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
