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
  formatDateDMY,
  formatINR,
  formatLooseKgGm,
  formatWeightQKG,
  sumPaddyWeights,
} from '../../lib/mandiPaddyHisabUtils';
import { exportElementToPdf } from '../../lib/mandiPaddyHisabPdf';
import { Download, Loader2, Printer } from 'lucide-react';

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
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportType, setReportType] = useState<ReportType>('farmer_ledger');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(farmers[0]?.id || 'all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

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

  const allSummaries = useMemo(
    () =>
      farmers
        .map((f) =>
          computeFarmerAccountSummary(f, arrivals, jForms, otherEntries, settings, advances)
        )
        .sort((a, b) => a.farmer.name.localeCompare(b.farmer.name)),
    [farmers, arrivals, jForms, otherEntries, settings, advances]
  );

  const dateFilteredArrivals = useMemo(() => {
    return [...arrivals]
      .filter((a) => {
        if (selectedFarmerId !== 'all' && a.farmerId !== selectedFarmerId) return false;
        if (fromDate && a.date < fromDate) return false;
        if (toDate && a.date > toDate) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  }, [arrivals, selectedFarmerId, fromDate, toDate]);

  const dateFilteredJForms = useMemo(() => {
    return [...jForms]
      .filter((j) => {
        if (selectedFarmerId !== 'all' && j.farmerId !== selectedFarmerId) return false;
        if (fromDate && j.date < fromDate) return false;
        if (toDate && j.date > toDate) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
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
              Farmer-wise Complete Ledger
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
              Date-wise Paddy Arrival Report
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
              Date-wise J-Form Report
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
              All Farmers Balance Sheet
            </button>
          </div>

          <div className="flex items-center gap-2">
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
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {reportType !== 'all_balances' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Farmer:</span>
              <select
                value={
                  reportType === 'farmer_ledger' && activeFarmer
                    ? activeFarmer.id
                    : selectedFarmerId
                }
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium"
              >
                {reportType !== 'farmer_ledger' && <option value="all">All Farmers</option>}
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.village})
                  </option>
                ))}
              </select>
            </div>

            {reportType !== 'farmer_ledger' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600">To:</span>
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
                    Clear Filters
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Printable Report Canvas */}
      <div ref={reportRef} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Mandi Paddy Hisab —{' '}
              {reportType === 'farmer_ledger'
                ? 'Farmer-wise Complete Ledger Report'
                : reportType === 'date_arrivals'
                ? 'Date-wise Paddy Arrival Report'
                : reportType === 'date_jforms'
                ? 'Date-wise J-Form Report'
                : 'All Farmers Final Balance Sheet'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Generated {formatDateDMY(new Date().toISOString().split('T')[0])} · Hybrid ₹
              {settings.hybridPaddyRate}/Qtl · Grade A ₹{settings.paddyAGurdeRate}/Qtl · J-Form Lab ₹
              {settings.jFormLaborRate}/bag · Drying Lab ₹{settings.paddyDryingLaborRate}/bag
            </p>
          </div>
        </div>

        {/* Report 1: Farmer-wise Complete Ledger */}
        {reportType === 'farmer_ledger' && (
          <>
            {!farmerSummary ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No farmers available to generate ledger report.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs">
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {farmerSummary.farmer.name}
                    </div>
                    <div className="text-slate-600">
                      Father: {farmerSummary.farmer.fatherName || '—'} · Village:{' '}
                      {farmerSummary.farmer.village} · Mobile: {farmerSummary.farmer.mobile || '—'}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] text-slate-600 font-mono tabular-nums">
                      Paddy Bakaya: {farmerSummary.finalBalance >= 0 ? '' : '-'}
                      {formatINR(Math.abs(farmerSummary.finalBalance), false)} · Adv (P+I): -
                      {formatINR(farmerSummary.totalAdvanceWithInterest)}
                    </div>
                    <div className="font-bold text-sm font-mono tabular-nums">
                      Grand Final Balance: {formatINR(Math.abs(farmerSummary.combinedFinalBalance), false)}
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
                        ? 'Farmer Nu Paise Dene Hai (Payable)'
                        : farmerSummary.combinedBalanceStatus === 'receivable'
                        ? 'Farmer Paise Lene Hai (Receivable)'
                        : 'Settled'}
                    </div>
                  </div>
                </div>

                {/* Accounting Totals Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">Bags & Weight</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {farmerSummary.totalArrivalBags} Bags ·{' '}
                      {formatWeightQKG(
                        farmerSummary.weightQtlPart,
                        farmerSummary.weightKgPart,
                        farmerSummary.weightGmPart
                      )}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">Total Paddy Amount</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-800">
                      {formatINR(farmerSummary.totalPaddyAmount)}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">(-) J-Form Amount</span>
                    <span className="font-mono tabular-nums font-bold text-rose-700">
                      -{formatINR(farmerSummary.totalJFormAmount)}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">
                      (-) Labour (J-Form {farmerSummary.totalArrivalBags} + Dry {farmerSummary.totalDryingBags} Bags)
                    </span>
                    <span className="font-mono tabular-nums font-bold text-rose-700">
                      -{formatINR(farmerSummary.totalJFormLabor + farmerSummary.totalDryingLabor)}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">(+/-) Other Net</span>
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
                  </div>
                </div>

                {/* Two-Side Ledger */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-950">
                      Paddy Arrival Ledger ({farmerSummary.arrivals.length})
                    </div>
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">Date</th>
                          <th className="py-1.5 px-2">Type</th>
                          <th className="py-1.5 px-2 text-right">Bags</th>
                          <th className="py-1.5 px-2 text-right">Weight</th>
                          <th className="py-1.5 px-2 text-right">Rate</th>
                          <th className="py-1.5 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {farmerSummary.arrivals.map((a, idx) => (
                          <tr key={a.id}>
                            <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2 font-mono">{formatDateDMY(a.date)}</td>
                            <td className="py-1.5 px-2">{a.paddyType}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{a.bags}</td>
                            <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                              {formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart)}
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
                      J-Form Ledger ({farmerSummary.jForms.length})
                    </div>
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">Date</th>
                          <th className="py-1.5 px-2">J-Form Name</th>
                          <th className="py-1.5 px-2 text-right">Bags</th>
                          <th className="py-1.5 px-2 text-right">Rate</th>
                          <th className="py-1.5 px-2 text-right">J-Form Amt</th>
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
                                ({j.holderRelation || 'Self'})
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
                          <td colSpan={3} className="py-1.5 px-2">Total J-Forms</td>
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
                            Final Account J-Form Labour ({farmerSummary.totalArrivalBags} Total Arrival Bags × ₹{settings.jFormLaborRate}/bag):
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono tabular-nums text-rose-800">
                            -{formatINR(farmerSummary.totalJFormLabor)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Advances & Interest Register in Complete Ledger Report */}
                <div className="border border-amber-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>Advances & Interest Ledger ({farmerSummary.advances.length})</span>
                    <span className="font-mono tabular-nums">
                      Principal: {formatINR(farmerSummary.totalAdvancePrincipal)} · Interest:{' '}
                      {formatINR(farmerSummary.totalAdvanceInterest)} · Total:{' '}
                      {formatINR(farmerSummary.totalAdvanceWithInterest)}
                    </span>
                  </div>
                  {farmerSummary.advances.length > 0 && (
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">Purpose</th>
                          <th className="py-1.5 px-2">Start → End Date</th>
                          <th className="py-1.5 px-2 text-right">Days</th>
                          <th className="py-1.5 px-2 text-right">Principal</th>
                          <th className="py-1.5 px-2 text-right">Rate</th>
                          <th className="py-1.5 px-2 text-right">Interest</th>
                          <th className="py-1.5 px-2 text-right">Total (P+I)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {farmerSummary.advances.map((adv, idx) => (
                          <tr key={adv.id}>
                            <td className="py-1.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-2 text-slate-800">{adv.purpose}</td>
                            <td className="py-1.5 px-2 font-mono whitespace-nowrap">
                              {formatDateDMY(adv.startDate)} → {formatDateDMY(adv.endDate)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono">{adv.days}d</td>
                            <td className="py-1.5 px-2 text-right font-mono font-semibold">
                              {formatINR(adv.principalAmount)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono">
                              {adv.interestRateMonthly}%
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-amber-800 font-semibold">
                              {formatINR(adv.interestAmount)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-700">
                              {formatINR(adv.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="px-3 py-2.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="font-mono tabular-nums">
                      Paddy Bakaya ({farmerSummary.finalBalance >= 0 ? '' : '-'}
                      {formatINR(Math.abs(farmerSummary.finalBalance), false)}) − Principal (
                      {formatINR(farmerSummary.totalAdvancePrincipal)}) − Interest (
                      {formatINR(farmerSummary.totalAdvanceInterest)})
                    </div>
                    <div className="font-bold font-mono tabular-nums text-sm">
                      Grand Final Balance: {formatINR(Math.abs(farmerSummary.combinedFinalBalance), false)}{' '}
                      <span className="text-[11px] font-sans">
                        (
                        {farmerSummary.combinedBalanceStatus === 'payable'
                          ? 'Farmer Nu Paise Dene Hai / Payable'
                          : farmerSummary.combinedBalanceStatus === 'receivable'
                          ? 'Farmer Paise Lene Hai / Receivable'
                          : 'Settled'}
                        )
                      </span>
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
                  <th className="py-2 px-2.5 font-semibold">Date</th>
                  <th className="py-2 px-2.5 font-semibold">Farmer</th>
                  <th className="py-2 px-2.5 font-semibold">Paddy Type</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Bags</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Loose KG/GM</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Total Weight</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Rate</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Paddy Amount</th>
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
                    <td className="py-2 px-2.5">{a.paddyType}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{a.bags}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatLooseKgGm(a.looseKg, a.looseGm)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart)}
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
                    Total ({dateFilteredArrivals.length} Arrivals)
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {arrivalTotals.weights.totalBags}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatLooseKgGm(
                      arrivalTotals.weights.totalLooseKg,
                      arrivalTotals.weights.totalLooseGm
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatWeightQKG(
                      arrivalTotals.weights.weightQtlPart,
                      arrivalTotals.weights.weightKgPart,
                      arrivalTotals.weights.weightGmPart
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
                  <th className="py-2 px-2.5 font-semibold">J-Form Date</th>
                  <th className="py-2 px-2.5 font-semibold">Arrival Farmer / J-Form Name</th>
                  <th className="py-2 px-2.5 font-semibold">J-Form No.</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Bags</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Rate</th>
                  <th className="py-2 px-2.5 font-semibold text-right">J-Form Amount</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Labour Deduction</th>
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
                        J-Form: {j.jFormHolderName || j.farmerName} ({j.holderRelation || 'Self'})
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
                    Total ({dateFilteredJForms.length} J-Forms)
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
                  <th className="py-2 px-2.5 font-semibold">Farmer & Village</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Bags</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Weight (Qtl/KG/GM)</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Paddy Amount</th>
                  <th className="py-2 px-2.5 font-semibold text-right">J-Form Amount</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Total Deductions</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Adv (P+I)</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Final Balance</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Status</th>
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
                      {formatWeightQKG(s.weightQtlPart, s.weightKgPart, s.weightGmPart)}
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
                        <span className="text-emerald-700">Nu Paise Dene Hai (Payable)</span>
                      ) : s.combinedBalanceStatus === 'receivable' ? (
                        <span className="text-rose-700">Paise Lene Hai (Receivable)</span>
                      ) : (
                        <span className="text-slate-500">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={2} className="py-2.5 px-2.5">
                    Grand Total ({allSummaries.length} Farmers)
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                    {grandTotals.bags}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatWeightQKG(
                      grandTotals.allWeights.weightQtlPart,
                      grandTotals.allWeights.weightKgPart,
                      grandTotals.allWeights.weightGmPart
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
                    {grandTotals.netBalance >= 0 ? 'Net Payable' : 'Net Receivable'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
