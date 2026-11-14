import React, { useMemo } from 'react';
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
import {
  ArrowRight,
  BookOpen,
  FileSpreadsheet,
  FileText,
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
            Mandi Paddy Hisab Dashboard (ਮੰਡੀ ਝੋਨਾ ਹਿਸਾਬ ਡੈਸ਼ਬੋਰਡ)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hybrid ₹{settings.hybridPaddyRate}/Qtl · Paddy A Gurde ₹{settings.paddyAGurdeRate}/Qtl · J-Form Labour ₹{settings.jFormLaborRate}/bag · Drying Labour ₹{settings.paddyDryingLaborRate}/bag
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('farmers')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Farmer (ਕਿਸਾਨ)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('arrivals')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Wheat className="w-3.5 h-3.5" />
            <span>Paddy Arrival (ਆਵਕ)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('jforms')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>J-Form Entry (ਜੇ-ਫਾਰਮ)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('advances')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Advance & Interest</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reports & PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Farmers (ਕਿਸਾਨ)</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {farmers.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Registered in Paddy Hisab</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Arrival Weight (ਵਜ਼ਨ)</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-800 mt-1.5">
            {totalArrivalWeight.totalBags.toLocaleString('en-IN')} Bags
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
            <span>Total Paddy Amount</span>
            <Wheat className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatINR(totalPaddyAmount)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {arrivals.length} Arrival entries
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total J-Form Amount</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-blue-800 mt-1.5">
            {formatINR(totalJFormAmount)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
            {totalJFormBags.toLocaleString('en-IN')} Bags · {jForms.length} J-Forms
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Labour (ਲੇਬਰ)</span>
            <Settings className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-amber-800 mt-1.5">
            {formatINR(totalJFormLabor + totalDryingLabor)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-1">
            J-Form {formatINR(totalJFormLabor, false)} · Dry {formatINR(totalDryingLabor, false)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Net Balances (ਹਿਸਾਬ)</span>
            <BookOpen className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xs font-bold font-mono tabular-nums text-emerald-700 mt-1.5">
            Payable: {formatINR(totalPayableToFarmers, false)}
          </div>
          <div className="text-xs font-bold font-mono tabular-nums text-rose-700 mt-1">
            Receivable: {formatINR(totalReceivableFromFarmers, false)}
          </div>
          {(totalAdvancePrincipal > 0 || totalAdvanceInterest > 0) && (
            <div className="text-[10px] font-mono tabular-nums text-amber-800 mt-1">
              Adv P+I: {formatINR(totalAdvancePrincipal + totalAdvanceInterest, false)}
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
                Farmer Final Balance Summary (ਕਿਸਾਨ-ਵਾਰ ਅੰਤਿਮ ਹਿਸਾਬ)
              </h3>
              <p className="text-[11px] text-slate-500">
                Paddy Amount minus J-Form, Labour, Other Entries & Advances + Interest
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ledger')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Open Ledgers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {summaries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No farmers added in Mandi Paddy Hisab yet.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Start by adding your first farmer record to enter arrivals and J-Forms.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('farmers')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Farmer (ਪਹਿਲਾ ਕਿਸਾਨ ਜੋੜੋ)</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">Farmer (ਕਿਸਾਨ)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Bags</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Weight (Qtl/KG/GM)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Paddy Amt</th>
                    <th className="py-2.5 px-3 font-semibold text-right">J-Form + Lab</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Adv (P+I)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Final Balance</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
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
                            {s.farmer.fatherName ? `S/O ${s.farmer.fatherName} · ` : ''}
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
                              ? 'Dene Hai (Payable)'
                              : s.combinedBalanceStatus === 'receivable'
                              ? 'Lene Hai (Receivable)'
                              : 'Settled'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onNavigate('ledger', s.farmer.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          >
                            View Hisab
                          </button>
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
              Recent Arrivals (ਤਾਜ਼ਾ ਝੋਨਾ ਆਵਕ)
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('arrivals')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer whitespace-nowrap"
            >
              View All
            </button>
          </div>
          {recentArrivals.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No paddy arrival entries recorded yet.
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
                      {formatDateDMY(a.date)} · {a.paddyType} · {a.bags} Bags
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
    </div>
  );
};
