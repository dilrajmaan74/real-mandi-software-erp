import React, { useMemo, useRef, useState } from 'react';
import {
  MphArrival,
  MphFarmer,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../../types/mandiPaddyHisab';
import {
  computeFarmerAccountSummary,
  formatDateDMY,
  formatINR,
  formatLooseKgGm,
  formatWeightQKG,
} from '../../lib/mandiPaddyHisabUtils';
import { exportElementToPdf } from '../../lib/mandiPaddyHisabPdf';
import {
  Download,
  Edit3,
  FileSpreadsheet,
  Loader2,
  Plus,
  Printer,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';

interface MphFarmerLedgerViewProps {
  farmers: MphFarmer[];
  arrivals: MphArrival[];
  jForms: MphJForm[];
  otherEntries: MphOtherEntry[];
  settings: MphSettings;
  selectedFarmerId: string;
  onSelectFarmerId: (id: string) => void;
  onSaveOtherEntry: (entry: MphOtherEntry) => void;
  onDeleteOtherEntry: (entry: MphOtherEntry) => void;
  onGoToArrivals: () => void;
  onGoToJForms: () => void;
  onGoToFarmers: () => void;
}

export const MphFarmerLedgerView: React.FC<MphFarmerLedgerViewProps> = ({
  farmers,
  arrivals,
  jForms,
  otherEntries,
  settings,
  selectedFarmerId,
  onSelectFarmerId,
  onSaveOtherEntry,
  onDeleteOtherEntry,
  onGoToArrivals,
  onGoToJForms,
  onGoToFarmers,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Other expense / payment inline form state
  const [editingOtherId, setEditingOtherId] = useState<string | null>(null);
  const [otherDate, setOtherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [otherType, setOtherType] = useState<'add' | 'deduct'>('deduct');
  const [otherDesc, setOtherDesc] = useState<string>('');
  const [otherAmount, setOtherAmount] = useState<string>('');
  const [otherError, setOtherError] = useState<string | null>(null);

  const activeFarmer = useMemo(() => {
    if (farmers.length === 0) return null;
    return farmers.find((f) => f.id === selectedFarmerId) || farmers[0];
  }, [farmers, selectedFarmerId]);

  const summary = useMemo(() => {
    if (!activeFarmer) return null;
    return computeFarmerAccountSummary(
      activeFarmer,
      arrivals,
      jForms,
      otherEntries,
      settings
    );
  }, [activeFarmer, arrivals, jForms, otherEntries, settings]);

  const jFormHolderBreakdown = useMemo(() => {
    if (!summary) return [] as Array<{ key: string; name: string; relation: string; bags: number; amount: number; count: number }>;
    const map = new Map<string, { key: string; name: string; relation: string; bags: number; amount: number; count: number }>();
    for (const j of summary.jForms) {
      const name = (j.jFormHolderName || j.farmerName || '').trim();
      const relation = (j.holderRelation || 'Self').trim();
      const key = `${name.toLowerCase()}|${relation.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.bags += Number(j.bags) || 0;
        existing.amount = Math.round((existing.amount + (Number(j.jFormAmount) || 0)) * 100) / 100;
        existing.count += 1;
      } else {
        map.set(key, {
          key,
          name,
          relation,
          bags: Number(j.bags) || 0,
          amount: Math.round((Number(j.jFormAmount) || 0) * 100) / 100,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [summary]);

  const resetOtherForm = () => {
    setEditingOtherId(null);
    setOtherDate(new Date().toISOString().split('T')[0]);
    setOtherType('deduct');
    setOtherDesc('');
    setOtherAmount('');
    setOtherError(null);
  };

  const handleEditOther = (item: MphOtherEntry) => {
    setEditingOtherId(item.id);
    setOtherDate(item.date);
    setOtherType(item.entryType);
    setOtherDesc(item.description);
    setOtherAmount(String(item.amount));
    setOtherError(null);
  };

  const handleOtherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarmer) return;
    setOtherError(null);

    const amt = Number(otherAmount);
    if (!otherDesc.trim()) {
      setOtherError('ਕਿਰਪਾ ਕਰਕੇ ਵੇਰਵਾ (Description) ਲਿਖੋ।');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setOtherError('ਰਕਮ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (Amount must be greater than 0).');
      return;
    }

    const now = new Date().toISOString();
    const existing = editingOtherId
      ? otherEntries.find((o) => o.id === editingOtherId)
      : null;

    onSaveOtherEntry({
      id: existing
        ? existing.id
        : `MPHO_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      farmerId: activeFarmer.id,
      farmerName: activeFarmer.name,
      date: otherDate,
      entryType: otherType,
      description: otherDesc.trim(),
      amount: Math.round(amt * 100) / 100,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    });
    resetOtherForm();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || !activeFarmer) return;
    setIsExporting(true);
    try {
      await exportElementToPdf(
        printRef.current,
        `Mandi_Paddy_Hisab_${activeFarmer.name.replace(/\s+/g, '_')}.pdf`,
        'landscape'
      );
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (farmers.length === 0 || !activeFarmer || !summary) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-800">
          No farmers registered in Mandi Paddy Hisab yet.
        </p>
        <p className="text-xs text-slate-500">
          Add a farmer first to view their Final Account and Two-Side Ledgers.
        </p>
        <button
          type="button"
          onClick={onGoToFarmers}
          className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          Go to Farmer Master
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Farmer Selector & Export Bar */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Select Farmer (ਕਿਸਾਨ ਚੁਣੋ):
          </label>
          <select
            value={activeFarmer.id}
            onChange={(e) => {
              onSelectFarmerId(e.target.value);
              resetOtherForm();
            }}
            className="w-full sm:w-80 px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
          >
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.fatherName ? `S/O ${f.fatherName}` : ''} — {f.village}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGoToArrivals}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
          >
            <Wheat className="w-3.5 h-3.5" />
            <span>+ Arrival</span>
          </button>
          <button
            type="button"
            onClick={onGoToJForms}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>+ J-Form</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Ledger & Final Account Container */}
      <div ref={printRef} className="space-y-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
        {/* Statement Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {activeFarmer.name}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Father: {activeFarmer.fatherName || '—'} · Village: {activeFarmer.village} · Mobile:{' '}
              <span className="font-mono">{activeFarmer.mobile || '—'}</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs font-bold text-slate-900">
              Mandi Paddy Hisab — Farmer Final Account
            </div>
            <div className="text-[11px] text-slate-500">
              Printed on {formatDateDMY(new Date().toISOString().split('T')[0])}
            </div>
          </div>
        </div>

        {/* 6. Farmer Final Account Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Farmer Final Account Calculation (ਅੰਤਿਮ ਹਿਸਾਬ ਵੇਰਵਾ)
              </h3>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">Total Paddy Amount (ਕੁੱਲ ਝੋਨੇ ਦੀ ਰਕਮ)</span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalArrivalBags} Bags ·{' '}
                    {formatWeightQKG(
                      summary.weightQtlPart,
                      summary.weightKgPart,
                      summary.weightGmPart
                    )}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-sm text-emerald-800">
                  {formatINR(summary.totalPaddyAmount)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium text-slate-800">(-) J-Form Amount (ਜੇ-ਫਾਰਮ ਰਕਮ)</span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalJFormBags} Bags across {summary.jForms.length} J-Forms
                  </span>
                  {jFormHolderBreakdown.some((h) => h.relation !== 'Self') && (
                    <span className="text-[11px] text-blue-800 font-medium block mt-0.5">
                      Adjusted Holders:{' '}
                      {jFormHolderBreakdown
                        .map((h) => `${h.name} (${h.relation}): ${h.bags}B · ${formatINR(h.amount)}`)
                        .join(' | ')}
                    </span>
                  )}
                </div>
                <span className="font-mono tabular-nums font-semibold text-rose-700 shrink-0">
                  -{formatINR(summary.totalJFormAmount)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">(-) J-Form Labour (ਜੇ-ਫਾਰਮ ਲੇਬਰ)</span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalArrivalBags} Total Arrival Bags × ₹{settings.jFormLaborRate}/bag (ਮੰਡੀ ਆਵਕ ਗੱਟੇ)
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-rose-700">
                  -{formatINR(summary.totalJFormLabor)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">(-) Paddy Drying Labour (ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ)</span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalDryingBags} Bags × ₹{settings.paddyDryingLaborRate}/bag
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-rose-700">
                  -{formatINR(summary.totalDryingLabor)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">(+/-) Other Expenses or Payments (ਹੋਰ ਖਰਚੇ/ਅਦਾਇਗੀਆਂ)</span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    Added: +{formatINR(summary.totalOtherAdditions)} · Deducted: -
                    {formatINR(summary.totalOtherDeductions)}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {summary.totalOtherAdditions - summary.totalOtherDeductions >= 0 ? '+' : '-'}
                  {formatINR(Math.abs(summary.totalOtherAdditions - summary.totalOtherDeductions))}
                </span>
              </div>
            </div>
          </div>

          {/* Final Balance Card */}
          <div
            className={`lg:col-span-5 rounded-xl border p-5 flex flex-col justify-between ${
              summary.balanceStatus === 'payable'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : summary.balanceStatus === 'receivable'
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wide opacity-80">
                Final Balance (ਅੰਤਿਮ ਬਕਾਇਆ - Round Off)
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums mt-2">
                {formatINR(Math.abs(summary.finalBalance), false)}
              </div>
              <div className="mt-2 text-sm font-bold">
                {summary.balanceStatus === 'payable' && (
                  <span>
                    Farmer Nu Paise Dene Hai (Payable) — ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ
                  </span>
                )}
                {summary.balanceStatus === 'receivable' && (
                  <span>
                    Farmer Paise Lene Hai (Receivable) — ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ
                  </span>
                )}
                {summary.balanceStatus === 'settled' && (
                  <span>Settled (ਹਿਸਾਬ ਬਰਾਬਰ — ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ)</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="opacity-70 block text-[11px]">Total Paddy Amount</span>
                <span className="font-mono tabular-nums font-bold">
                  {formatINR(summary.totalPaddyAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="opacity-70 block text-[11px]">Total Deductions</span>
                <span className="font-mono tabular-nums font-bold">
                  -{formatINR(summary.totalDeductions)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 7. TWO SEPARATE DATE-WISE LEDGERS (SIDE BY SIDE) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* LEFT SIDE: PADDY ARRIVAL LEDGER */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-emerald-950">
                  LEFT: Paddy Arrival Ledger (ਝੋਨਾ ਆਵਕ ਖਾਤਾ - {summary.arrivals.length})
                </h3>
                <p className="text-[10.5px] text-emerald-800">
                  Date-wise arrival · Paddy type · Bags · Loose KG/GM · Total weight · Rate · Amount
                </p>
              </div>
            </div>
            {summary.arrivals.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No Paddy Arrivals for this farmer.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2 font-semibold">#</th>
                      <th className="py-2 px-2 font-semibold">Date</th>
                      <th className="py-2 px-2 font-semibold">Paddy Type</th>
                      <th className="py-2 px-2 font-semibold text-right">Bags</th>
                      <th className="py-2 px-2 font-semibold text-right">Loose</th>
                      <th className="py-2 px-2 font-semibold text-right">Total Weight</th>
                      <th className="py-2 px-2 font-semibold text-right">Rate</th>
                      <th className="py-2 px-2 font-semibold text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.arrivals.map((a, idx) => (
                      <tr key={a.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-2 font-mono tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 font-mono tabular-nums whitespace-nowrap">
                          {formatDateDMY(a.date)}
                        </td>
                        <td className="py-2 px-2 font-medium text-slate-800 whitespace-nowrap">
                          {a.paddyType}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold">
                          {a.bags}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {formatLooseKgGm(a.looseKg, a.looseGm)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          ₹{a.ratePerQuintal}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-emerald-800 whitespace-nowrap">
                          {formatINR(a.paddyAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50/80 border-t-2 border-emerald-200 font-bold text-emerald-950">
                    <tr>
                      <td colSpan={3} className="py-2 px-2">
                        Total Arrival
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {summary.totalArrivalBags}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatLooseKgGm(summary.totalLooseKg, summary.totalLooseGm)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatWeightQKG(
                          summary.weightQtlPart,
                          summary.weightKgPart,
                          summary.weightGmPart
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">—</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatINR(summary.totalPaddyAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: J-FORM LEDGER */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-blue-950">
                  RIGHT: J-Form Ledger (ਜੇ-ਫਾਰਮ ਖਾਤਾ - {summary.jForms.length})
                </h3>
                <p className="text-[10.5px] text-blue-800">
                  J-Form date · No. · J-Form Name (Self/Son/Wife/Hissedar) · Bags · Rate · Amount
                </p>
              </div>
            </div>
            {summary.jForms.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No J-Form entries for this farmer.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2 font-semibold">#</th>
                      <th className="py-2 px-2 font-semibold">J-Form Date</th>
                      <th className="py-2 px-2 font-semibold">No.</th>
                      <th className="py-2 px-2 font-semibold">J-Form Name</th>
                      <th className="py-2 px-2 font-semibold text-right">Bags</th>
                      <th className="py-2 px-2 font-semibold text-right">Rate</th>
                      <th className="py-2 px-2 font-semibold text-right">J-Form Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.jForms.map((j, idx) => {
                      const holderName = j.jFormHolderName || j.farmerName;
                      const holderRel = j.holderRelation || 'Self';
                      const isOther =
                        holderRel !== 'Self' ||
                        holderName.trim().toLowerCase() !== activeFarmer.name.trim().toLowerCase();
                      return (
                        <tr key={j.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-2 font-mono tabular-nums text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2 font-mono tabular-nums whitespace-nowrap">
                            {formatDateDMY(j.date)}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-600">
                            {j.jFormNo || '—'}
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={`font-semibold ${
                                isOther ? 'text-blue-800' : 'text-slate-800'
                              }`}
                            >
                              {holderName}
                            </span>
                            <span className="ml-1 text-[10px] text-slate-500">({holderRel})</span>
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold">
                            {j.bags}
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-600">
                            ₹{j.rate}
                          </td>
                          <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-blue-800 whitespace-nowrap">
                            {formatINR(j.jFormAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-blue-50/80 border-t-2 border-blue-200 font-bold text-blue-950">
                    <tr>
                      <td colSpan={4} className="py-2 px-2">
                        Total J-Forms
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {summary.totalJFormBags}
                      </td>
                      <td className="py-2 px-2 text-right">—</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatINR(summary.totalJFormAmount)}
                      </td>
                    </tr>
                    <tr className="bg-amber-50/80 border-t border-blue-200 text-[10.5px] text-slate-800">
                      <td colSpan={6} className="py-1.5 px-2">
                        Final Account J-Form Labour ({summary.totalArrivalBags} Total Arrival Bags × ₹{settings.jFormLaborRate}/bag):
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap">
                        -{formatINR(summary.totalJFormLabor)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {jFormHolderBreakdown.some((h) => h.relation !== 'Self') && (
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px]">
                    <div className="font-bold text-slate-700 mb-1">
                      Adjusted J-Form Name Summary (ਨਾਮ-ਵਾਰ ਜੇ-ਫਾਰਮ ਜੋੜ):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {jFormHolderBreakdown.map((h) => (
                        <div
                          key={h.key}
                          className="flex items-center justify-between bg-white border border-slate-200 rounded px-2 py-1"
                        >
                          <span className="font-medium text-slate-800">
                            {h.name}{' '}
                            <span className="text-[10px] text-slate-500">({h.relation})</span>
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-blue-800">
                            {h.bags}B · {formatINR(h.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* (+/-) Other Expenses & Payments Ledger */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">
              Other Expenses & Payments (+/-) ({summary.otherEntries.length})
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-slate-600">
              Added: +{formatINR(summary.totalOtherAdditions)} · Deducted: -
              {formatINR(summary.totalOtherDeductions)}
            </span>
          </div>

          {/* Inline Add/Edit Other Entry Form (hidden in print) */}
          <form
            onSubmit={handleOtherSubmit}
            className="print:hidden p-3 bg-slate-50/70 border-b border-slate-200 flex flex-col lg:flex-row lg:items-end gap-2.5"
          >
            <div className="w-full lg:w-36">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={otherDate}
                onChange={(e) => setOtherDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="w-full lg:w-52">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Entry Type (+/-)
              </label>
              <select
                value={otherType}
                onChange={(e) => setOtherType(e.target.value as 'add' | 'deduct')}
                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              >
                <option value="deduct">(-) Expense / Paid to Farmer</option>
                <option value="add">(+) Payment / Credit to Farmer</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Description (ਵੇਰਵਾ)
              </label>
              <input
                type="text"
                value={otherDesc}
                onChange={(e) => setOtherDesc(e.target.value)}
                placeholder="e.g. Cash Advance / Diesel / Payment Received..."
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="w-full lg:w-36">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={otherAmount}
                onChange={(e) => setOtherAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-bold border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingOtherId ? 'Update' : 'Add Entry'}</span>
              </button>
              {editingOtherId && (
                <button
                  type="button"
                  onClick={resetOtherForm}
                  className="p-1.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {otherError && (
            <div className="px-4 py-2 bg-rose-50 text-rose-800 text-xs font-medium border-b border-rose-200">
              {otherError}
            </div>
          )}

          {summary.otherEntries.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No other expenses or payments recorded for this farmer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold">#</th>
                    <th className="py-2 px-3 font-semibold">Date</th>
                    <th className="py-2 px-3 font-semibold">Type</th>
                    <th className="py-2 px-3 font-semibold">Description</th>
                    <th className="py-2 px-3 font-semibold text-right">Amount</th>
                    <th className="py-2 px-3 font-semibold text-right print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.otherEntries.map((o, idx) => (
                    <tr key={o.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">
                        {formatDateDMY(o.date)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            o.entryType === 'add' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {o.entryType === 'add' ? '(+) Credit' : '(-) Expense / Paid'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-800">{o.description}</td>
                      <td
                        className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${
                          o.entryType === 'add' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {o.entryType === 'add' ? '+' : '-'}
                        {formatINR(o.amount)}
                      </td>
                      <td className="py-2 px-3 text-right print:hidden">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditOther(o)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteOtherEntry(o)}
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
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
