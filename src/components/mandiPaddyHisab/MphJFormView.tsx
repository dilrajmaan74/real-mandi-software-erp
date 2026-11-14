import React, { useEffect, useMemo, useState } from 'react';
import { MphFarmer, MphJForm, MphSettings } from '../../types/mandiPaddyHisab';
import {
  findDuplicateMphJForm,
  formatDateDMY,
  formatINR,
} from '../../lib/mandiPaddyHisabUtils';
import { Calculator, Edit3, FileSpreadsheet, Plus, Search, Trash2, X } from 'lucide-react';

interface MphJFormViewProps {
  farmers: MphFarmer[];
  jForms: MphJForm[];
  settings: MphSettings;
  onSaveJForm: (jForm: MphJForm) => void;
  onDeleteJForm: (jForm: MphJForm) => void;
  onGoToFarmers: () => void;
  requestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'warning';
    onConfirm: () => void;
  }) => void;
}

export const MphJFormView: React.FC<MphJFormViewProps> = ({
  farmers,
  jForms,
  settings,
  onSaveJForm,
  onDeleteJForm,
  onGoToFarmers,
  requestConfirm,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string>(farmers[0]?.id || '');
  const [holderRelation, setHolderRelation] = useState<string>('Self');
  const [jFormHolderName, setJFormHolderName] = useState<string>(farmers[0]?.name || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [jFormNo, setJFormNo] = useState<string>('');
  const [bags, setBags] = useState<string>('0');
  const [rate, setRate] = useState<string>(String(settings.paddyAGurdeRate));
  const [jFormAmount, setJFormAmount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterFarmerId, setFilterFarmerId] = useState('all');

  const selectedMainFarmer = useMemo(
    () => farmers.find((f) => f.id === farmerId) || null,
    [farmers, farmerId]
  );

  useEffect(() => {
    if (!farmerId && farmers.length > 0) {
      setFarmerId(farmers[0].id);
      setJFormHolderName(farmers[0].name);
      setHolderRelation('Self');
    }
  }, [farmers, farmerId]);

  // Previously saved family/hissedar holder names for this arrival farmer
  const knownHoldersForFarmer = useMemo(() => {
    if (!farmerId) return [] as Array<{ name: string; relation: string }>;
    const map = new Map<string, { name: string; relation: string }>();
    if (selectedMainFarmer) {
      map.set(`${selectedMainFarmer.name.toLowerCase()}|self`, {
        name: selectedMainFarmer.name,
        relation: 'Self',
      });
    }
    for (const j of jForms) {
      if (j.farmerId !== farmerId) continue;
      const hName = (j.jFormHolderName || j.farmerName || '').trim();
      const hRel = (j.holderRelation || 'Self').trim();
      if (!hName) continue;
      const key = `${hName.toLowerCase()}|${hRel.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, { name: hName, relation: hRel });
      }
    }
    return Array.from(map.values());
  }, [farmerId, jForms, selectedMainFarmer]);

  const handleMainFarmerChange = (nextFarmerId: string) => {
    setFarmerId(nextFarmerId);
    const nextFarmer = farmers.find((f) => f.id === nextFarmerId);
    if (nextFarmer && holderRelation === 'Self') {
      setJFormHolderName(nextFarmer.name);
    } else if (nextFarmer && !jFormHolderName.trim()) {
      setJFormHolderName(nextFarmer.name);
      setHolderRelation('Self');
    }
  };

  const handleRelationChange = (nextRel: string) => {
    setHolderRelation(nextRel);
    if (nextRel === 'Self' && selectedMainFarmer) {
      setJFormHolderName(selectedMainFarmer.name);
    } else if (
      nextRel !== 'Self' &&
      selectedMainFarmer &&
      jFormHolderName.trim() === selectedMainFarmer.name.trim()
    ) {
      setJFormHolderName('');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setHolderRelation('Self');
    setJFormHolderName(selectedMainFarmer?.name || '');
    setDate(new Date().toISOString().split('T')[0]);
    setJFormNo('');
    setBags('0');
    setRate(String(settings.paddyAGurdeRate));
    setJFormAmount('0');
    setNotes('');
    setErrorMsg(null);
  };

  const handleEditClick = (item: MphJForm) => {
    setEditingId(item.id);
    setFarmerId(item.farmerId);
    setHolderRelation(item.holderRelation || 'Self');
    setJFormHolderName(item.jFormHolderName || item.farmerName || '');
    setDate(item.date);
    setJFormNo(item.jFormNo || '');
    setBags(String(item.bags));
    setRate(String(item.rate));
    setJFormAmount(String(item.jFormAmount));
    setNotes(item.notes || '');
    setErrorMsg(null);
  };

  const parsedBags = Math.max(0, Math.floor(Number(bags) || 0));
  const parsedRate = Math.max(0, Number(rate) || 0);
  const parsedAmount = Math.max(0, Number(jFormAmount) || 0);

  const handleAutoCalculateAmount = () => {
    const qtl = parsedBags * 0.375;
    const calc = Math.round(qtl * parsedRate * 100) / 100;
    setJFormAmount(String(calc));
  };

  const commitSave = (existingItem: MphJForm | null, selectedFarmer: MphFarmer) => {
    const now = new Date().toISOString();
    const resolvedHolderName =
      holderRelation === 'Self'
        ? (jFormHolderName.trim() || selectedFarmer.name)
        : jFormHolderName.trim();
    const record: MphJForm = {
      id: existingItem
        ? existingItem.id
        : `MPHJ_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      jFormHolderName: resolvedHolderName,
      holderRelation: holderRelation || 'Self',
      date,
      jFormNo: jFormNo.trim(),
      bags: parsedBags,
      rate: parsedRate,
      jFormAmount: Math.round(parsedAmount * 100) / 100,
      notes: notes.trim(),
      createdAt: existingItem ? existingItem.createdAt : now,
      updatedAt: now,
    };
    onSaveJForm(record);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedFarmer = farmers.find((f) => f.id === farmerId);
    if (!selectedFarmer) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਚੁਣੋ (Please select a farmer).');
      return;
    }
    const resolvedHolder =
      holderRelation === 'Self'
        ? (jFormHolderName.trim() || selectedFarmer.name)
        : jFormHolderName.trim();
    if (!resolvedHolder) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਜੇ-ਫਾਰਮ ਧਾਰਕ ਦਾ ਨਾਮ (Son / Wife / Hissedar Name) ਦਰਜ ਕਰੋ।');
      return;
    }
    if (!date) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ J-Form ਤਾਰੀਖ ਦਰਜ ਕਰੋ।');
      return;
    }
    if (parsedBags <= 0) {
      setErrorMsg('ਗੱਟਿਆਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (Bags must be greater than 0).');
      return;
    }
    if (parsedAmount <= 0) {
      setErrorMsg('J-Form ਰਕਮ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (J-Form Amount must be greater than 0).');
      return;
    }

    const existingItem = editingId ? jForms.find((j) => j.id === editingId) || null : null;
    const dup = findDuplicateMphJForm(
      {
        farmerId: selectedFarmer.id,
        jFormHolderName: resolvedHolder,
        date,
        bags: parsedBags,
        jFormAmount: parsedAmount,
        jFormNo,
      },
      jForms,
      editingId || undefined
    );

    if (dup) {
      requestConfirm({
        title: 'Duplicate J-Form Warning (ਡੁਪਲੀਕੇਟ ਚੇਤਾਵਨੀ)',
        message: `Farmer "${selectedFarmer.name}" (J-Form Name: ${resolvedHolder}) already has a matching J-Form entry on ${formatDateDMY(date)} (${parsedBags} Bags, ${formatINR(parsedAmount)}).\n\nDo you still want to save this J-Form?`,
        confirmLabel: 'Save Anyway (ਫਿਰ ਵੀ ਸੇਵ ਕਰੋ)',
        tone: 'warning',
        onConfirm: () => commitSave(existingItem, selectedFarmer),
      });
      return;
    }

    commitSave(existingItem, selectedFarmer);
  };

  const filteredJForms = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...jForms]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .filter((j) => {
        if (filterFarmerId !== 'all' && j.farmerId !== filterFarmerId) return false;
        if (!q) return true;
        return (
          j.farmerName.toLowerCase().includes(q) ||
          (j.jFormHolderName || '').toLowerCase().includes(q) ||
          (j.holderRelation || '').toLowerCase().includes(q) ||
          (j.jFormNo || '').toLowerCase().includes(q) ||
          j.date.includes(q) ||
          (j.notes || '').toLowerCase().includes(q)
        );
      });
  }, [jForms, filterFarmerId, search]);

  const filteredTotals = useMemo(() => {
    const totalBags = filteredJForms.reduce((s, j) => s + (Number(j.bags) || 0), 0);
    const totalAmount =
      Math.round(filteredJForms.reduce((s, j) => s + (Number(j.jFormAmount) || 0), 0) * 100) / 100;
    const totalLabor =
      Math.round(totalBags * (Number(settings.jFormLaborRate) || 0) * 100) / 100;
    return { totalBags, totalAmount, totalLabor };
  }, [filteredJForms, settings.jFormLaborRate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Form: J-Form Entry */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? 'Edit J-Form (ਜੇ-ਫਾਰਮ ਸੋਧੋ)' : 'New J-Form Entry (ਨਵਾਂ ਜੇ-ਫਾਰਮ)'}
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
              Please add a farmer in Farmer Master before recording J-Form entries.
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
                Arrival Farmer Account (ਕਿਸਾਨ ਖਾਤਾ - ਜੋ ਝੋਨਾ ਲਿਆਇਆ) *
              </label>
              <select
                value={farmerId}
                onChange={(e) => handleMainFarmerChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.village})
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-Farmer / Family / Hissedar J-Form Name */}
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
              <div className="text-[11px] font-bold text-blue-950">
                J-Form Name (ਜੇ-ਫਾਰਮ ਕਿਸ ਦੇ ਨਾਮ ਬਣਿਆ — Self / Son / Wife / Hissedar)
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Relation (ਰਿਸ਼ਤਾ)
                  </label>
                  <select
                    value={holderRelation}
                    onChange={(e) => handleRelationChange(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Self">Self (ਆਪਣੇ ਨਾਮ)</option>
                    <option value="Son">Son (ਪੁੱਤਰ)</option>
                    <option value="Wife">Wife (ਪਤਨੀ)</option>
                    <option value="Hissedar">Hissedar (ਹਿੱਸੇਦਾਰ)</option>
                    <option value="Father">Father (ਪਿਤਾ)</option>
                    <option value="Brother">Brother (ਭਰਾ)</option>
                    <option value="Other">Other (ਹੋਰ)</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    J-Form Holder Name *
                  </label>
                  <input
                    type="text"
                    value={jFormHolderName}
                    onChange={(e) => setJFormHolderName(e.target.value)}
                    placeholder={
                      holderRelation === 'Self'
                        ? selectedMainFarmer?.name || 'Farmer Name'
                        : `Enter ${holderRelation} name...`
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              {knownHoldersForFarmer.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-500 mr-1">Quick select:</span>
                  {knownHoldersForFarmer.map((h) => (
                    <button
                      key={`${h.name}|${h.relation}`}
                      type="button"
                      onClick={() => {
                        setHolderRelation(h.relation);
                        setJFormHolderName(h.name);
                      }}
                      className={`px-2 py-0.5 text-[10.5px] font-semibold rounded border transition-colors cursor-pointer ${
                        jFormHolderName.trim().toLowerCase() === h.name.toLowerCase() &&
                        holderRelation === h.relation
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {h.name} ({h.relation})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  J-Form Date (ਤਾਰੀਖ) *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  J-Form No. (ਨੰਬਰ)
                </label>
                <input
                  type="text"
                  value={jFormNo}
                  onChange={(e) => setJFormNo(e.target.value)}
                  placeholder="Optional e.g. JF-102"
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Bags (ਗੱਟੇ) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={bags}
                  onChange={(e) => setBags(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rate / Quintal (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  J-Form Amount (ਜੇ-ਫਾਰਮ ਰਕਮ ₹) *
                </label>
                <button
                  type="button"
                  onClick={handleAutoCalculateAmount}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                  title="Calculate Bags × 0.375 Qtl × Rate"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Auto Calc ({(parsedBags * 0.375).toFixed(2)} Qtl)</span>
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={jFormAmount}
                onChange={(e) => setJFormAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-blue-300 bg-blue-50/40 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>


            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes (ਨੋਟ)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agency / remarks..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? 'Update J-Form (ਅੱਪਡੇਟ ਕਰੋ)' : 'Save J-Form (ਜੇ-ਫਾਰਮ ਸੇਵ ਕਰੋ)'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Right Table: J-Form Register */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              J-Form Register (ਜੇ-ਫਾਰਮ ਰਜਿਸਟਰ - {filteredJForms.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Separate date-wise J-Form ledger & automatic ₹{settings.jFormLaborRate}/bag labour calculation
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search farmer, J-Form..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
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

        {filteredJForms.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No J-Form entries recorded matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">J-Form Date</th>
                  <th className="py-2.5 px-3 font-semibold">Arrival Farmer / J-Form Name</th>
                  <th className="py-2.5 px-3 font-semibold">J-Form No.</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Bags</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Rate</th>
                  <th className="py-2.5 px-3 font-semibold text-right">J-Form Amount</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Labour (₹{settings.jFormLaborRate}/bag)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJForms.map((j, idx) => {
                  const labor = Math.round(j.bags * (Number(settings.jFormLaborRate) || 0) * 100) / 100;
                  const holderName = j.jFormHolderName || j.farmerName;
                  const holderRel = j.holderRelation || 'Self';
                  const isDifferentHolder =
                    holderRel !== 'Self' ||
                    holderName.trim().toLowerCase() !== j.farmerName.trim().toLowerCase();
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap text-slate-700">
                        {formatDateDMY(j.date)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{j.farmerName}</div>
                        <div
                          className={`text-[10.5px] ${
                            isDifferentHolder ? 'text-blue-700 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          J-Form: {holderName} ({holderRel})
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {j.jFormNo || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                        {j.bags}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        ₹{j.rate}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-blue-800 whitespace-nowrap">
                        {formatINR(j.jFormAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-rose-700 whitespace-nowrap">
                        -{formatINR(labor)}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditClick(j)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title="Edit J-Form"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteJForm(j)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Delete J-Form"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3">
                    Total ({filteredJForms.length} J-Forms)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {filteredTotals.totalBags.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right">—</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-900 whitespace-nowrap">
                    {formatINR(filteredTotals.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap">
                    -{formatINR(filteredTotals.totalLabor)}
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
