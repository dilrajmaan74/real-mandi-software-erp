import React, { useEffect, useMemo, useState } from 'react';
import {
  MphArrival,
  MphFarmer,
  MphPaddyType,
  MphSettings,
} from '../../types/mandiPaddyHisab';
import {
  calculatePaddyAmount,
  calculatePaddyWeight,
  findDuplicateMphArrival,
  formatDateDMY,
  formatINR,
  formatLooseKgGm,
  formatWeightQKG,
  sumPaddyWeights,
} from '../../lib/mandiPaddyHisabUtils';
import { Edit3, Plus, Search, Trash2, Wheat, X } from 'lucide-react';

interface MphArrivalViewProps {
  farmers: MphFarmer[];
  arrivals: MphArrival[];
  settings: MphSettings;
  onSaveArrival: (arrival: MphArrival) => void;
  onDeleteArrival: (arrival: MphArrival) => void;
  onGoToFarmers: () => void;
  requestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'warning';
    onConfirm: () => void;
  }) => void;
}

export const MphArrivalView: React.FC<MphArrivalViewProps> = ({
  farmers,
  arrivals,
  settings,
  onSaveArrival,
  onDeleteArrival,
  onGoToFarmers,
  requestConfirm,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string>(farmers[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paddyType, setPaddyType] = useState<MphPaddyType>('Paddy A Gurde');
  const [ratePerQuintal, setRatePerQuintal] = useState<string>(String(settings.paddyAGurdeRate));
  const [bags, setBags] = useState<string>('0');
  const [looseKg, setLooseKg] = useState<string>('0');
  const [looseGm, setLooseGm] = useState<string>('0');
  const [applyDryingLabor, setApplyDryingLabor] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterFarmerId, setFilterFarmerId] = useState('all');
  const [filterType, setFilterType] = useState<'all' | MphPaddyType>('all');

  useEffect(() => {
    if (!farmerId && farmers.length > 0) {
      setFarmerId(farmers[0].id);
    }
  }, [farmers, farmerId]);

  // Update default rate when switching paddy type (when creating new entry)
  const handlePaddyTypeChange = (nextType: MphPaddyType) => {
    setPaddyType(nextType);
    if (!editingId) {
      setRatePerQuintal(
        nextType === 'Hybrid Paddy'
          ? String(settings.hybridPaddyRate)
          : String(settings.paddyAGurdeRate)
      );
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setPaddyType('Paddy A Gurde');
    setRatePerQuintal(String(settings.paddyAGurdeRate));
    setBags('0');
    setLooseKg('0');
    setLooseGm('0');
    setApplyDryingLabor(true);
    setNotes('');
    setErrorMsg(null);
  };

  const handleEditClick = (item: MphArrival) => {
    setEditingId(item.id);
    setFarmerId(item.farmerId);
    setDate(item.date);
    setPaddyType(item.paddyType);
    setRatePerQuintal(String(item.ratePerQuintal));
    setBags(String(item.bags));
    setLooseKg(String(item.looseKg));
    setLooseGm(String(item.looseGm));
    setApplyDryingLabor(item.applyDryingLabor !== false);
    setNotes(item.notes || '');
    setErrorMsg(null);
  };

  const parsedBags = Math.max(0, Math.floor(Number(bags) || 0));
  const parsedLooseKg = Math.max(0, Math.floor(Number(looseKg) || 0));
  const parsedLooseGm = Math.max(0, Math.floor(Number(looseGm) || 0));
  const parsedRate = Math.max(0, Number(ratePerQuintal) || 0);

  const liveWeight = useMemo(
    () => calculatePaddyWeight(parsedBags, parsedLooseKg, parsedLooseGm),
    [parsedBags, parsedLooseKg, parsedLooseGm]
  );

  const liveAmount = useMemo(
    () => calculatePaddyAmount(liveWeight.totalQuintals, parsedRate),
    [liveWeight.totalQuintals, parsedRate]
  );

  const commitSave = (existingItem: MphArrival | null, selectedFarmer: MphFarmer) => {
    const now = new Date().toISOString();
    // Normalize loose grams overflow if user enters >= 1000 gm
    const extraKgFromGm = Math.floor(parsedLooseGm / 1000);
    const normalizedLooseKg = parsedLooseKg + extraKgFromGm;
    const normalizedLooseGm = parsedLooseGm % 1000;
    const finalWeight = calculatePaddyWeight(parsedBags, normalizedLooseKg, normalizedLooseGm);
    const finalAmount = calculatePaddyAmount(finalWeight.totalQuintals, parsedRate);

    const record: MphArrival = {
      id: existingItem
        ? existingItem.id
        : `MPHA_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      date,
      paddyType,
      ratePerQuintal: parsedRate,
      bags: parsedBags,
      looseKg: normalizedLooseKg,
      looseGm: normalizedLooseGm,
      totalQuintals: finalWeight.totalQuintals,
      weightQtlPart: finalWeight.weightQtlPart,
      weightKgPart: finalWeight.weightKgPart,
      weightGmPart: finalWeight.weightGmPart,
      paddyAmount: finalAmount,
      applyDryingLabor,
      notes: notes.trim(),
      createdAt: existingItem ? existingItem.createdAt : now,
      updatedAt: now,
    };

    onSaveArrival(record);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedFarmer = farmers.find((f) => f.id === farmerId);
    if (!selectedFarmer) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਕਿਸਾਨ ਚੁਣੋ (Please select a farmer).');
      return;
    }
    if (!date) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਆਵਕ ਤਾਰੀਖ (Arrival Date) ਚੁਣੋ।');
      return;
    }
    if (parsedRate <= 0) {
      setErrorMsg('ਰੇਟ 0 ਤੋਂ ਵੱਧ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ (Rate per quintal must be greater than 0).');
      return;
    }
    if (parsedBags === 0 && parsedLooseKg === 0 && parsedLooseGm === 0) {
      setErrorMsg('ਗੱਟੇ ਜਾਂ ਖੁੱਲ੍ਹਾ ਵਜ਼ਨ ਦਰਜ ਕਰੋ (Enter bags or loose weight).');
      return;
    }

    const existingItem = editingId ? arrivals.find((a) => a.id === editingId) || null : null;
    const normalizedLooseKg = parsedLooseKg + Math.floor(parsedLooseGm / 1000);
    const normalizedLooseGm = parsedLooseGm % 1000;

    const dup = findDuplicateMphArrival(
      {
        farmerId: selectedFarmer.id,
        date,
        paddyType,
        bags: parsedBags,
        looseKg: normalizedLooseKg,
        looseGm: normalizedLooseGm,
      },
      arrivals,
      editingId || undefined
    );

    if (dup) {
      requestConfirm({
        title: 'Duplicate Paddy Arrival Warning (ਡੁਪਲੀਕੇਟ ਚੇਤਾਵਨੀ)',
        message: `Farmer "${selectedFarmer.name}" already has an identical ${paddyType} entry on ${formatDateDMY(date)} (${parsedBags} Bags, ${formatLooseKgGm(normalizedLooseKg, normalizedLooseGm)}).\n\nDo you still want to save this entry?`,
        confirmLabel: 'Save Anyway (ਫਿਰ ਵੀ ਸੇਵ ਕਰੋ)',
        tone: 'warning',
        onConfirm: () => commitSave(existingItem, selectedFarmer),
      });
      return;
    }

    commitSave(existingItem, selectedFarmer);
  };

  const filteredArrivals = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...arrivals]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .filter((a) => {
        if (filterFarmerId !== 'all' && a.farmerId !== filterFarmerId) return false;
        if (filterType !== 'all' && a.paddyType !== filterType) return false;
        if (!q) return true;
        return (
          a.farmerName.toLowerCase().includes(q) ||
          a.paddyType.toLowerCase().includes(q) ||
          a.date.includes(q) ||
          (a.notes || '').toLowerCase().includes(q)
        );
      });
  }, [arrivals, filterFarmerId, filterType, search]);

  const filteredTotals = useMemo(() => {
    const weights = sumPaddyWeights(filteredArrivals);
    const totalAmount =
      Math.round(filteredArrivals.reduce((s, a) => s + (Number(a.paddyAmount) || 0), 0) * 100) /
      100;
    return { weights, totalAmount };
  }, [filteredArrivals]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Form: Paddy Arrival Entry */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wheat className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? 'Edit Paddy Arrival (ਸੋਧੋ)' : 'Paddy Arrival Entry (ਝੋਨਾ ਆਵਕ)'}
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
              Please add a farmer in Farmer Master before recording paddy arrivals.
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
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.village})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Date (ਤਾਰੀਖ) *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rate / Quintal (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ratePerQuintal}
                  onChange={(e) => setRatePerQuintal(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paddy Type (ਝੋਨੇ ਦੀ ਕਿਸਮ) *
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => handlePaddyTypeChange('Paddy A Gurde')}
                  className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    paddyType === 'Paddy A Gurde'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paddy A Gurde (₹{settings.paddyAGurdeRate})
                </button>
                <button
                  type="button"
                  onClick={() => handlePaddyTypeChange('Hybrid Paddy')}
                  className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    paddyType === 'Hybrid Paddy'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hybrid Paddy (₹{settings.hybridPaddyRate})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bags (ਗੱਟੇ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={bags}
                  onChange={(e) => setBags(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loose KG (ਕਿੱਲੋ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={looseKg}
                  onChange={(e) => setLooseKg(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loose GM (ਗ੍ਰਾਮ)
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  step="1"
                  value={looseGm}
                  onChange={(e) => setLooseGm(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>Bags Weight ({parsedBags} × 37.5 KG) + Loose:</span>
                <span className="font-mono tabular-nums font-semibold">
                  {liveWeight.totalQuintals.toFixed(3)} Qtl
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-950 font-bold">
                <span>Total Weight (ਕੁੱਲ ਵਜ਼ਨ):</span>
                <span className="font-mono tabular-nums">
                  {formatWeightQKG(
                    liveWeight.weightQtlPart,
                    liveWeight.weightKgPart,
                    liveWeight.weightGmPart
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200 text-emerald-900 font-bold text-sm">
                <span>Paddy Amount (ਝੋਨਾ ਰਕਮ):</span>
                <span className="font-mono tabular-nums">{formatINR(liveAmount)}</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={applyDryingLabor}
                onChange={(e) => setApplyDryingLabor(e.target.checked)}
                className="w-4 h-4 text-emerald-700 rounded cursor-pointer"
              />
              <span>
                Apply Paddy Drying Labour (₹{settings.paddyDryingLaborRate}/bag ={' '}
                <strong className="font-mono tabular-nums">
                  {formatINR(parsedBags * settings.paddyDryingLaborRate)}
                </strong>
                )
              </span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes / Remarks (ਨੋਟ)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional trolley / lot note..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'Update Arrival (ਅੱਪਡੇਟ ਕਰੋ)' : 'Save Paddy Arrival (ਸੇਵ ਕਰੋ)'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Right Table: Date-Wise Paddy Arrivals */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Paddy Arrival Register (ਝੋਨਾ ਆਵਕ ਰਜਿਸਟਰ - {filteredArrivals.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              1 Bag = 37.5 KG · Loose KG/GM tracked separately from bag count
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
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
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | MphPaddyType)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Types</option>
              <option value="Paddy A Gurde">Paddy A Gurde</option>
              <option value="Hybrid Paddy">Hybrid Paddy</option>
            </select>
          </div>
        </div>

        {filteredArrivals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No paddy arrivals recorded matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-2.5 font-semibold">#</th>
                  <th className="py-2.5 px-2.5 font-semibold">Date</th>
                  <th className="py-2.5 px-2.5 font-semibold">Farmer</th>
                  <th className="py-2.5 px-2.5 font-semibold">Paddy Type</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Bags</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Loose KG/GM</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Total Weight</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Rate</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArrivals.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-2.5 font-mono tabular-nums text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums whitespace-nowrap text-slate-700">
                      {formatDateDMY(a.date)}
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-slate-900">
                      {a.farmerName}
                    </td>
                    <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                      {a.paddyType}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold">
                      {a.bags}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatLooseKgGm(a.looseKg, a.looseGm)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-700">
                      ₹{a.ratePerQuintal}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-emerald-800 whitespace-nowrap">
                      {formatINR(a.paddyAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(a)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                          title="Edit Entry"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteArrival(a)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Delete Entry"
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
                    Total ({filteredArrivals.length} Entries)
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {filteredTotals.weights.totalBags.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatLooseKgGm(
                      filteredTotals.weights.totalLooseKg,
                      filteredTotals.weights.totalLooseGm
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatWeightQKG(
                      filteredTotals.weights.weightQtlPart,
                      filteredTotals.weights.weightKgPart,
                      filteredTotals.weights.weightGmPart
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">—</td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-emerald-900 whitespace-nowrap">
                    {formatINR(filteredTotals.totalAmount)}
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
