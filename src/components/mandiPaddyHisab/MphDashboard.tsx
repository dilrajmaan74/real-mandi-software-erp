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
  formatDateDMY,
  formatINR,
  formatWeightQKG,
  sumPaddyWeights,
} from '../../lib/mandiPaddyHisabUtils';
import { useMphLang } from '../../lib/mandiPaddyHisabI18n';
import { MphWhatsAppModal } from './MphWhatsAppModal';
import {
  ArrowRight,
  BookOpen,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Percent,
  Plus,
  Scale,
  Settings,
  Users,
  Wheat,
} from 'lucide-react';

export type MphTab =
  | 'dashboard'
  | 'farmers'
  | 'arrivals'
  | 'jforms'
  | 'advances'
  | 'ledger'
  | 'reports'
  | 'settings';

interface MphDashboardProps {
  farmers: MphFarmer[];
  arrivals: MphArrival[];
  jForms: MphJForm[];
  otherEntries: MphOtherEntry[];
  advances: MphAdvance[];
  settings: MphSettings;
  onNavigate: (tab: MphTab, farmerId?: string) => void;
}

export const MphDashboard: React.FC<MphDashboardProps> = ({
  farmers,
  arrivals,
  jForms,
  otherEntries,
  advances,
  settings,
  onNavigate,
}) => {
  const { tr } = useMphLang();
  const [whatsappSummary, setWhatsappSummary] = useState<ReturnType<typeof computeFarmerAccountSummary> | null>(null);
  const summaries = useMemo(() => {
    return farmers.map((f) =>
      computeFarmerAccountSummary(f, arrivals, jForms, otherEntries, settings, advances)
    );
  }, [farmers, arrivals, jForms, otherEntries, settings, advances]);

  const totalArrivalWeight = useMemo(() => sumPaddyWeights(arrivals), [arrivals]);
  const totalPaddyAmount = useMemo(
    () => Math.round(arrivals.reduce((s, a) => s + (Number(a.paddyAmount) || 0), 0) * 100) / 100,
    [arrivals]
  );

  const totalJFormBags = useMemo(
    () => jForms.reduce((s, j) => s + (Number(j.bags) || 0), 0),
    [jForms]
  );
  const totalJFormAmount = useMemo(
    () => Math.round(jForms.reduce((s, j) => s + (Number(j.jFormAmount) || 0), 0) * 100) / 100,
    [jForms]
  );

  const totalJFormLabor = useMemo(
    () =>
      Math.round(totalArrivalWeight.totalBags * (Number(settings.jFormLaborRate) || 0) * 100) / 100,
    [totalArrivalWeight.totalBags, settings.jFormLaborRate]
  );

  const totalDryingBags = useMemo(
    () =>
      arrivals
        .filter((a) => a.applyDryingLabor !== false)
        .reduce((s, a) => s + (Number(a.bags) || 0), 0),
    [arrivals]
  );
  const totalDryingLabor = useMemo(
    () => Math.round(totalDryingBags * (Number(settings.paddyDryingLaborRate) || 0) * 100) / 100,
    [totalDryingBags, settings.paddyDryingLaborRate]
  );

  const totalAdvancePrincipal = useMemo(
    () =>
      Math.round(advances.reduce((s, a) => s + (Number(a.principalAmount) || 0), 0) * 100) / 100,
    [advances]
  );
  const totalAdvanceInterest = useMemo(
    () =>
      Math.round(advances.reduce((s, a) => s + (Number(a.interestAmount) || 0), 0) * 100) / 100,
    [advances]
  );

  const totalPayableToFarmers = useMemo(
    () =>
      Math.round(
        summaries
          .filter((s) => s.combinedBalanceStatus === 'payable')
          .reduce((acc, s) => acc + s.combinedFinalBalance, 0)
      ),
    [summaries]
  );

  const totalReceivableFromFarmers = useMemo(
    () =>
      Math.round(
        summaries
          .filter((s) => s.combinedBalanceStatus === 'receivable')
          .reduce((acc, s) => acc + Math.abs(s.combinedFinalBalance), 0)
      ),
    [summaries]
  );

  const recentArrivals = useMemo(
    () =>
      [...arrivals]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [arrivals]
  );

  return (
    <div className="space-y-5">
      {/* Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {tr('Mandi Paddy Hisab Dashboard', 'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ ਡੈਸ਼ਬੋਰਡ')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {tr('Hybrid', 'ਹਾਈਬ੍ਰਿਡ')} ₹{settings.hybridPaddyRate}/{tr('Qtl', 'ਕੁਇੰਟਲ')} ·{' '}
            {tr('Paddy A Grade', 'ਝੋਨਾ A ਗ੍ਰੇਡ')} ₹{settings.paddyAGurdeRate}/{tr('Qtl', 'ਕੁਇੰਟਲ')} ·{' '}
            {tr('J-Form Labour', 'ਜੇ-ਫਾਰਮ ਲੇਬਰ')} ₹{settings.jFormLaborRate}/{tr('bag', 'ਗੱਟਾ')} ·{' '}
            {tr('Drying Labour', 'ਸੁਕਾਈ ਲੇਬਰ')} ₹{settings.paddyDryingLaborRate}/{tr('bag', 'ਗੱਟਾ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('farmers')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr('Add Farmer', 'ਨਵਾਂ ਕਿਸਾਨ')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('arrivals')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Wheat className="w-3.5 h-3.5" />
            <span>{tr('Paddy Arrival', 'ਝੋਨਾ ਆਵਕ')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('jforms')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{tr('J-Form Entry', 'ਜੇ-ਫਾਰਮ')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('advances')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>{tr('Advance & Interest', 'ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{tr('Reports & PDF', 'ਰਿਪੋਰਟਾਂ ਅਤੇ PDF')}</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{tr('Farmers', 'ਕਿਸਾਨ')}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {farmers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {tr('Registered in Paddy Hisab', 'ਝੋਨਾ ਹਿਸਾਬ ਵਿੱਚ ਦਰਜ')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{tr('Arrival Weight', 'ਆਵਕ ਵਜ਼ਨ')}</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-800 mt-1.5">
            {totalArrivalWeight.totalBags.toLocaleString('en-IN')} {tr('Bags', 'ਗੱਟੇ')}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-600 mt-1">
            {formatWeightQKG(
              totalArrivalWeight.weightQtlPart,
              totalArrivalWeight.weightKgPart,
              totalArrivalWeight.weightGmPart
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{tr('Total Paddy Amount', 'ਕੁੱਲ ਝੋਨਾ ਰਕਮ')}</span>
            <Wheat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatINR(totalPaddyAmount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {arrivals.length} {tr('Arrival entries', 'ਆਵਕ ਐਂਟਰੀਆਂ')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{tr('Total J-Form Amount', 'ਕੁੱਲ ਜੇ-ਫਾਰਮ ਰਕਮ')}</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-blue-800 mt-1.5">
            {formatINR(totalJFormAmount)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
            {totalJFormBags.toLocaleString('en-IN')} {tr('Bags', 'ਗੱਟੇ')} · {jForms.length}{' '}
            {tr('J-Forms', 'ਜੇ-ਫਾਰਮ')}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{tr('Total Labour', 'ਕੁੱਲ ਲੇਬਰ')}</span>
            <Settings className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-amber-800 mt-1.5">
            {formatINR(totalJFormLabor + totalDryingLabor)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
            {tr('J-Form', 'ਜੇ-ਫਾਰਮ')} {formatINR(totalJFormLabor, false)} · {tr('Dry', 'ਸੁਕਾਈ')}{' '}
            {formatINR(totalDryingLabor, false)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{tr('Net Balances', 'ਅੰਤਿਮ ਬਕਾਇਆ')}</span>
            <BookOpen className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xs font-bold font-mono tabular-nums text-emerald-700 mt-1.5">
            {tr('Payable', 'ਦੇਣਦਾਰ')}: {formatINR(totalPayableToFarmers, false)}
          </div>
          <div className="text-xs font-bold font-mono tabular-nums text-rose-700 mt-1">
            {tr('Receivable', 'ਲੈਣਦਾਰ')}: {formatINR(totalReceivableFromFarmers, false)}
          </div>
          {(totalAdvancePrincipal > 0 || totalAdvanceInterest > 0) && (
            <div className="text-[10px] font-mono tabular-nums text-amber-800 mt-1">
              {tr('Adv P+I', 'ਪੇਸ਼ਗੀ ਮੂਲ+ਵਿਆਜ')}:{' '}
              {formatINR(totalAdvancePrincipal + totalAdvanceInterest, false)}
            </div>
          )}
        </div>
      </div>

      {/* Main Summary Table + Recent Arrivals */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Farmer-wise Live Balance Overview */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {tr('Farmer Final Balance Summary', 'ਕਿਸਾਨ-ਵਾਰ ਅੰਤਿਮ ਹਿਸਾਬ ਵੇਰਵਾ')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {tr(
                  'Paddy Amount minus J-Form, Labour, Other Entries & Advances + Interest',
                  'ਝੋਨਾ ਰਕਮ ਵਿੱਚੋਂ ਜੇ-ਫਾਰਮ, ਲੇਬਰ, ਹੋਰ ਐਂਟਰੀਆਂ ਅਤੇ ਪੇਸ਼ਗੀ + ਵਿਆਜ ਘਟਾ ਕੇ'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ledger')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>{tr('Open Ledgers', 'ਖਾਤਾ ਖੋਲ੍ਹੋ')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {summaries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                {tr('No farmers added in Mandi Paddy Hisab yet.', 'ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ ਵਿੱਚ ਅਜੇ ਕੋਈ ਕਿਸਾਨ ਦਰਜ ਨਹੀਂ ਹੈ।')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {tr(
                  'Start by adding your first farmer record to enter arrivals and J-Forms.',
                  'ਆਵਕ ਅਤੇ ਜੇ-ਫਾਰਮ ਦਰਜ ਕਰਨ ਲਈ ਪਹਿਲਾਂ ਕਿਸਾਨ ਜੋੜੋ।'
                )}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('farmers')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tr('Add First Farmer', 'ਪਹਿਲਾ ਕਿਸਾਨ ਜੋੜੋ')}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">{tr('Farmer', 'ਕਿਸਾਨ')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{tr('Bags', 'ਗੱਟੇ')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{tr('Weight (Qtl/KG/GM)', 'ਵਜ਼ਨ (ਕੁਇੰ/ਕਿੱਲੋ/ਗ੍ਰਾਮ)')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{tr('Paddy Amt', 'ਝੋਨਾ ਰਕਮ')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{tr('J-Form + Lab', 'ਜੇ-ਫਾਰਮ + ਲੇਬਰ')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{tr('Adv (P+I)', 'ਪੇਸ਼ਗੀ (ਮੂਲ+ਵਿਆਜ)')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{tr('Final Balance', 'ਅੰਤਿਮ ਬਕਾਇਆ')}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{tr('Action', 'ਕਾਰਵਾਈ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaries.map((s, idx) => {
                    const jPlusLab = s.totalJFormAmount + s.totalJFormLabor + s.totalDryingLabor;
                    return (
                      <tr key={s.farmer.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{s.farmer.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {s.farmer.fatherName ? `${tr('S/O', 'ਪੁੱਤਰ')} ${s.farmer.fatherName} · ` : ''}
                            {s.farmer.village}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium">
                          {s.totalArrivalBags}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {formatWeightQKG(s.weightQtlPart, s.weightKgPart, s.weightGmPart)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-800">
                          {formatINR(s.totalPaddyAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {formatINR(jPlusLab)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-800 whitespace-nowrap">
                          {s.totalAdvanceWithInterest > 0
                            ? formatINR(s.totalAdvanceWithInterest, false)
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <div
                            className={`font-bold ${
                              s.combinedBalanceStatus === 'payable'
                                ? 'text-emerald-700'
                                : s.combinedBalanceStatus === 'receivable'
                                ? 'text-rose-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {formatINR(Math.abs(s.combinedFinalBalance), false)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {s.combinedBalanceStatus === 'payable'
                              ? tr('Payable (Dene Hai)', 'ਪੈਸੇ ਦੇਣੇ ਹਨ')
                              : s.combinedBalanceStatus === 'receivable'
                              ? tr('Receivable (Lene Hai)', 'ਪੈਸੇ ਲੈਣੇ ਹਨ')
                              : tr('Settled', 'ਬਰਾਬਰ')}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setWhatsappSummary(s)}
                              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                              title={tr('Send Pura Hisab on WhatsApp', 'ਪੂਰਾ ਹਿਸਾਬ WhatsApp ਤੇ ਭੇਜੋ')}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('ledger', s.farmer.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {tr('View Hisab', 'ਹਿਸਾਬ ਦੇਖੋ')}
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

        {/* Recent Paddy Arrivals */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              {tr('Recent Arrivals', 'ਤਾਜ਼ਾ ਝੋਨਾ ਆਵਕ')}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('arrivals')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer whitespace-nowrap"
            >
              {tr('View All', 'ਸਭ ਦੇਖੋ')}
            </button>
          </div>
          {recentArrivals.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {tr('No paddy arrival entries recorded yet.', 'ਅਜੇ ਕੋਈ ਝੋਨਾ ਆਵਕ ਦਰਜ ਨਹੀਂ ਹੈ।')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentArrivals.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {a.farmerName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatDateDMY(a.date)} · {a.paddyType} · {a.bags} {tr('Bags', 'ਗੱਟੇ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono tabular-nums text-emerald-800">
                      {formatINR(a.paddyAmount)}
                    </div>
                    <div className="text-[10px] font-mono tabular-nums text-slate-500">
                      {formatWeightQKG(a.weightQtlPart, a.weightKgPart, a.weightGmPart)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MphWhatsAppModal
        open={Boolean(whatsappSummary)}
        summary={whatsappSummary}
        settings={settings}
        onClose={() => setWhatsappSummary(null)}
      />
    </div>
  );
};
