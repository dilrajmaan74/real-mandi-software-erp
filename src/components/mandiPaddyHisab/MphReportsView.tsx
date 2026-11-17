import React, { useMemo, useRef, useState } from 'react';
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
  formatAdvanceMonthsDays,
  formatDateDMY,
  formatINR,
  formatLooseKgGm,
  formatRupeesInWords,
  formatWeightQKG,
  getAdvanceBreakdown,
  getEffectiveArrivalDryingRate,
  safeNum,
  safeStr,
  sumPaddyWeights,
} from '../../lib/mandiPaddyHisabUtils';
import { exportElementToPdf } from '../../lib/mandiPaddyHisabPdf';
import { Download, Loader2, MessageCircle, Printer } from 'lucide-react';
import { useMphLang } from '../../lib/mandiPaddyHisabI18n';
import { MphWhatsAppModal } from './MphWhatsAppModal';

interface MphReportsViewProps {
  farmers: MphFarmer[];
  arrivals: MphArrival[];
  jForms: MphJForm[];
  otherEntries: MphOtherEntry[];
  advances: MphAdvance[];
  settings: MphSettings;
}

type ReportType = 'farmer_ledger' | 'date_arrivals' | 'date_jforms' | 'all_balances';

export const MphReportsView: React.FC<MphReportsViewProps> = ({
  farmers,
  arrivals,
  jForms,
  otherEntries,
  advances,
  settings,
}) => {
  const { lang, tr } = useMphLang();
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportType, setReportType] = useState<ReportType>('farmer_ledger');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(farmers[0]?.id || 'all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [whatsappSummary, setWhatsappSummary] = useState<ReturnType<typeof computeFarmerAccountSummary> | null>(null);

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

  const activeFarmer = useMemo(
    () => farmers.find((f) => f.id === selectedFarmerId) || farmers[0] || null,
    [farmers, selectedFarmerId]
  );

  const farmerSummary = useMemo(() => {
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

  const driedRowsForReport = useMemo(() => {
    if (!farmerSummary) return [];
    return farmerSummary.arrivals
      .filter((a) => a && a.applyDryingLabor !== false && Math.floor(safeNum(a.bags)) > 0)
      .map((a) => {
        const bagsCount = Math.max(0, Math.floor(safeNum(a.bags)));
        const rate = getEffectiveArrivalDryingRate(a, farmerSummary.farmer, settings);
        return {
          id: a.id,
          date: a.date,
          paddyType: a.paddyType,
          bags: bagsCount,
          rate,
          amount: Math.round(bagsCount * rate * 100) / 100,
        };
      });
  }, [farmerSummary, settings]);

  const allSummaries = useMemo(
    () =>
      farmers
        .map((f) =>
          computeFarmerAccountSummary(f, arrivals, jForms, otherEntries, settings, advances)
        )
        .sort((a, b) => safeStr(a.farmer.name).localeCompare(safeStr(b.farmer.name))),
    [farmers, arrivals, jForms, otherEntries, settings, advances]
  );

  const dateFilteredArrivals = useMemo(() => {
    return [...arrivals]
      .filter((a) => {
        if (selectedFarmerId !== 'all' && a.farmerId !== selectedFarmerId) return false;
        if (fromDate && safeStr(a.date) < fromDate) return false;
        if (toDate && safeStr(a.date) > toDate) return false;
        return true;
      })
      .sort(
        (a, b) =>
          safeStr(a.date).localeCompare(safeStr(b.date)) ||
          safeStr(a.createdAt).localeCompare(safeStr(b.createdAt))
      );
  }, [arrivals, selectedFarmerId, fromDate, toDate]);

  const dateFilteredJForms = useMemo(() => {
    return [...jForms]
      .filter((j) => {
        if (selectedFarmerId !== 'all' && j.farmerId !== selectedFarmerId) return false;
        if (fromDate && safeStr(j.date) < fromDate) return false;
        if (toDate && safeStr(j.date) > toDate) return false;
        return true;
      })
      .sort(
        (a, b) =>
          safeStr(a.date).localeCompare(safeStr(b.date)) ||
          safeStr(a.createdAt).localeCompare(safeStr(b.createdAt))
      );
  }, [jForms, selectedFarmerId, fromDate, toDate]);

  const arrivalTotals = useMemo(() => {
    const weights = sumPaddyWeights(dateFilteredArrivals);
    const totalAmount =
      Math.round(
        dateFilteredArrivals.reduce((s, a) => s + (Number(a.paddyAmount) || 0), 0) * 100
      ) / 100;
    return { weights, totalAmount };
  }, [dateFilteredArrivals]);

  const jFormTotals = useMemo(() => {
    const bags = dateFilteredJForms.reduce((s, j) => s + (Number(j.bags) || 0), 0);
    const amount =
      Math.round(
        dateFilteredJForms.reduce((s, j) => s + (Number(j.jFormAmount) || 0), 0) * 100
      ) / 100;
    const labor = Math.round(bags * (Number(settings.jFormLaborRate) || 0) * 100) / 100;
    return { bags, amount, labor };
  }, [dateFilteredJForms, settings.jFormLaborRate]);

  const grandTotals = useMemo(() => {
    const bags = allSummaries.reduce((s, x) => s + x.totalArrivalBags, 0);
    const allWeights = sumPaddyWeights(arrivals);
    const paddyAmt =
      Math.round(allSummaries.reduce((s, x) => s + x.totalPaddyAmount, 0) * 100) / 100;
    const jFormAmt =
      Math.round(allSummaries.reduce((s, x) => s + x.totalJFormAmount, 0) * 100) / 100;
    const deductions =
      Math.round(allSummaries.reduce((s, x) => s + x.totalDeductions, 0) * 100) / 100;
    const advTotal =
      Math.round(allSummaries.reduce((s, x) => s + x.totalAdvanceWithInterest, 0) * 100) / 100;
    const netBalance = Math.round(allSummaries.reduce((s, x) => s + x.combinedFinalBalance, 0));
    return { bags, allWeights, paddyAmt, jFormAmt, deductions, advTotal, netBalance };
  }, [allSummaries, arrivals]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      await exportElementToPdf(
        reportRef.current,
        `Mandi_Paddy_Hisab_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`,
        reportType === 'farmer_ledger' || reportType === 'all_balances' ? 'landscape' : 'portrait'
      );
    } catch (err) {
      console.error('Report PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Report Selector */}
      <div className="print:hidden bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setReportType('farmer_ledger');
                if (selectedFarmerId === 'all' && farmers[0]) setSelectedFarmerId(farmers[0].id);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                reportType === 'farmer_ledger'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tr('Farmer-wise Complete Ledger', 'ਕਿਸਾਨ-ਵਾਰ ਪੂਰਾ ਖਾਤਾ')}
            </button>
            <button
              type="button"
              onClick={() => setReportType('date_arrivals')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                reportType === 'date_arrivals'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tr('Date-wise Paddy Arrival Report', 'ਤਾਰੀਖ-ਵਾਰ ਝੋਨਾ ਆਵਕ ਰਿਪੋਰਟ')}
            </button>
            <button
              type="button"
              onClick={() => setReportType('date_jforms')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                reportType === 'date_jforms'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tr('Date-wise J-Form Report', 'ਤਾਰੀਖ-ਵਾਰ ਜੇ-ਫਾਰਮ ਰਿਪੋਰਟ')}
            </button>
            <button
              type="button"
              onClick={() => setReportType('all_balances')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                reportType === 'all_balances'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tr('All Farmers Balance Sheet', 'ਸਾਰੇ ਕਿਸਾਨਾਂ ਦੀ ਬਕਾਇਆ ਸ਼ੀਟ')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {reportType === 'farmer_ledger' && farmerSummary && (
              <button
                type="button"
                onClick={() => setWhatsappSummary(farmerSummary)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer whitespace-nowrap"
                title={tr('Send Pura Hisab on WhatsApp', 'ਪੂਰਾ ਹਿਸਾਬ WhatsApp ਤੇ ਭੇਜੋ')}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{tr('WhatsApp Hisab', 'WhatsApp ਹਿਸਾਬ')}</span>
              </button>
            )}
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
              <span>{tr('Export PDF', 'PDF ਡਾਊਨਲੋਡ')}</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {reportType !== 'all_balances' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">{tr('Farmer:', 'ਕਿਸਾਨ:')}</span>
              <select
                value={
                  reportType === 'farmer_ledger' && activeFarmer
                    ? activeFarmer.id
                    : selectedFarmerId
                }
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                {reportType !== 'farmer_ledger' && (
                  <option value="all">{tr('All Farmers', 'ਸਾਰੇ ਕਿਸਾਨ')}</option>
                )}
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {`${safeStr(f.name, 'Farmer')}${f.village ? ` (${safeStr(f.village)})` : ''}`}
                  </option>
                ))}
              </select>
            </div>

            {reportType !== 'farmer_ledger' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">{tr('From:', 'ਤੋਂ:')}</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">{tr('To:', 'ਤੱਕ:')}</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                {(fromDate || toDate || selectedFarmerId !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setSelectedFarmerId('all');
                    }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    {tr('Clear Filters', 'ਫਿਲਟਰ ਹਟਾਓ')}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Printable Report Canvas */}
      <div
        key={`${reportType}_${activeFarmer?.id || 'all'}`}
        ref={reportRef}
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {tr('Mandi Paddy Hisab', 'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ')} —{' '}
              {reportType === 'farmer_ledger'
                ? tr('Farmer-wise Complete Ledger Report', 'ਕਿਸਾਨ-ਵਾਰ ਪੂਰਾ ਖਾਤਾ ਰਿਪੋਰਟ')
                : reportType === 'date_arrivals'
                ? tr('Date-wise Paddy Arrival Report', 'ਤਾਰੀਖ-ਵਾਰ ਝੋਨਾ ਆਵਕ ਰਿਪੋਰਟ')
                : reportType === 'date_jforms'
                ? tr('Date-wise J-Form Report', 'ਤਾਰੀਖ-ਵਾਰ ਜੇ-ਫਾਰਮ ਰਿਪੋਰਟ')
                : tr('All Farmers Final Balance Sheet', 'ਸਾਰੇ ਕਿਸਾਨਾਂ ਦੀ ਅੰਤਿਮ ਬਕਾਇਆ ਸ਼ੀਟ')}
            </h3>
            <p className="text-[11px] text-slate-500">
              {tr('Generated', 'ਤਿਆਰ ਕੀਤਾ')} {formatDateDMY(new Date().toISOString().split('T')[0])} ·{' '}
              {tr('Hybrid', 'ਹਾਈਬ੍ਰਿਡ')} ₹{settings.hybridPaddyRate}/{tr('Qtl', 'ਕੁਇੰਟਲ')} ·{' '}
              {tr('Grade A', 'ਏ ਗ੍ਰੇਡ')} ₹{settings.paddyAGurdeRate}/{tr('Qtl', 'ਕੁਇੰਟਲ')} ·{' '}
              {tr('J-Form Lab', 'ਜੇ-ਫਾਰਮ ਲੇਬਰ')} ₹{settings.jFormLaborRate}/{tr('bag', 'ਬੈਗ')} ·{' '}
              {tr('Drying Lab', 'ਸੁਕਾਈ ਲੇਬਰ')} ₹{settings.paddyDryingLaborRate}/{tr('bag', 'ਬੈਗ')}
            </p>
          </div>
        </div>

        {/* Report 1: Farmer-wise Complete Ledger */}
        {reportType === 'farmer_ledger' && (
          <>
            {!farmerSummary ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {tr('No farmers available to generate ledger report.', 'ਰਿਪੋਰਟ ਬਣਾਉਣ ਲਈ ਕੋਈ ਕਿਸਾਨ ਦਰਜ ਨਹੀਂ ਹੈ।')}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs">
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {farmerSummary.farmer.name}
                    </div>
                    <div className="text-slate-600">
                      {tr('Father:', 'ਪਿਤਾ:')} {farmerSummary.farmer.fatherName || '—'} ·{' '}
                      {tr('Village:', 'ਪਿੰਡ:')} {farmerSummary.farmer.village} ·{' '}
                      {tr('Mobile:', 'ਮੋਬਾਈਲ:')} {farmerSummary.farmer.mobile || '—'}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] text-slate-600 font-mono tabular-nums">
                      {tr('Paddy Bakaya:', 'ਝੋਨਾ ਬਕਾਇਆ:')}{' '}
                      {farmerSummary.finalBalance >= 0 ? '' : '-'}
                      {formatINR(Math.abs(farmerSummary.finalBalance), false)} ·{' '}
                      {tr('Adv (P+I):', 'ਪੇਸ਼ਗੀ (ਮੂਲ+ਵਿਆਜ):')} -
                      {formatINR(farmerSummary.totalAdvanceWithInterest)}
                      {(farmerSummary.totalAfterPaddyAdditions > 0 ||
                        farmerSummary.totalAfterPaddyDeductions > 0) && (
                        <>
                          {' '}
                          · {tr('After-Paddy:', 'ਹਿਸਾਬ ਤੋਂ ਬਾਅਦ:')}{' '}
                          {farmerSummary.totalAfterPaddyAdditions -
                            farmerSummary.totalAfterPaddyDeductions >=
                          0
                            ? '+'
                            : '-'}
                          {formatINR(
                            Math.abs(
                              farmerSummary.totalAfterPaddyAdditions -
                                farmerSummary.totalAfterPaddyDeductions
                            ),
                            false
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      ({tr('Paddy Bakaya:', 'ਝੋਨਾ ਬਕਾਇਆ:')} {formatRupeesInWords(farmerSummary.finalBalance, lang)})
                    </div>
                    <div className="font-bold text-sm font-mono tabular-nums mt-0.5">
                      {tr('Grand Final Balance:', 'ਅੰਤਿਮ ਕੁੱਲ ਬਕਾਇਆ:')}{' '}
                      {formatINR(Math.abs(farmerSummary.combinedFinalBalance), false)}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700">
                      {tr('In Words:', 'ਸ਼ਬਦਾਂ ਵਿੱਚ:')} {formatRupeesInWords(farmerSummary.combinedFinalBalance, lang)}
                    </div>
                    <div
                      className={`font-bold text-xs ${
                        farmerSummary.combinedBalanceStatus === 'payable'
                          ? 'text-emerald-700'
                          : farmerSummary.combinedBalanceStatus === 'receivable'
                          ? 'text-rose-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {farmerSummary.combinedBalanceStatus === 'payable'
                        ? tr('Farmer Nu Paise Dene Hai (Payable)', 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ (ਦੇਣਦਾਰ)')
                        : farmerSummary.combinedBalanceStatus === 'receivable'
                        ? tr('Farmer Paise Lene Hai (Receivable)', 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ (ਲੈਣਦਾਰ)')
                        : tr('Settled', 'ਹਿਸਾਬ ਬਰਾਬਰ')}
                    </div>
                  </div>
                </div>

                {/* Accounting Totals Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">
                      {tr('Bags & Weight', 'ਬੈਗ ਅਤੇ ਵਜ਼ਨ')}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {farmerSummary.totalArrivalBags} {tr('Bags', 'ਬੈਗ')} ·{' '}
                      {formatWeightQKG(
                        farmerSummary.weightQtlPart,
                        farmerSummary.weightKgPart,
                        farmerSummary.weightGmPart,
                        lang
                      )}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">
                      {tr('Total Paddy Amount', 'ਕੁੱਲ ਝੋਨੇ ਦੀ ਰਕਮ')}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-emerald-800">
                      {formatINR(farmerSummary.totalPaddyAmount)}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">
                      {tr('(-) J-Form Amount', '(-) ਜੇ-ਫਾਰਮ ਰਕਮ')}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-rose-700">
                      -{formatINR(farmerSummary.totalJFormAmount)}
                    </span>
                  </div>
                  <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-2.5">
                    <span className="text-blue-900 font-semibold block text-[11px]">
                      {tr('Paddy − J-Form Diff', 'ਝੋਨਾ − ਜੇ-ਫਾਰਮ ਫਰਕ')}
                    </span>
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        farmerSummary.paddyVsJFormDiff >= 0 ? 'text-blue-900' : 'text-rose-700'
                      }`}
                    >
                      {farmerSummary.paddyVsJFormDiff < 0 ? '-' : ''}
                      {formatINR(Math.abs(farmerSummary.paddyVsJFormDiff))}
                    </span>
                  </div>
                  <div className="border border-rose-200 bg-rose-50/40 rounded-lg p-2.5">
                    <span className="text-rose-950 font-semibold block text-[11px]">
                      {tr('(-) Total Labour (J-Form + Drying)', '(-) ਕੁੱਲ ਲੇਬਰ (ਜੇ-ਫਾਰਮ + ਸੁਕਾਈ)')}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-rose-800 block">
                      -{formatINR(Math.round((farmerSummary.totalJFormLabor + farmerSummary.totalDryingLabor) * 100) / 100)}
                    </span>
                    <span className="text-[10px] text-rose-800/80 font-mono tabular-nums block mt-0.5">
                      {formatINR(farmerSummary.totalJFormLabor)} + {formatINR(farmerSummary.totalDryingLabor)}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">
                      {tr('(+/-) Other (Paddy Hisab)', '(+/-) ਹੋਰ (ਝੋਨਾ ਹਿਸਾਬ)')}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-800">
                      {farmerSummary.totalOtherAdditions - farmerSummary.totalOtherDeductions >= 0
                        ? '+'
                        : '-'}
                      {formatINR(
                        Math.abs(
                          farmerSummary.totalOtherAdditions - farmerSummary.totalOtherDeductions
                        )
                      )}
                    </span>
                    {(farmerSummary.totalAfterPaddyAdditions > 0 ||
                      farmerSummary.totalAfterPaddyDeductions > 0) && (
                      <span className="text-[10px] text-indigo-800 font-mono tabular-nums block mt-0.5">
                        {tr('After-Paddy:', 'ਬਾਅਦ:')} {' '}
                        {farmerSummary.totalAfterPaddyAdditions -
                          farmerSummary.totalAfterPaddyDeductions >=
                        0
                          ? '+'
                          : '-'}
                        {formatINR(
                          Math.abs(
                            farmerSummary.totalAfterPaddyAdditions -
                              farmerSummary.totalAfterPaddyDeductions
                          ),
                          false
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Two-Side Ledger */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-950">
                      {tr('Paddy Arrival Ledger', 'ਝੋਨਾ ਆਵਕ ਖਾਤਾ')} ({farmerSummary.arrivals.length})
                    </div>
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">{tr('Date', 'ਤਾਰੀਖ')}</th>
                          <th className="py-1.5 px-2">{tr('Type', 'ਕਿਸਮ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Bags', 'ਬੈਗ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Weight', 'ਵਜ਼ਨ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Rate', 'ਰੇਟ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Amount', 'ਰਕਮ')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {farmerSummary.arrivals.map((a, idx) => (
                          <tr key={a.id}>
                            <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-mono">{formatDateDMY(a.date)}</td>
                            <td className="py-1.5 px-2">{trPaddyType(a.paddyType)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{a.bags}</td>
                            <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                              {formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart, lang)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono">
                              ₹{a.ratePerQuintal}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold">
                              {formatINR(a.paddyAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs font-bold text-blue-950">
                      {tr('J-Form Ledger', 'ਜੇ-ਫਾਰਮ ਖਾਤਾ')} ({farmerSummary.jForms.length})
                    </div>
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">{tr('Date', 'ਤਾਰੀਖ')}</th>
                          <th className="py-1.5 px-2">{tr('J-Form Name', 'ਜੇ-ਫਾਰਮ ਨਾਮ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Bags', 'ਬੈਗ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Rate', 'ਰੇਟ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('J-Form Amt', 'ਜੇ-ਫਾਰਮ ਰਕਮ')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {farmerSummary.jForms.map((j, idx) => (
                          <tr key={j.id}>
                            <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                              {formatDateDMY(j.date)}
                            </td>
                            <td className="py-1.5 px-2">
                              <span className="font-medium text-slate-800">
                                {j.jFormHolderName || j.farmerName}
                              </span>{' '}
                              <span className="text-[10px] text-slate-500">
                                ({trRelation(j.holderRelation || 'Self')})
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono">{j.bags}</td>
                            <td className="py-1.5 px-2 text-right font-mono">₹{j.rate}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold">
                              {formatINR(j.jFormAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-blue-50/80 border-t border-blue-200 font-bold text-blue-950">
                        <tr>
                          <td colSpan={3} className="py-1.5 px-2">
                            {tr('Total J-Forms', 'ਕੁੱਲ ਜੇ-ਫਾਰਮ')}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                            {farmerSummary.totalJFormBags}
                          </td>
                          <td className="py-1.5 px-2 text-right">—</td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                            {formatINR(farmerSummary.totalJFormAmount)}
                          </td>
                        </tr>
                        <tr className="bg-amber-50/80 border-t border-blue-200 text-[10.5px] text-slate-800">
                          <td colSpan={5} className="py-1.5 px-2">
                            {tr('Final Account J-Form Labour', 'ਅੰਤਿਮ ਹਿਸਾਬ ਜੇ-ਫਾਰਮ ਲੇਬਰ')} (
                            {farmerSummary.totalArrivalBags} {tr('Total Arrival Bags', 'ਕੁੱਲ ਆਵਕ ਬੈਗ')} × ₹
                            {settings.jFormLaborRate}/{tr('bag', 'ਬੈਗ')}):
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-rose-800">
                            -{formatINR(farmerSummary.totalJFormLabor)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Date-wise Paddy Drying Labour Bags List */}
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>
                      {tr(
                        'Paddy Drying Labour — Date-wise Dried Bags List',
                        'ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ — ਤਾਰੀਖ-ਵਾਰ ਸੁਕਾਏ ਬੈਗਾਂ ਦੀ ਸੂਚੀ'
                      )}{' '}
                      ({driedRowsForReport.length})
                    </span>
                    <span className="font-mono tabular-nums text-rose-800">
                      {farmerSummary.totalDryingBags} {tr('Bags', 'ਬੈਗ')} · -
                      {formatINR(farmerSummary.totalDryingLabor)}
                    </span>
                  </div>
                  {driedRowsForReport.length > 0 && (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">{tr('Date', 'ਤਾਰੀਖ')}</th>
                          <th className="py-1.5 px-2">{tr('Paddy Type', 'ਕਿਸਮ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Dried Bags', 'ਸੁਕਾਏ ਬੈਗ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Rate / Bag', 'ਰੇਟ / ਬੈਗ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Drying Amount', 'ਸੁਕਾਈ ਰਕਮ')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {driedRowsForReport.map((d, idx) => (
                          <tr key={d.id}>
                            <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-mono">{formatDateDMY(d.date)}</td>
                            <td className="py-1.5 px-2">{trPaddyType(d.paddyType)}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-semibold">{d.bags}</td>
                            <td className="py-1.5 px-2 text-right font-mono">₹{d.rate}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-700">
                              -{formatINR(d.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-amber-50/70 border-t border-amber-200 font-bold text-amber-950">
                        <tr>
                          <td colSpan={3} className="py-1.5 px-2">
                            {tr('Total Paddy Drying Labour', 'ਕੁੱਲ ਝੋਨਾ ਸੁਕਾਈ ਲੇਬਰ')}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono">
                            {farmerSummary.totalDryingBags}
                          </td>
                          <td className="py-1.5 px-2 text-right">—</td>
                          <td className="py-1.5 px-2 text-right font-mono text-rose-800">
                            -{formatINR(farmerSummary.totalDryingLabor)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* Advances & Interest Register in Complete Ledger Report */}
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>
                      {tr('Advances & Interest Ledger', 'ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਖਾਤਾ')} (
                      {farmerSummary.advances.length})
                    </span>
                    <span className="font-mono tabular-nums">
                      {tr('Principal:', 'ਮੂਲ:')} {formatINR(farmerSummary.totalAdvancePrincipal)} ·{' '}
                      {tr('Interest:', 'ਵਿਆਜ:')} {formatINR(farmerSummary.totalAdvanceInterest)} ·{' '}
                      {tr('Total:', 'ਕੁੱਲ:')} {formatINR(farmerSummary.totalAdvanceWithInterest)}
                    </span>
                  </div>
                  {farmerSummary.advances.length > 0 && (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">{tr('Purpose', 'ਵੇਰਵਾ')}</th>
                          <th className="py-1.5 px-2">{tr('Start → End Date', 'ਸ਼ੁਰੂ → ਅੰਤ ਤਾਰੀਖ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Days', 'ਦਿਨ')}</th>
                          <th className="py-1.5 px-2 whitespace-nowrap">
                            {tr('Months + Extra Days', 'ਮਹੀਨੇ + ਉੱਪਰ ਦਿਨ')}
                          </th>
                          <th className="py-1.5 px-2 text-right">{tr('Principal', 'ਮੂਲ ਰਕਮ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Rate', 'ਦਰ %')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Monthly Int.', 'ਮਹੀਨਾ ਵਿਆਜ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('1 Day Int.', '1 ਦਿਨ ਵਿਆਜ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Interest', 'ਵਿਆਜ')}</th>
                          <th className="py-1.5 px-2 text-right">{tr('Total (P+I)', 'ਕੁੱਲ (ਮੂਲ+ਵਿਆਜ)')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {farmerSummary.advances.map((adv, idx) => {
                          const bd = getAdvanceBreakdown(adv);
                          return (
                            <tr key={adv.id}>
                              <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-2 text-slate-800">{adv.purpose}</td>
                              <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                                {formatDateDMY(adv.startDate)} → {formatDateDMY(adv.endDate)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                {adv.days}{tr('d', ' ਦਿਨ')}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-amber-900 font-semibold whitespace-nowrap">
                                {formatAdvanceMonthsDays(bd.months, bd.extraDays, lang)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-semibold whitespace-nowrap">
                                {formatINR(adv.principalAmount)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono">
                                {adv.interestRateMonthly}%
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                {formatINR(bd.monthlyInterestAmount)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-blue-800 font-semibold whitespace-nowrap">
                                {formatINR(bd.perDayInterestAmount)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono text-amber-800 font-semibold whitespace-nowrap">
                                {formatINR(adv.interestAmount)}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                                {formatINR(adv.totalAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  <div className="px-3 py-2.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-mono tabular-nums">
                        {tr('Paddy Bakaya', 'ਝੋਨਾ ਬਕਾਇਆ')} ({farmerSummary.finalBalance >= 0 ? '' : '-'}
                        {formatINR(Math.abs(farmerSummary.finalBalance), false)}) −{' '}
                        {tr('Principal', 'ਮੂਲ')} ({formatINR(farmerSummary.totalAdvancePrincipal)}) −{' '}
                        {tr('Interest', 'ਵਿਆਜ')} ({formatINR(farmerSummary.totalAdvanceInterest)})
                        {(farmerSummary.totalAfterPaddyAdditions > 0 ||
                          farmerSummary.totalAfterPaddyDeductions > 0) && (
                          <>
                            {' '}
                            {farmerSummary.totalAfterPaddyAdditions -
                              farmerSummary.totalAfterPaddyDeductions >=
                            0
                              ? '+'
                              : '−'}{' '}
                            {tr('After-Paddy', 'ਹਿਸਾਬ ਤੋਂ ਬਾਅਦ')} (
                            {formatINR(
                              Math.abs(
                                farmerSummary.totalAfterPaddyAdditions -
                                  farmerSummary.totalAfterPaddyDeductions
                              )
                            )}
                            )
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {tr('Paddy Bakaya in Words:', 'ਝੋਨਾ ਬਕਾਇਆ ਸ਼ਬਦਾਂ ਵਿੱਚ:')}{' '}
                        {formatRupeesInWords(farmerSummary.finalBalance, lang)}
                      </div>
                    </div>
                    <div className="text-left sm:text-right space-y-0.5">
                      <div className="font-bold font-mono tabular-nums text-sm">
                        {tr('Grand Final Balance:', 'ਅੰਤਿਮ ਕੁੱਲ ਬਕਾਇਆ:')}{' '}
                        {formatINR(Math.abs(farmerSummary.combinedFinalBalance), false)}{' '}
                        <span className="text-[11px] font-sans">
                          (
                          {farmerSummary.combinedBalanceStatus === 'payable'
                            ? tr('Farmer Nu Paise Dene Hai / Payable', 'ਕਿਸਾਨ ਨੂੰ ਪੈਸੇ ਦੇਣੇ ਹਨ')
                            : farmerSummary.combinedBalanceStatus === 'receivable'
                            ? tr('Farmer Paise Lene Hai / Receivable', 'ਕਿਸਾਨ ਤੋਂ ਪੈਸੇ ਲੈਣੇ ਹਨ')
                            : tr('Settled', 'ਹਿਸਾਬ ਬਰਾਬਰ')}
                          )
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-200 font-semibold">
                        {tr('Grand Balance in Words:', 'ਅੰਤਿਮ ਬਕਾਇਆ ਸ਼ਬਦਾਂ ਵਿੱਚ:')}{' '}
                        {formatRupeesInWords(farmerSummary.combinedFinalBalance, lang)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Report 2: Date-wise Paddy Arrival Report */}
        {reportType === 'date_arrivals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">#</th>
                  <th className="py-2 px-2.5 font-semibold">{tr('Date', 'ਤਾਰੀਖ')}</th>
                  <th className="py-2 px-2.5 font-semibold">{tr('Farmer', 'ਕਿਸਾਨ')}</th>
                  <th className="py-2 px-2.5 font-semibold">{tr('Paddy Type', 'ਝੋਨੇ ਦੀ ਕਿਸਮ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Bags', 'ਬੈਗ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Loose KG/GM', 'ਖੁੱਲ੍ਹਾ ਕਿਲੋ/ਗ੍ਰਾਮ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Total Weight', 'ਕੁੱਲ ਵਜ਼ਨ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Rate', 'ਰੇਟ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Paddy Amount', 'ਝੋਨੇ ਦੀ ਰਕਮ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dateFilteredArrivals.map((a, idx) => (
                  <tr key={a.id}>
                    <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      {formatDateDMY(a.date)}
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-slate-900">{a.farmerName}</td>
                    <td className="py-2 px-2.5">{trPaddyType(a.paddyType)}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{a.bags}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatLooseKgGm(a.looseKg, a.looseGm, lang)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart, lang)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                      ₹{a.ratePerQuintal}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-emerald-800 whitespace-nowrap">
                      {formatINR(a.paddyAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={4} className="py-2.5 px-2.5">
                    {tr('Total', 'ਕੁੱਲ')} ({dateFilteredArrivals.length} {tr('Arrivals', 'ਆਵਕਾਂ')})
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {arrivalTotals.weights.totalBags}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatLooseKgGm(
                      arrivalTotals.weights.totalLooseKg,
                      arrivalTotals.weights.totalLooseGm,
                      lang
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatWeightQKG(
                      arrivalTotals.weights.weightQtlPart,
                      arrivalTotals.weights.weightKgPart,
                      arrivalTotals.weights.weightGmPart,
                      lang
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">—</td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-emerald-900 whitespace-nowrap">
                    {formatINR(arrivalTotals.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Report 3: Date-wise J-Form Report */}
        {reportType === 'date_jforms' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">#</th>
                  <th className="py-2 px-2.5 font-semibold">{tr('J-Form Date', 'ਜੇ-ਫਾਰਮ ਤਾਰੀਖ')}</th>
                  <th className="py-2 px-2.5 font-semibold">
                    {tr('Arrival Farmer / J-Form Name', 'ਆਵਕ ਕਿਸਾਨ / ਜੇ-ਫਾਰਮ ਨਾਮ')}
                  </th>
                  <th className="py-2 px-2.5 font-semibold">{tr('J-Form No.', 'ਜੇ-ਫਾਰਮ ਨੰ.')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Bags', 'ਬੈਗ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Rate', 'ਰੇਟ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('J-Form Amount', 'ਜੇ-ਫਾਰਮ ਰਕਮ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Labour Deduction', 'ਲੇਬਰ ਕਟੌਤੀ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dateFilteredJForms.map((j, idx) => (
                  <tr key={j.id}>
                    <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      {formatDateDMY(j.date)}
                    </td>
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-slate-900">{j.farmerName}</div>
                      <div className="text-[10.5px] text-blue-700">
                        {tr('J-Form:', 'ਜੇ-ਫਾਰਮ:')} {j.jFormHolderName || j.farmerName} (
                        {trRelation(j.holderRelation || 'Self')})
                      </div>
                    </td>
                    <td className="py-2 px-2.5 font-mono">{j.jFormNo || '—'}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{j.bags}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">₹{j.rate}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-blue-800 whitespace-nowrap">
                      {formatINR(j.jFormAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-rose-700 whitespace-nowrap">
                      -{formatINR(j.bags * settings.jFormLaborRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={4} className="py-2.5 px-2.5">
                    {tr('Total', 'ਕੁੱਲ')} ({dateFilteredJForms.length} {tr('J-Forms', 'ਜੇ-ਫਾਰਮ')})
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {jFormTotals.bags}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">—</td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-blue-900 whitespace-nowrap">
                    {formatINR(jFormTotals.amount)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap">
                    -{formatINR(jFormTotals.labor)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Report 4: All Farmers Balance Sheet */}
        {reportType === 'all_balances' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">#</th>
                  <th className="py-2 px-2.5 font-semibold">{tr('Farmer & Village', 'ਕਿਸਾਨ ਅਤੇ ਪਿੰਡ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Bags', 'ਬੈਗ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Weight (Qtl/KG/GM)', 'ਵਜ਼ਨ (ਕੁਇੰ./ਕਿਲੋ/ਗ੍ਰਾਮ)')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Paddy Amount', 'ਝੋਨੇ ਦੀ ਰਕਮ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('J-Form Amount', 'ਜੇ-ਫਾਰਮ ਰਕਮ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Total Deductions', 'ਕੁੱਲ ਕਟੌਤੀ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Adv (P+I)', 'ਪੇਸ਼ਗੀ (ਮੂਲ+ਵਿਆਜ)')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Final Balance', 'ਅੰਤਿਮ ਬਕਾਇਆ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right">{tr('Status', 'ਸਥਿਤੀ')}</th>
                  <th className="py-2 px-2.5 font-semibold text-right print:hidden">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allSummaries.map((s, idx) => (
                  <tr key={s.farmer.id}>
                    <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-slate-900">{s.farmer.name}</div>
                      <div className="text-[11px] text-slate-500">{s.farmer.village}</div>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                      {s.totalArrivalBags}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatWeightQKG(s.weightQtlPart, s.weightKgPart, s.weightGmPart, lang)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-semibold text-emerald-800 whitespace-nowrap">
                      {formatINR(s.totalPaddyAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-blue-800 whitespace-nowrap">
                      {formatINR(s.totalJFormAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-rose-700 whitespace-nowrap">
                      -{formatINR(s.totalDeductions)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-amber-800 whitespace-nowrap">
                      {s.totalAdvanceWithInterest > 0
                        ? `-${formatINR(s.totalAdvanceWithInterest)}`
                        : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                      {formatINR(Math.abs(s.combinedFinalBalance), false)}
                    </td>
                    <td className="py-2 px-2.5 text-right text-[11px] font-semibold whitespace-nowrap">
                      {s.combinedBalanceStatus === 'payable' ? (
                        <span className="text-emerald-700">
                          {tr('Nu Paise Dene Hai (Payable)', 'ਪੈਸੇ ਦੇਣੇ ਹਨ (ਦੇਣਦਾਰ)')}
                        </span>
                      ) : s.combinedBalanceStatus === 'receivable' ? (
                        <span className="text-rose-700">
                          {tr('Paise Lene Hai (Receivable)', 'ਪੈਸੇ ਲੈਣੇ ਹਨ (ਲੈਣਦਾਰ)')}
                        </span>
                      ) : (
                        <span className="text-slate-500">{tr('Settled', 'ਹਿਸਾਬ ਬਰਾਬਰ')}</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => setWhatsappSummary(s)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                        title={tr('Send Pura Hisab on WhatsApp', 'ਪੂਰਾ ਹਿਸਾਬ WhatsApp ਤੇ ਭੇਜੋ')}
                      >
                        <MessageCircle className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={2} className="py-2.5 px-2.5">
                    {tr('Grand Total', 'ਕੁੱਲ ਜੋੜ')} ({allSummaries.length} {tr('Farmers', 'ਕਿਸਾਨ')})
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {grandTotals.bags}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatWeightQKG(
                      grandTotals.allWeights.weightQtlPart,
                      grandTotals.allWeights.weightKgPart,
                      grandTotals.allWeights.weightGmPart,
                      lang
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-emerald-900 whitespace-nowrap">
                    {formatINR(grandTotals.paddyAmt)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-blue-900 whitespace-nowrap">
                    {formatINR(grandTotals.jFormAmt)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap">
                    -{formatINR(grandTotals.deductions)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-amber-900 whitespace-nowrap">
                    -{formatINR(grandTotals.advTotal)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatINR(Math.abs(grandTotals.netBalance), false)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-[11px]">
                    {grandTotals.netBalance >= 0
                      ? tr('Net Payable', 'ਕੁੱਲ ਦੇਣਦਾਰ')
                      : tr('Net Receivable', 'ਕੁੱਲ ਲੈਣਦਾਰ')}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <MphWhatsAppModal
        open={Boolean(whatsappSummary)}
        summary={whatsappSummary}
        settings={settings}
        statementElement={reportType === 'farmer_ledger' ? reportRef.current : null}
        onClose={() => setWhatsappSummary(null)}
      />
    </div>
  );
};
