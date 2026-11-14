import React, { useMemo, useRef, useState } from 'react';
import {
  MphAdvance,
  MphArrival,
  MphFarmer,
  MphInterestBasis,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../../types/mandiPaddyHisab';
import {
  calculateAdvanceDaysAndInterest,
  computeFarmerAccountSummary,
  formatDateDMY,
  formatINR,
  formatLooseKgGm,
  formatWeightQKG,
} from '../../lib/mandiPaddyHisabUtils';
import { exportElementToPdf } from '../../lib/mandiPaddyHisabPdf';
import {
  Calculator,
  Download,
  Edit3,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Percent,
  Plus,
  Printer,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';
import { useMphLang } from '../../lib/mandiPaddyHisabI18n';
import { MphWhatsAppModal } from './MphWhatsAppModal';

interface MphFarmerLedgerViewProps {
  farmers: MphFarmer[];
  arrivals: MphArrival[];
  jForms: MphJForm[];
  otherEntries: MphOtherEntry[];
  advances: MphAdvance[];
  settings: MphSettings;
  selectedFarmerId: string;
  onSelectFarmerId: (id: string) => void;
  onSaveOtherEntry: (entry: MphOtherEntry) => void;
  onDeleteOtherEntry: (entry: MphOtherEntry) => void;
  onSaveAdvance: (advance: MphAdvance) => void;
  onDeleteAdvance: (advance: MphAdvance) => void;
  onGoToArrivals: () => void;
  onGoToJForms: () => void;
  onGoToAdvances: () => void;
  onGoToFarmers: () => void;
}

const ADV_QUICK_RATES = ['0', '1', '1.5', '2'];

export const MphFarmerLedgerView: React.FC<MphFarmerLedgerViewProps> = ({
  farmers,
  arrivals,
  jForms,
  otherEntries,
  advances,
  settings,
  selectedFarmerId,
  onSelectFarmerId,
  onSaveOtherEntry,
  onDeleteOtherEntry,
  onSaveAdvance,
  onDeleteAdvance,
  onGoToArrivals,
  onGoToJForms,
  onGoToAdvances,
  onGoToFarmers,
}) => {
  const { lang, tr } = useMphLang();
  const today = new Date().toISOString().split('T')[0];
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const trPaddyType = (type: string) =>
    type === 'Hybrid Paddy'
      ? tr('Hybrid Paddy', 'ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ')
      : type === 'Paddy A Gurde'
      ? tr('Paddy A Gurde', 'ਝੋਨਾ ਏ ਗ੍ਰੇਡ')
      : type;

  const trRelation = (rel: string) => {
    switch (rel) {
      case 'Self':
        return tr('Self', 'ਖੁਦ');
      case 'Son':
        return tr('Son', 'ਪੁੱਤਰ');
      case 'Wife':
        return tr('Wife', 'ਪਤਨੀ');
      case 'Hissedar':
        return tr('Hissedar', 'ਹਿੱਸੇਦਾਰ');
      case 'Father':
        return tr('Father', 'ਪਿਤਾ');
      case 'Brother':
        return tr('Brother', 'ਭਰਾ');
      case 'Other':
        return tr('Other', 'ਹੋਰ');
      default:
        return rel;
    }
  };

  // Other expense / payment inline form state
  const [editingOtherId, setEditingOtherId] = useState<string | null>(null);
  const [otherDate, setOtherDate] = useState<string>(today);
  const [otherType, setOtherType] = useState<'add' | 'deduct'>('deduct');
  const [otherDesc, setOtherDesc] = useState<string>('');
  const [otherAmount, setOtherAmount] = useState<string>('');
  const [otherError, setOtherError] = useState<string | null>(null);

  // Advance & interest inline form state
  const [editingAdvId, setEditingAdvId] = useState<string | null>(null);
  const [advStartDate, setAdvStartDate] = useState<string>(today);
  const [advEndDate, setAdvEndDate] = useState<string>(today);
  const [advPurpose, setAdvPurpose] = useState<string>(
    lang === 'pa' ? 'ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਪੇਸ਼ਗੀ' : 'Pre-Season Advance'
  );
  const [advPrincipal, setAdvPrincipal] = useState<string>('');
  const [advRate, setAdvRate] = useState<string>('1.5');
  const [advBasis, setAdvBasis] = useState<MphInterestBasis>('daily_30');
  const [advInterestOverride, setAdvInterestOverride] = useState<string>('');
  const [advError, setAdvError] = useState<string | null>(null);

  const parsedAdvPrincipal = Math.max(0, Number(advPrincipal) || 0);
  const parsedAdvRate = Math.max(0, Number(advRate) || 0);

  const liveAdvCalc = useMemo(
    () =>
      calculateAdvanceDaysAndInterest(
        parsedAdvPrincipal,
        parsedAdvRate,
        advStartDate,
        advEndDate,
        advBasis
      ),
    [parsedAdvPrincipal, parsedAdvRate, advStartDate, advEndDate, advBasis]
  );

  const advPerDayInterest =
    Math.round((liveAdvCalc.monthlyInterestAmount / 30) * 100) / 100;

  const effectiveAdvInterest =
    advInterestOverride.trim() !== ''
      ? Math.max(0, Math.round((Number(advInterestOverride) || 0) * 100) / 100)
      : liveAdvCalc.interestAmount;

  const effectiveAdvTotal = Math.round((parsedAdvPrincipal + effectiveAdvInterest) * 100) / 100;

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
      settings,
      advances
    );
  }, [activeFarmer, arrivals, jForms, otherEntries, settings, advances]);

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
      setOtherError(tr('Please enter description.', 'ਕਿਰਪਾ ਕਰਕੇ ਵੇਰਵਾ ਲਿਖੋ।'));
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setOtherError(
        tr('Amount must be greater than 0.', 'ਰਕਮ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।')
      );
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

  const resetAdvForm = () => {
    setEditingAdvId(null);
    setAdvStartDate(today);
    setAdvEndDate(today);
    setAdvPurpose(lang === 'pa' ? 'ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਪੇਸ਼ਗੀ' : 'Pre-Season Advance');
    setAdvPrincipal('');
    setAdvRate('1.5');
    setAdvBasis('daily_30');
    setAdvInterestOverride('');
    setAdvError(null);
  };

  const handleEditAdv = (item: MphAdvance) => {
    setEditingAdvId(item.id);
    setAdvStartDate(item.startDate);
    setAdvEndDate(item.endDate);
    setAdvPurpose(item.purpose);
    setAdvPrincipal(String(item.principalAmount));
    setAdvRate(String(item.interestRateMonthly));
    setAdvBasis(item.interestBasis || 'daily_30');

    const recomputed = calculateAdvanceDaysAndInterest(
      item.principalAmount,
      item.interestRateMonthly,
      item.startDate,
      item.endDate,
      item.interestBasis || 'daily_30'
    );
    if (Math.abs(recomputed.interestAmount - item.interestAmount) > 0.01) {
      setAdvInterestOverride(String(item.interestAmount));
    } else {
      setAdvInterestOverride('');
    }
    setAdvError(null);
  };

  const handleAdvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarmer) return;
    setAdvError(null);

    if (!advStartDate || !advEndDate) {
      setAdvError(
        tr('Please enter Start and End dates.', 'ਕਿਰਪਾ ਕਰਕੇ ਸ਼ੁਰੂ ਅਤੇ ਅੰਤ ਤਾਰੀਖ ਦਰਜ ਕਰੋ।')
      );
      return;
    }
    if (advEndDate < advStartDate) {
      setAdvError(
        tr(
          'End Date cannot be before Start Date.',
          'ਅੰਤ ਤਾਰੀਖ ਸ਼ੁਰੂ ਤਾਰੀਖ ਤੋਂ ਪਹਿਲਾਂ ਨਹੀਂ ਹੋ ਸਕਦੀ।'
        )
      );
      return;
    }
    if (!advPurpose.trim()) {
      setAdvError(
        tr('Please enter purpose / description.', 'ਕਿਰਪਾ ਕਰਕੇ ਵੇਰਵਾ / ਕਿਸ ਕੰਮ ਲਈ ਲਿਖੋ।')
      );
      return;
    }
    if (parsedAdvPrincipal <= 0) {
      setAdvError(
        tr(
          'Principal amount must be greater than 0.',
          'ਮੂਲ ਰਕਮ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।'
        )
      );
      return;
    }

    const now = new Date().toISOString();
    const existing = editingAdvId ? advances.find((a) => a.id === editingAdvId) : null;

    onSaveAdvance({
      id: existing
        ? existing.id
        : `MPHA_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      farmerId: activeFarmer.id,
      farmerName: activeFarmer.name,
      startDate: advStartDate,
      endDate: advEndDate,
      days: liveAdvCalc.days,
      purpose: advPurpose.trim(),
      principalAmount: Math.round(parsedAdvPrincipal * 100) / 100,
      interestRateMonthly: Math.round(parsedAdvRate * 1000) / 1000,
      interestBasis: advBasis,
      monthlyInterestAmount: liveAdvCalc.monthlyInterestAmount,
      interestAmount: effectiveAdvInterest,
      totalAmount: effectiveAdvTotal,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    });
    resetAdvForm();
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
          {tr('No farmers registered in Mandi Paddy Hisab yet.', 'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ ਵਿੱਚ ਅਜੇ ਕੋਈ ਕਿਸਾਨ ਦਰਜ ਨਹੀਂ ਹੈ।')}
        </p>
        <p className="text-xs text-slate-500">
          {tr(
            'Add a farmer first to view their Final Account and Two-Side Ledgers.',
            'ਅੰਤਿਮ ਹਿਸਾਬ ਅਤੇ ਦੋ-ਪਾਸੜ ਖਾਤੇ ਦੇਖਣ ਲਈ ਪਹਿਲਾਂ ਕਿਸਾਨ ਜੋੜੋ।'
          )}
        </p>
        <button
          type="button"
          onClick={onGoToFarmers}
          className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          {tr('Go to Farmer Master', 'ਕਿਸਾਨ ਮਾਸਟਰ ਤੇ ਜਾਓ')}
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
            {tr('Select Farmer:', 'ਕਿਸਾਨ ਚੁਣੋ:')}
          </label>
          <select
            value={activeFarmer.id}
            onChange={(e) => {
              onSelectFarmerId(e.target.value);
              resetOtherForm();
              resetAdvForm();
            }}
            className="w-full sm:w-80 px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
          >
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} {f.fatherName ? `${tr('S/O', 'ਪੁੱਤਰ')} ${f.fatherName}` : ''} — {f.village}
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
            <span>{tr('+ Arrival', '+ ਝੋਨਾ ਆਵਕ')}</span>
          </button>
          <button
            type="button"
            onClick={onGoToJForms}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{tr('+ J-Form', '+ ਜੇ-ਫਾਰਮ')}</span>
          </button>
          <button
            type="button"
            onClick={onGoToAdvances}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer whitespace-nowrap"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>{tr('+ Advance', '+ ਪੇਸ਼ਗੀ')}</span>
          </button>
          <button
            type="button"
            onClick={() => setWhatsappOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
            title={tr('Send Pura Hisab on WhatsApp', 'ਪੂਰਾ ਹਿਸਾਬ WhatsApp ਤੇ ਭੇਜੋ')}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{tr('WhatsApp Hisab', 'WhatsApp ਹਿਸਾਬ')}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{tr('Print', 'ਪ੍ਰਿੰਟ')}</span>
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
            <span>{tr('Download PDF', 'PDF ਡਾਊਨਲੋਡ')}</span>
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
              {tr('Father:', 'ਪਿਤਾ:')} {activeFarmer.fatherName || '—'} ·{' '}
              {tr('Village:', 'ਪਿੰਡ:')} {activeFarmer.village} ·{' '}
              {tr('Mobile:', 'ਮੋਬਾਈਲ:')}{' '}
              <span className="font-mono">{activeFarmer.mobile || '—'}</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs font-bold text-slate-900">
              {tr('Mandi Paddy Hisab — Farmer Final Account', 'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ — ਕਿਸਾਨ ਅੰਤਿਮ ਖਾਤਾ')}
            </div>
            <div className="text-[11px] text-slate-500">
              {tr('Printed on', 'ਪ੍ਰਿੰਟ ਤਾਰੀਖ')} {formatDateDMY(new Date().toISOString().split('T')[0])}
            </div>
          </div>
        </div>

        {/* 6. Farmer Final Account Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                {tr('Farmer Final Account Calculation', 'ਕਿਸਾਨ ਅੰਤਿਮ ਹਿਸਾਬ ਵੇਰਵਾ')}
              </h3>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">
                    {tr('Total Paddy Amount', 'ਕੁੱਲ ਝੋਨੇ ਦੀ ਰਕਮ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalArrivalBags} {tr('Bags', 'ਗੱਟੇ')} ·{' '}
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
                  <span className="font-medium text-slate-800">
                    {tr('(-) J-Form Amount', '(-) ਜੇ-ਫਾਰਮ ਰਕਮ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalJFormBags} {tr('Bags across', 'ਗੱਟੇ')} · {summary.jForms.length}{' '}
                    {tr('J-Forms', 'ਜੇ-ਫਾਰਮ')}
                  </span>
                  {jFormHolderBreakdown.some((h) => h.relation !== 'Self') && (
                    <span className="text-[11px] text-blue-800 font-medium block mt-0.5">
                      {tr('Adjusted Holders:', 'ਸ਼ਾਮਲ ਜੇ-ਫਾਰਮ ਨਾਮ:')}{' '}
                      {jFormHolderBreakdown
                        .map(
                          (h) =>
                            `${h.name} (${trRelation(h.relation)}): ${h.bags}${tr('B', ' ਗੱਟੇ')} · ${formatINR(h.amount)}`
                        )
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
                  <span className="font-medium text-slate-800">
                    {tr('(-) J-Form Labour', '(-) ਜੇ-ਫਾਰਮ ਲੇਬਰ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalArrivalBags} {tr('Total Arrival Bags', 'ਕੁੱਲ ਆਵਕ ਗੱਟੇ')} × ₹
                    {settings.jFormLaborRate}/{tr('bag', 'ਗੱਟਾ')}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-rose-700">
                  -{formatINR(summary.totalJFormLabor)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">
                    {tr('(-) Paddy Drying Labour', '(-) ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {summary.totalDryingBags} {tr('Bags', 'ਗੱਟੇ')} × ₹{settings.paddyDryingLaborRate}/
                    {tr('bag', 'ਗੱਟਾ')}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-rose-700">
                  -{formatINR(summary.totalDryingLabor)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">
                    {tr('(+/-) Other Expenses or Payments', '(+/-) ਹੋਰ ਖਰਚੇ / ਅਦਾਇਗੀਆਂ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                    {tr('Added:', 'ਜਮ੍ਹਾਂ:')} +{formatINR(summary.totalOtherAdditions)} ·{' '}
                    {tr('Deducted:', 'ਕਟੌਤੀ:')} -{formatINR(summary.totalOtherDeductions)}
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
                {tr('Paddy Bakaya (Round Off)', 'ਝੋਨਾ ਬਕਾਇਆ (ਰਾਊਂਡ ਆਫ)')}
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums mt-2">
                {formatINR(Math.abs(summary.finalBalance), false)}
              </div>
              <div className="mt-2 text-sm font-bold">
                {summary.balanceStatus === 'payable' && (
                  <span>
                    {tr('Farmer Nu Paise Dene Hai (Payable)', 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ (ਦੇਣਦਾਰ)')}
                  </span>
                )}
                {summary.balanceStatus === 'receivable' && (
                  <span>
                    {tr('Farmer Paise Lene Hai (Receivable)', 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ (ਲੈਣਦਾਰ)')}
                  </span>
                )}
                {summary.balanceStatus === 'settled' && (
                  <span>{tr('Settled (No Balance Due)', 'ਹਿਸਾਬ ਬਰਾਬਰ (ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ)')}</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="opacity-70 block text-[11px]">
                  {tr('Total Paddy Amount', 'ਕੁੱਲ ਝੋਨੇ ਦੀ ਰਕਮ')}
                </span>
                <span className="font-mono tabular-nums font-bold">
                  {formatINR(summary.totalPaddyAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="opacity-70 block text-[11px]">
                  {tr('Total Deductions', 'ਕੁੱਲ ਕਟੌਤੀ')}
                </span>
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
                  {tr('LEFT: Paddy Arrival Ledger', 'ਖੱਬਾ: ਝੋਨਾ ਆਵਕ ਖਾਤਾ')} ({summary.arrivals.length})
                </h3>
                <p className="text-[10.5px] text-emerald-800">
                  {tr(
                    'Date-wise arrival · Paddy type · Bags · Loose KG/GM · Total weight · Rate · Amount',
                    'ਤਾਰੀਖ-ਵਾਰ ਆਵਕ · ਕਿਸਮ · ਗੱਟੇ · ਖੁੱਲ੍ਹਾ ਕਿਲੋ/ਗ੍ਰਾਮ · ਕੁੱਲ ਵਜ਼ਨ · ਰੇਟ · ਰਕਮ'
                  )}
                </p>
              </div>
            </div>
            {summary.arrivals.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {tr('No Paddy Arrivals for this farmer.', 'ਇਸ ਕਿਸਾਨ ਦੀ ਕੋਈ ਝੋਨਾ ਆਵਕ ਦਰਜ ਨਹੀਂ ਹੈ।')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2 font-semibold">#</th>
                      <th className="py-2 px-2 font-semibold">{tr('Date', 'ਤਾਰੀਖ')}</th>
                      <th className="py-2 px-2 font-semibold">{tr('Paddy Type', 'ਕਿਸਮ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('Bags', 'ਗੱਟੇ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('Loose', 'ਖੁੱਲ੍ਹਾ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('Total Weight', 'ਕੁੱਲ ਵਜ਼ਨ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('Rate', 'ਰੇਟ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('Total Amount', 'ਕੁੱਲ ਰਕਮ')}</th>
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
                          {trPaddyType(a.paddyType)}
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
                        {tr('Total Arrival', 'ਕੁੱਲ ਆਵਕ')}
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
                  {tr('RIGHT: J-Form Ledger', 'ਸੱਜਾ: ਜੇ-ਫਾਰਮ ਖਾਤਾ')} ({summary.jForms.length})
                </h3>
                <p className="text-[10.5px] text-blue-800">
                  {tr(
                    'J-Form date · No. · J-Form Name (Self/Son/Wife/Hissedar) · Bags · Rate · Amount',
                    'ਜੇ-ਫਾਰਮ ਤਾਰੀਖ · ਨੰ. · ਜੇ-ਫਾਰਮ ਨਾਮ (ਖੁਦ/ਪੁੱਤਰ/ਪਤਨੀ/ਹਿੱਸੇਦਾਰ) · ਗੱਟੇ · ਰੇਟ · ਰਕਮ'
                  )}
                </p>
              </div>
            </div>
            {summary.jForms.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {tr('No J-Form entries for this farmer.', 'ਇਸ ਕਿਸਾਨ ਦੀ ਕੋਈ ਜੇ-ਫਾਰਮ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ।')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2 font-semibold">#</th>
                      <th className="py-2 px-2 font-semibold">{tr('J-Form Date', 'ਤਾਰੀਖ')}</th>
                      <th className="py-2 px-2 font-semibold">{tr('No.', 'ਨੰ.')}</th>
                      <th className="py-2 px-2 font-semibold">{tr('J-Form Name', 'ਜੇ-ਫਾਰਮ ਨਾਮ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('Bags', 'ਗੱਟੇ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('Rate', 'ਰੇਟ')}</th>
                      <th className="py-2 px-2 font-semibold text-right">{tr('J-Form Amt', 'ਜੇ-ਫਾਰਮ ਰਕਮ')}</th>
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
                            <span className="ml-1 text-[10px] text-slate-500">
                              ({trRelation(holderRel)})
                            </span>
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
                        {tr('Total J-Forms', 'ਕੁੱਲ ਜੇ-ਫਾਰਮ')}
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
                        {tr('Final Account J-Form Labour', 'ਅੰਤਿਮ ਹਿਸਾਬ ਜੇ-ਫਾਰਮ ਲੇਬਰ')} (
                        {summary.totalArrivalBags} {tr('Total Arrival Bags', 'ਕੁੱਲ ਆਵਕ ਗੱਟੇ')} × ₹
                        {settings.jFormLaborRate}/{tr('bag', 'ਗੱਟਾ')}):
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
                      {tr('Adjusted J-Form Name Summary:', 'ਨਾਮ-ਵਾਰ ਜੇ-ਫਾਰਮ ਜੋੜ:')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {jFormHolderBreakdown.map((h) => (
                        <div
                          key={h.key}
                          className="flex items-center justify-between bg-white border border-slate-200 rounded px-2 py-1"
                        >
                          <span className="font-medium text-slate-800">
                            {h.name}{' '}
                            <span className="text-[10px] text-slate-500">
                              ({trRelation(h.relation)})
                            </span>
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-blue-800">
                            {h.bags}{tr('B', ' ਗੱਟੇ')} · {formatINR(h.amount)}
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
              {tr('Other Expenses & Payments (+/-)', 'ਹੋਰ ਖਰਚੇ ਅਤੇ ਅਦਾਇਗੀਆਂ (+/-)')} ({summary.otherEntries.length})
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-slate-600">
              {tr('Added:', 'ਜਮ੍ਹਾਂ:')} +{formatINR(summary.totalOtherAdditions)} ·{' '}
              {tr('Deducted:', 'ਕਟੌਤੀ:')} -{formatINR(summary.totalOtherDeductions)}
            </span>
          </div>

          {/* Inline Add/Edit Other Entry Form (hidden in print) */}
          <form
            onSubmit={handleOtherSubmit}
            className="print:hidden p-3 bg-slate-50/70 border-b border-slate-200 flex flex-col lg:flex-row lg:items-end gap-2.5"
          >
            <div className="w-full lg:w-36">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {tr('Date', 'ਤਾਰੀਖ')}
              </label>
              <input
                type="date"
                value={otherDate}
                onChange={(e) => setOtherDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="w-full lg:w-52">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {tr('Entry Type (+/-)', 'ਐਂਟਰੀ ਕਿਸਮ (+/-)')}
              </label>
              <select
                value={otherType}
                onChange={(e) => setOtherType(e.target.value as 'add' | 'deduct')}
                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              >
                <option value="deduct">
                  {tr('(-) Expense / Paid to Farmer', '(-) ਖਰਚ / ਕਿਸਾਨ ਨੂੰ ਦਿੱਤੇ')}
                </option>
                <option value="add">
                  {tr('(+) Payment / Credit to Farmer', '(+) ਜਮ੍ਹਾਂ / ਕਿਸਾਨ ਵੱਲੋਂ ਆਏ')}
                </option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {tr('Description', 'ਵੇਰਵਾ')}
              </label>
              <input
                type="text"
                value={otherDesc}
                onChange={(e) => setOtherDesc(e.target.value)}
                placeholder={tr(
                  'e.g. Cash Advance / Diesel / Payment Received...',
                  'ਜਿਵੇਂ ਨਕਦ / ਡੀਜ਼ਲ / ਅਦਾਇਗੀ ਪ੍ਰਾਪਤ...'
                )}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div className="w-full lg:w-36">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {tr('Amount (₹)', 'ਰਕਮ (₹)')}
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
                <span>{editingOtherId ? tr('Update', 'ਅੱਪਡੇਟ') : tr('Add Entry', 'ਜੋੜੋ')}</span>
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
              {tr(
                'No other expenses or payments recorded for this farmer.',
                'ਇਸ ਕਿਸਾਨ ਲਈ ਕੋਈ ਹੋਰ ਖਰਚਾ ਜਾਂ ਅਦਾਇਗੀ ਦਰਜ ਨਹੀਂ ਹੈ।'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold">#</th>
                    <th className="py-2 px-3 font-semibold">{tr('Date', 'ਤਾਰੀਖ')}</th>
                    <th className="py-2 px-3 font-semibold">{tr('Type', 'ਕਿਸਮ')}</th>
                    <th className="py-2 px-3 font-semibold">{tr('Description', 'ਵੇਰਵਾ')}</th>
                    <th className="py-2 px-3 font-semibold text-right">{tr('Amount', 'ਰਕਮ')}</th>
                    <th className="py-2 px-3 font-semibold text-right print:hidden">{tr('Actions', 'ਕਾਰਵਾਈ')}</th>
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
                          {o.entryType === 'add'
                            ? tr('(+) Credit', '(+) ਜਮ੍ਹਾਂ')
                            : tr('(-) Expense / Paid', '(-) ਖਰਚ / ਦਿੱਤੇ')}
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
                            title={tr('Edit', 'ਸੋਧੋ')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteOtherEntry(o)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title={tr('Delete', 'ਮਿਟਾਓ')}
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

        {/* Pre-Season Advances & Other Payments with Interest */}
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-xs font-bold text-amber-950">
                {tr(
                  'Pre-Season Advances & Other Payments with Interest',
                  'ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਪੇਸ਼ਗੀ ਅਤੇ ਹੋਰ ਅਦਾਇਗੀਆਂ (ਵਿਆਜ ਸਮੇਤ)'
                )}{' '}
                ({summary.advances.length})
              </h3>
              <p className="text-[10.5px] text-amber-800">
                {tr(
                  'Multiple amounts, independent start & end dates, auto days & custom monthly interest rates (1%, 1.5%, 2%, etc.)',
                  'ਵੱਖ-ਵੱਖ ਰਕਮਾਂ, ਸ਼ੁਰੂ ਅਤੇ ਅੰਤ ਤਾਰੀਖਾਂ, ਆਟੋ ਦਿਨ ਅਤੇ ਆਪਣੀ ਮਰਜ਼ੀ ਦੀ ਵਿਆਜ ਦਰ (1%, 1.5%, 2% ਆਦਿ)'
                )}
              </p>
            </div>
            <span className="text-[11px] font-mono tabular-nums font-semibold text-amber-950 whitespace-nowrap">
              {tr('Principal:', 'ਮੂਲ:')} {formatINR(summary.totalAdvancePrincipal)} ·{' '}
              {tr('Interest:', 'ਵਿਆਜ:')} {formatINR(summary.totalAdvanceInterest)}
            </span>
          </div>

          {/* Inline Add/Edit Advance & Interest Form (hidden in print) */}
          <form
            onSubmit={handleAdvSubmit}
            className="print:hidden p-3 bg-amber-50/40 border-b border-amber-200 space-y-2.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {tr('Purpose / Payment For', 'ਕਿਸ ਕੰਮ ਲਈ / ਵੇਰਵਾ')}
                </label>
                <input
                  type="text"
                  value={advPurpose}
                  onChange={(e) => setAdvPurpose(e.target.value)}
                  placeholder={tr(
                    'Pre-season advance, Diesel, Seed...',
                    'ਸੀਜ਼ਨ ਪੇਸ਼ਗੀ, ਡੀਜ਼ਲ, ਬੀਜ...'
                  )}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {tr('Principal (₹)', 'ਮੂਲ ਰਕਮ (₹)')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={advPrincipal}
                  onChange={(e) => {
                    setAdvPrincipal(e.target.value);
                    setAdvInterestOverride('');
                  }}
                  placeholder={tr('e.g. 100000', 'ਜਿਵੇਂ 100000')}
                  className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums font-bold border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {tr('Rate % / Month', 'ਵਿਆਜ ਦਰ % / ਮਹੀਨਾ')}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advRate}
                    onChange={(e) => {
                      setAdvRate(e.target.value);
                      setAdvInterestOverride('');
                    }}
                    className="w-20 px-2 py-1.5 text-xs font-mono tabular-nums font-bold border border-slate-300 rounded-lg bg-white"
                  />
                  <div className="flex items-center gap-1">
                    {ADV_QUICK_RATES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setAdvRate(r);
                          setAdvInterestOverride('');
                        }}
                        className={`px-1.5 py-1 text-[10px] font-mono font-bold rounded border cursor-pointer ${
                          advRate === r
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {tr('Start Date', 'ਪੇਸ਼ਗੀ ਤਾਰੀਖ')}
                </label>
                <input
                  type="date"
                  value={advStartDate}
                  onChange={(e) => {
                    setAdvStartDate(e.target.value);
                    setAdvInterestOverride('');
                  }}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {tr('End Date', 'ਅੰਤ ਤਾਰੀਖ')}
                </label>
                <input
                  type="date"
                  value={advEndDate}
                  onChange={(e) => {
                    setAdvEndDate(e.target.value);
                    setAdvInterestOverride('');
                  }}
                  className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={advBasis}
                  onChange={(e) => {
                    setAdvBasis(e.target.value as MphInterestBasis);
                    setAdvInterestOverride('');
                  }}
                  className="px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                >
                  <option value="daily_30">
                    {tr('Exact Days ÷ 30 Basis', 'ਕੁੱਲ ਦਿਨ ÷ 30 ਆਧਾਰ')}
                  </option>
                  <option value="monthly_30">
                    {tr('30-Day Month + Extra Days Basis', '30 ਦਿਨ ਮਹੀਨਾ + ਵਾਧੂ ਦਿਨ')}
                  </option>
                </select>
                <span className="inline-flex items-center gap-1 text-slate-700 font-mono">
                  <Calculator className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    {tr('Days:', 'ਦਿਨ:')} <strong>{liveAdvCalc.days}</strong>
                  </span>
                </span>
                <span className="text-slate-700 font-mono">
                  {tr('Monthly:', 'ਮਹੀਨਾ:')} <strong>{formatINR(liveAdvCalc.monthlyInterestAmount)}</strong>
                </span>
                <span className="text-slate-700 font-mono">
                  {tr('Per Day:', 'ਰੋਜ਼ਾਨਾ:')} <strong>{formatINR(advPerDayInterest)}</strong>
                </span>
                <span className="text-rose-800 font-mono">
                  {tr('Interest:', 'ਵਿਆਜ:')} <strong>{formatINR(effectiveAdvInterest)}</strong>
                </span>
                <span className="text-slate-900 font-mono">
                  {tr('Total P+I:', 'ਕੁੱਲ:')} <strong>{formatINR(effectiveAdvTotal)}</strong>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={advInterestOverride}
                  onChange={(e) => setAdvInterestOverride(e.target.value)}
                  placeholder={`${tr('Override Int', 'ਵਿਆਜ ਬਦਲੋ')} (${liveAdvCalc.interestAmount})`}
                  className="w-40 px-2 py-1 text-[11px] font-mono border border-amber-300 rounded bg-white"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {editingAdvId
                      ? tr('Update Advance', 'ਪੇਸ਼ਗੀ ਅੱਪਡੇਟ ਕਰੋ')
                      : tr('Add Advance & Interest', 'ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਜੋੜੋ')}
                  </span>
                </button>
                {editingAdvId && (
                  <button
                    type="button"
                    onClick={resetAdvForm}
                    className="p-1.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </form>

          {advError && (
            <div className="px-4 py-2 bg-rose-50 text-rose-800 text-xs font-medium border-b border-rose-200">
              {advError}
            </div>
          )}

          {summary.advances.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              {tr(
                'No pre-season advances or interest-bearing payments recorded for this farmer.',
                'ਇਸ ਕਿਸਾਨ ਲਈ ਕੋਈ ਪੇਸ਼ਗੀ ਜਾਂ ਵਿਆਜ ਵਾਲੀ ਅਦਾਇਗੀ ਦਰਜ ਨਹੀਂ ਹੈ।'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">#</th>
                    <th className="py-2 px-2.5 font-semibold">{tr('Purpose / Payment', 'ਵੇਰਵਾ / ਕਿਸ ਕੰਮ ਲਈ')}</th>
                    <th className="py-2 px-2.5 font-semibold">{tr('Start → End Date', 'ਸ਼ੁਰੂ → ਅੰਤ ਤਾਰੀਖ')}</th>
                    <th className="py-2 px-2.5 font-semibold text-right">{tr('Auto Days', 'ਕੁੱਲ ਦਿਨ')}</th>
                    <th className="py-2 px-2.5 font-semibold text-right">{tr('Principal', 'ਮੂਲ ਰਕਮ')}</th>
                    <th className="py-2 px-2.5 font-semibold text-right">{tr('Rate %/Mo', 'ਦਰ %/ਮਹੀਨਾ')}</th>
                    <th className="py-2 px-2.5 font-semibold text-right">{tr('Monthly Int.', 'ਮਹੀਨਾ ਵਿਆਜ')}</th>
                    <th className="py-2 px-2.5 font-semibold text-right">{tr('Interest', 'ਵਿਆਜ')}</th>
                    <th className="py-2 px-2.5 font-semibold text-right">{tr('Total (P+I)', 'ਕੁੱਲ (ਮੂਲ+ਵਿਆਜ)')}</th>
                    <th className="py-2 px-2.5 font-semibold text-right print:hidden">{tr('Actions', 'ਕਾਰਵਾਈ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.advances.map((adv, idx) => (
                    <tr key={adv.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2.5 font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 text-slate-800 font-medium">{adv.purpose}</td>
                      <td className="py-2 px-2.5 font-mono tabular-nums whitespace-nowrap text-slate-700">
                        {formatDateDMY(adv.startDate)} → {formatDateDMY(adv.endDate)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-700">
                        {adv.days} {tr('Days', 'ਦਿਨ')}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatINR(adv.principalAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-600">
                        {adv.interestRateMonthly}%
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {formatINR(adv.monthlyInterestAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-amber-800 whitespace-nowrap">
                        {formatINR(adv.interestAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                        {formatINR(adv.totalAmount)}
                      </td>
                      <td className="py-2 px-2.5 text-right print:hidden whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditAdv(adv)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title={tr('Edit', 'ਸੋਧੋ')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAdvance(adv)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title={tr('Delete', 'ਮਿਟਾਓ')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-amber-50/80 border-t-2 border-amber-200 font-bold text-amber-950">
                  <tr>
                    <td colSpan={4} className="py-2 px-2.5">
                      {tr('Total Advances', 'ਕੁੱਲ ਪੇਸ਼ਗੀਆਂ')} ({summary.advances.length} {tr('Entries', 'ਐਂਟਰੀਆਂ')})
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatINR(summary.totalAdvancePrincipal)}
                    </td>
                    <td colSpan={2}></td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-amber-900 whitespace-nowrap">
                      {formatINR(summary.totalAdvanceInterest)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap">
                      {formatINR(summary.totalAdvanceWithInterest)}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* LAST SECTION: Combined Final Settlement (Paddy Bakaya + Principal + Interest) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch pt-1">
          <div className="lg:col-span-7 border border-slate-300 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900 text-white">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                {tr(
                  'Combined Final Settlement: Paddy Bakaya + Principal & Interest',
                  'ਕੁੱਲ ਅੰਤਿਮ ਹਿਸਾਬ: ਝੋਨਾ ਬਕਾਇਆ + ਮੂਲ ਅਤੇ ਵਿਆਜ'
                )}
              </h3>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900">
                    {tr('1. Paddy Bakaya (Round Off)', '1. ਝੋਨਾ ਬਕਾਇਆ (ਰਾਊਂਡ ਆਫ)')}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {summary.balanceStatus === 'payable'
                      ? tr('Farmer Nu Paise Dene Hai (Paddy Payable)', 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ (ਝੋਨਾ ਬਕਾਇਆ)')
                      : summary.balanceStatus === 'receivable'
                      ? tr('Farmer Paise Lene Hai (Paddy Receivable)', 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ (ਝੋਨਾ ਬਕਾਇਆ)')
                      : tr('Paddy Account Settled', 'ਝੋਨੇ ਦਾ ਹਿਸਾਬ ਬਰਾਬਰ')}
                  </span>
                </div>
                <span
                  className={`font-mono tabular-nums font-bold text-sm ${
                    summary.finalBalance >= 0 ? 'text-emerald-800' : 'text-rose-700'
                  }`}
                >
                  {summary.finalBalance >= 0 ? '+' : '-'}
                  {formatINR(Math.abs(summary.finalBalance), false)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">
                    {tr('2. (-) Advance Principal Amount', '2. (-) ਕੁੱਲ ਮੂਲ ਰਕਮ (ਪੇਸ਼ਗੀ)')}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {tr('Across', 'ਕੁੱਲ')} {summary.advances.length}{' '}
                    {tr('advance / payment entries', 'ਪੇਸ਼ਗੀ / ਅਦਾਇਗੀ ਐਂਟਰੀਆਂ')}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-rose-700">
                  -{formatINR(summary.totalAdvancePrincipal)}
                </span>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">
                    {tr('3. (-) Advance Interest', '3. (-) ਕੁੱਲ ਵਿਆਜ')}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {tr(
                      'Auto-calculated on dates & custom rates',
                      'ਤਾਰੀਖਾਂ ਅਤੇ ਵਿਆਜ ਦਰ ਮੁਤਾਬਕ ਆਟੋ ਹਿਸਾਬ'
                    )}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-rose-700">
                  -{formatINR(summary.totalAdvanceInterest)}
                </span>
              </div>

              <div className="px-4 py-2.5 bg-amber-50/60 flex items-center justify-between">
                <span className="font-bold text-amber-950">
                  {tr('(=) Total Advance + Interest', '(=) ਕੁੱਲ ਪੇਸ਼ਗੀ + ਵਿਆਜ')}
                </span>
                <span className="font-mono tabular-nums font-bold text-rose-800">
                  -{formatINR(summary.totalAdvanceWithInterest)}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`lg:col-span-5 rounded-xl border-2 p-5 flex flex-col justify-between ${
              summary.combinedBalanceStatus === 'payable'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : summary.combinedBalanceStatus === 'receivable'
                ? 'bg-rose-50 border-rose-400 text-rose-950'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wide opacity-80">
                {tr('Grand Final Balance (Round Off)', 'ਅੰਤਿਮ ਕੁੱਲ ਬਕਾਇਆ (ਰਾਊਂਡ ਆਫ)')}
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums mt-2">
                {formatINR(Math.abs(summary.combinedFinalBalance), false)}
              </div>
              <div className="mt-2 text-sm font-bold">
                {summary.combinedBalanceStatus === 'payable' && (
                  <span>
                    {tr('Farmer Nu Paise Dene Hai (Payable)', 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ (ਦੇਣਦਾਰ)')}
                  </span>
                )}
                {summary.combinedBalanceStatus === 'receivable' && (
                  <span>
                    {tr('Farmer Paise Lene Hai (Receivable)', 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ (ਲੈਣਦਾਰ)')}
                  </span>
                )}
                {summary.combinedBalanceStatus === 'settled' && (
                  <span>{tr('Settled (No Balance Due)', 'ਹਿਸਾਬ ਬਰਾਬਰ (ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ)')}</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="opacity-70 block text-[11px]">
                  {tr('Paddy Bakaya', 'ਝੋਨਾ ਬਕਾਇਆ')}
                </span>
                <span className="font-mono tabular-nums font-bold">
                  {summary.finalBalance >= 0 ? '' : '-'}
                  {formatINR(Math.abs(summary.finalBalance), false)}
                </span>
              </div>
              <div className="text-right">
                <span className="opacity-70 block text-[11px]">
                  {tr('Principal + Interest', 'ਮੂਲ + ਵਿਆਜ')}
                </span>
                <span className="font-mono tabular-nums font-bold">
                  -{formatINR(summary.totalAdvanceWithInterest)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MphWhatsAppModal
        open={whatsappOpen}
        summary={summary}
        settings={settings}
        statementElement={printRef.current}
        onClose={() => setWhatsappOpen(false)}
      />
    </div>
  );
};
