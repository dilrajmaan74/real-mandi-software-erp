import React, { useState, useMemo } from 'react';
import { 
  FarmerMaster, 
  CropArrivalEntry, 
  BardanaEntry, 
  AgencyPurchaseEntry, 
  LiftingDispatchEntry,
  GoogleSheetConfig,
  ARHTIA_FIRMS 
} from '../types/mandi';
import { User } from 'firebase/auth';
import { 
  LayoutDashboard,
  Wheat, 
  Building2, 
  Truck, 
  Package, 
  Users, 
  Wallet, 
  Scale, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  PlusCircle, 
  FileText, 
  FileSpreadsheet, 
  Sparkles, 
  RefreshCw,
  Clock,
  MapPin,
  ShieldCheck,
  Eye,
  Trash2,
  ChevronRight
} from 'lucide-react';

interface DashboardModuleProps {
  farmers: FarmerMaster[];
  cropArrivals: CropArrivalEntry[];
  bardanaEntries: BardanaEntry[];
  agencyPurchases: AgencyPurchaseEntry[];
  liftingDispatches: LiftingDispatchEntry[];
  currentMandi: string;
  duplicateCount: number;
  onOpenDuplicateCleaner: () => void;
  onNavigateModule: (module: 'farmers' | 'arrivals' | 'bardana' | 'agency' | 'lifting' | 'letterpad' | 'ai_assistant') => void;
  onOpenLetterPad: () => void;
  onOpenSheetModal: () => void;
  onAddNewFarmer: () => void;
  sheetConfig: GoogleSheetConfig | null;
  cloudSyncActive: boolean;
  user: User | null;
}

type DateFilterType = 'all' | 'today' | 'last7';

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  farmers,
  cropArrivals,
  bardanaEntries,
  agencyPurchases,
  liftingDispatches,
  currentMandi,
  duplicateCount,
  onOpenDuplicateCleaner,
  onNavigateModule,
  onOpenLetterPad,
  onOpenSheetModal,
  onAddNewFarmer,
  sheetConfig,
  cloudSyncActive,
  user,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [recentTab, setRecentTab] = useState<'arrivals' | 'purchases' | 'lifting'>('arrivals');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered dataset according to active date filter
  const filteredArrivals = useMemo(() => {
    if (dateFilter === 'today') return cropArrivals.filter(a => a.date === todayStr);
    if (dateFilter === 'last7') return cropArrivals.filter(a => a.date >= sevenDaysAgoStr);
    return cropArrivals;
  }, [cropArrivals, dateFilter, todayStr, sevenDaysAgoStr]);

  const filteredPurchases = useMemo(() => {
    if (dateFilter === 'today') return agencyPurchases.filter(p => p.date === todayStr);
    if (dateFilter === 'last7') return agencyPurchases.filter(p => p.date >= sevenDaysAgoStr);
    return agencyPurchases;
  }, [agencyPurchases, dateFilter, todayStr, sevenDaysAgoStr]);

  const filteredLifting = useMemo(() => {
    if (dateFilter === 'today') return liftingDispatches.filter(l => (l.date_time || '').startsWith(todayStr));
    if (dateFilter === 'last7') return liftingDispatches.filter(l => (l.date_time || '').slice(0, 10) >= sevenDaysAgoStr);
    return liftingDispatches;
  }, [liftingDispatches, dateFilter, todayStr, sevenDaysAgoStr]);

  const filteredBardana = useMemo(() => {
    if (dateFilter === 'today') return bardanaEntries.filter(b => b.date === todayStr);
    if (dateFilter === 'last7') return bardanaEntries.filter(b => b.date >= sevenDaysAgoStr);
    return bardanaEntries;
  }, [bardanaEntries, dateFilter, todayStr, sevenDaysAgoStr]);

  // Overall calculations
  const totalArrivalBags = useMemo(() => filteredArrivals.reduce((sum, a) => sum + (Number(a.total_bags_arrived) || 0), 0), [filteredArrivals]);
  const totalArrivalQuintals = useMemo(() => filteredArrivals.reduce((sum, a) => sum + (Number(a.weight_quintals) || 0), 0), [filteredArrivals]);
  const arrivalTrolleyCount = useMemo(() => new Set(filteredArrivals.map(a => a.vehicle_trolley_no?.trim()).filter(Boolean)).size, [filteredArrivals]);

  const totalPurchasedBags = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.total_bags) || 0), 0), [filteredPurchases]);
  const totalPurchasedQuintals = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.weight_quintals) || 0), 0), [filteredPurchases]);
  const totalPurchasedAmount = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0), [filteredPurchases]);
  const totalNetPayable = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.net_payable) || 0), 0), [filteredPurchases]);
  const totalAdvancePaid = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.advance_paid) || 0), 0), [filteredPurchases]);

  // Labor Deductions
  const totalLaborExpense = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.j_form_labor_total) || 0), 0), [filteredPurchases]);
  const totalSukhiKiti = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.sukhi_kiti_total) || 0), 0), [filteredPurchases]);
  const totalDoublePakha = useMemo(() => filteredPurchases.reduce((sum, p) => sum + (Number(p.double_pakha_total) || 0), 0), [filteredPurchases]);
  const totalAllDeductions = totalLaborExpense + totalSukhiKiti + totalDoublePakha;

  // Lifting calculations
  const totalLiftedBags = useMemo(() => filteredLifting.reduce((sum, l) => sum + (Number(l.bags_lifted) || 0), 0), [filteredLifting]);
  const totalLiftedQuintals = useMemo(() => filteredLifting.reduce((sum, l) => sum + (Number(l.weight_quintals) || (Number(l.bags_lifted) * 0.375) || 0), 0), [filteredLifting]);
  const uniqueTrucksCount = useMemo(() => new Set(filteredLifting.map(l => l.truck_number?.trim()).filter(Boolean)).size, [filteredLifting]);
  
  // Pending bags in yard (Purchased bags minus Lifted bags, or directly from arrival)
  const pendingInYardBags = Math.max(0, totalPurchasedBags - totalLiftedBags);
  const liftingProgressPercent = totalPurchasedBags > 0 ? Math.min(100, Math.round((totalLiftedBags / totalPurchasedBags) * 100)) : 0;

  // Bardana Inventory Meter
  const bardanaReceived = useMemo(() => {
    return filteredBardana
      .filter(b => b.transaction_type?.startsWith('Received'))
      .reduce((sum, b) => sum + (Number(b.quantity_bags) || 0), 0);
  }, [filteredBardana]);

  const bardanaIssued = useMemo(() => {
    return filteredBardana
      .filter(b => b.transaction_type === 'Issued to Farmer')
      .reduce((sum, b) => sum + (Number(b.quantity_bags) || 0), 0);
  }, [filteredBardana]);

  const bardanaNetBalance = bardanaReceived - bardanaIssued;

  // Firm 1 vs Firm 2 Breakdown
  const firm1Name = ARHTIA_FIRMS[0]?.name || 'JAMMU TRADING CO.';
  const firm2Name = ARHTIA_FIRMS[1]?.name || 'NEW JAMMU TRADING CO.';

  const firm1Purchases = useMemo(() => filteredPurchases.filter(p => p.firm_name?.toUpperCase().includes('NEW') === false && (p.firm_name?.toUpperCase().includes('JAMMU') || p.firm_id === ARHTIA_FIRMS[0]?.id)), [filteredPurchases, ARHTIA_FIRMS]);
  const firm2Purchases = useMemo(() => filteredPurchases.filter(p => p.firm_name?.toUpperCase().includes('NEW') || p.firm_id === ARHTIA_FIRMS[1]?.id), [filteredPurchases, ARHTIA_FIRMS]);

  const firm1Stats = useMemo(() => {
    const bags = firm1Purchases.reduce((s, p) => s + (Number(p.total_bags) || 0), 0);
    const quintals = firm1Purchases.reduce((s, p) => s + (Number(p.weight_quintals) || 0), 0);
    const amount = firm1Purchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const lifting = filteredLifting.filter(l => l.firm_name?.toUpperCase().includes('NEW') === false && l.firm_name?.toUpperCase().includes('JAMMU'));
    const liftedBags = lifting.reduce((s, l) => s + (Number(l.bags_lifted) || 0), 0);
    return {
      bags,
      quintals,
      amount,
      liftedBags,
      pendingBags: Math.max(0, bags - liftedBags),
      count: firm1Purchases.length,
    };
  }, [firm1Purchases, filteredLifting]);

  const firm2Stats = useMemo(() => {
    const bags = firm2Purchases.reduce((s, p) => s + (Number(p.total_bags) || 0), 0);
    const quintals = firm2Purchases.reduce((s, p) => s + (Number(p.weight_quintals) || 0), 0);
    const amount = firm2Purchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const lifting = filteredLifting.filter(l => l.firm_name?.toUpperCase().includes('NEW'));
    const liftedBags = lifting.reduce((s, l) => s + (Number(l.bags_lifted) || 0), 0);
    return {
      bags,
      quintals,
      amount,
      liftedBags,
      pendingBags: Math.max(0, bags - liftedBags),
      count: firm2Purchases.length,
    };
  }, [firm2Purchases, filteredLifting]);

  // Agency Procurement Breakdown
  const agencyList = [
    { key: 'pungrain', name: 'Pungrain (ਪਨਗਰੇਨ)', color: 'from-blue-600 to-blue-700' },
    { key: 'markfed', name: 'Markfed (ਮਾਰਕਫੈੱਡ)', color: 'from-amber-600 to-amber-700' },
    { key: 'punsup', name: 'Punsup (ਪਨਸਪ)', color: 'from-emerald-600 to-emerald-700' },
    { key: 'pswc', name: 'PSWC / Warehouse (ਵੇਅਰਹਾਊਸ)', color: 'from-indigo-600 to-indigo-700' },
    { key: 'fci', name: 'FCI (ਐੱਫ.ਸੀ.ਆਈ.)', color: 'from-rose-600 to-rose-700' },
  ];

  const agencyBreakdown = useMemo(() => {
    return agencyList.map(agency => {
      const matchPurchases = filteredPurchases.filter(p => 
        (p.purchasing_agency || '').toLowerCase().includes(agency.key)
      );
      const bags = matchPurchases.reduce((s, p) => s + (Number(p.total_bags) || 0), 0);
      const quintals = matchPurchases.reduce((s, p) => s + (Number(p.weight_quintals) || 0), 0);
      const amount = matchPurchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);

      const matchLifting = filteredLifting.filter(l => 
        (l.purchasing_agency || '').toLowerCase().includes(agency.key)
      );
      const liftedBags = matchLifting.reduce((s, l) => s + (Number(l.bags_lifted) || 0), 0);

      return {
        ...agency,
        bags,
        quintals,
        amount,
        liftedBags,
        pendingBags: Math.max(0, bags - liftedBags),
        entriesCount: matchPurchases.length,
      };
    });
  }, [filteredPurchases, filteredLifting]);

  // Unique villages count
  const villagesCount = useMemo(() => {
    const list = new Set<string>();
    farmers.forEach(f => {
      if (f.village_en) list.add(f.village_en.trim().toLowerCase());
      if (f.village_pa) list.add(f.village_pa.trim().toLowerCase());
    });
    return list.size;
  }, [farmers]);

  // Format currency in Indian Lakhs/Crores
  const formatIndianCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lakh`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Mandi Title, Yard Location & Date Filter Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-emerald-700/50 relative overflow-hidden">
        {/* Subtle decorative background wheat graphics */}
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-6 opacity-10 pointer-events-none">
          <Wheat className="w-64 h-64 text-amber-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-emerald-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>ਮੁੱਖ ਕੰਟਰੋਲ ਡੈਸ਼ਬੋਰਡ (Live Mandi Dashboard)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-medium border border-emerald-600/60 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-300" />
                <span>{currentMandi}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-xs font-medium border border-emerald-600/60 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-300" />
                <span>ਲਾਈਵ ਸੀਜ਼ਨ 2025-26 (ਝੋਨਾ / ਪੈਡੀ)</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>JAMMU TRADING CO. & NEW JAMMU TRADING CO.</span>
            </h1>
            <p className="text-emerald-200 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
              ਮੰਡੀ ਆਵਕ, ਸਰਕਾਰੀ ਬੋਲੀ ਤੇ ਖਰੀਦ, ਬਾਰਦਾਨਾ ਲੇਖਾ-ਜੋਖਾ, ਲਿਫਟਿੰਗ ਚਲਾਨ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀਆਂ ਦਾ ਇਕੱਠਾ ਲਾਈਵ ਹਿਸਾਬ-ਕਿਤਾਬ।
            </p>
          </div>

          {/* Quick Date Range Filter */}
          <div className="flex items-center gap-2 bg-emerald-950/60 p-1.5 rounded-2xl border border-emerald-600/50 self-start md:self-auto shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              ਸਾਰਾ ਸੀਜ਼ਨ (All Time)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dateFilter === 'today'
                  ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ਅੱਜ ਦਾ ਦਿਨ (Today)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('last7')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === 'last7'
                  ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              ਪਿਛਲੇ 7 ਦਿਨ (7 Days)
            </button>
          </div>
        </div>

        {/* Live Status Indicators strip */}
        <div className="mt-5 pt-4 border-t border-emerald-700/50 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-200 font-medium">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-white font-bold">ਸਿਸਟਮ ਸਥਿਤੀ:</span> ਲਾਈਵ ਤੇ ਸਰਗਰਮ
            </span>
            <span className="hidden sm:inline text-emerald-600">|</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>ਲਾਈਸੰਸ: JAL/LKH/133 & JAL/LKH/239</span>
            </span>
            <span className="hidden sm:inline text-emerald-600">|</span>
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-amber-300" />
              <span>ਸਰਕਾਰੀ MSP ਰੇਟ: <b className="text-amber-300 font-mono">₹2,461 / ਕੁਇੰਟਲ</b></span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cloudSyncActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700/70 text-emerald-100 rounded-full text-[11px] font-bold border border-emerald-500/50">
                <CheckCircle2 className="w-3 h-3 text-amber-300" />
                ਕਲਾਊਡ ਸਿੰਕ ਐਕਟਿਵ (Cloud Live)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-200 rounded-full text-[11px] font-bold border border-amber-400/30">
                ਲੋਕਲ ਮੋਡ (ਸਿਰਫ਼ ਲੈਪਟਾਪ)
              </span>
            )}

            {sheetConfig && (
              <button 
                type="button"
                onClick={onOpenSheetModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700/70 hover:bg-emerald-600 text-emerald-100 rounded-full text-[11px] font-bold border border-emerald-500/50 transition cursor-pointer"
                title={sheetConfig.spreadsheetTitle}
              >
                <FileSpreadsheet className="w-3 h-3 text-amber-300" />
                ਗੂਗਲ ਸ਼ੀਟ ਕਨੈਕਟਡ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate Alert Banner (if duplicate entries found anywhere) */}
      {duplicateCount > 0 ? (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0 animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950 text-sm sm:text-base flex items-center gap-2">
                <span>ਸਾਫਟਵੇਅਰ ਵਿੱਚ {duplicateCount} ਡੁਪਲੀਕੇਟ ਐਂਟਰੀਆਂ ਮਿਲੀਆਂ ਹਨ! (Duplicate Data Alert)</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-mono font-bold">
                  ਧਿਆਨ ਦਿਓ
                </span>
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">
                ਇੱਕੋ ਕਿਸਾਨ ਦੀ ਆਵਕ, ਸਰਕਾਰੀ ਖਰੀਦ ਜਾਂ ਆਧਾਰ ਕਾਰਡ ਦੋ ਵਾਰ ਦਰਜ ਹੋ ਗਿਆ ਹੈ। 1-ਕਲਿੱਕ ਨਾਲ ਇਨ੍ਹਾਂ ਨੂੰ ਚੈੱਕ ਤੇ ਸਾਫ਼ ਕਰੋ।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDuplicateCleaner}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <Trash2 className="w-4 h-4 text-amber-200" />
            <span>ਡੁਪਲੀਕੇਟ ਸਾਫ਼ ਕਰੋ (Open Cleaner)</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">
              <b>ਸਾਰਾ ਡਾਟਾ ਬਿਲਕੁਲ ਸਾਫ਼ ਹੈ:</b> ਸਾਫਟਵੇਅਰ ਵਿੱਚ ਕੋਈ ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ, ਆਵਕ ਜਾਂ ਖਰੀਦ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenDuplicateCleaner}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0"
          >
            ਮੁੜ ਜਾਂਚ ਕਰੋ (Scan Again)
          </button>
        </div>
      )}

      {/* 6 Top Primary Mandi Operation KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* KPI 1: Crop Arrival (ਆਵਕ) */}
        <div 
          onClick={() => onNavigateModule('arrivals')}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ਕੁਲ ਆਵਕ (Arrival)</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-100 transition">
                <Wheat className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
              {totalArrivalBags.toLocaleString()} <span className="text-xs font-normal text-gray-500">ਗੱਟੇ</span>
            </div>
            <div className="text-xs font-bold text-amber-800 mt-1 font-mono">
              {totalArrivalQuintals.toFixed(1)} ਕੁਇੰਟਲ
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>{arrivalTrolleyCount} ਟਰਾਲੀਆਂ</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* KPI 2: Agency Purchase (ਸਰਕਾਰੀ ਖਰੀਦ) */}
        <div 
          onClick={() => onNavigateModule('agency')}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ਸਰਕਾਰੀ ਖਰੀਦ (Bought)</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-100 transition">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
              {totalPurchasedBags.toLocaleString()} <span className="text-xs font-normal text-gray-500">ਗੱਟੇ</span>
            </div>
            <div className="text-xs font-bold text-blue-800 mt-1 font-mono">
              {totalPurchasedQuintals.toFixed(1)} ਕੁਇੰਟਲ
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>{filteredPurchases.length} ਬੋਲੀਆਂ/J-Form</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* KPI 3: Lifted Bags (ਲਿਫਟਿੰਗ ਹੋਈ) */}
        <div 
          onClick={() => onNavigateModule('lifting')}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:border-purple-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ਲਿਫਟਿੰਗ ਹੋਈ (Lifted)</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-100 transition">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
              {totalLiftedBags.toLocaleString()} <span className="text-xs font-normal text-gray-500">ਗੱਟੇ</span>
            </div>
            <div className="text-xs font-bold text-purple-800 mt-1 font-mono">
              {totalLiftedQuintals.toFixed(1)} Qtl ({liftingProgressPercent}%)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>{uniqueTrucksCount} ਟਰੱਕ ਚਲਾਨ</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* KPI 4: Pending in Yard (ਯਾਰਡ ਵਿੱਚ ਬਕਾਇਆ) */}
        <div 
          onClick={() => onNavigateModule('lifting')}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:border-rose-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ਯਾਰਡ ਬਕਾਇਆ (Yard Stock)</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-100 transition">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${pendingInYardBags > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {pendingInYardBags.toLocaleString()} <span className="text-xs font-normal text-gray-500">ਗੱਟੇ</span>
            </div>
            <div className="text-xs font-bold text-gray-600 mt-1 font-mono">
              {(pendingInYardBags * 0.375).toFixed(1)} ਕੁਇੰਟਲ
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>{pendingInYardBags > 0 ? 'ਲਿਫਟਿੰਗ ਬਾਕੀ' : 'ਯਾਰਡ ਸਾਫ਼'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* KPI 5: Total MSP Gross Value (ਕੁਲ ਰਕਮ) */}
        <div 
          onClick={() => onNavigateModule('agency')}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ਕੁਲ ਰਕਮ (MSP Value)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
              {formatIndianCurrency(totalPurchasedAmount)}
            </div>
            <div className="text-xs font-bold text-gray-600 mt-1">
              ਨੈੱਟ ਦੇਣਦਾਰੀ: {formatIndianCurrency(totalNetPayable)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>ਐਡਵਾਂਸ: ₹{totalAdvancePaid.toLocaleString()}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* KPI 6: Farmers & Villages (ਕਿਸਾਨ ਪਰਿਵਾਰ) */}
        <div 
          onClick={() => onNavigateModule('farmers')}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">ਕਿਸਾਨ ਰਜਿਸਟਰ (Farmers)</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-100 transition">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
              {farmers.length} <span className="text-xs font-normal text-gray-500">ਕਿਸਾਨ</span>
            </div>
            <div className="text-xs font-bold text-teal-800 mt-1 font-mono">
              {farmers.reduce((s, f) => s + (f.linked_farmers?.length || 0), 0)} ਪਰਿਵਾਰਕ ਮੈਂਬਰ
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>{villagesCount} ਪਿੰਡ ਸ਼ਾਮਲ</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

      </div>

      {/* Firm-Wise Live Comparison (JAMMU TRADING CO. vs NEW JAMMU TRADING CO.) */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
              <h2 className="text-lg sm:text-xl font-black text-gray-950">
                ਦੋਵੇਂ ਆੜ੍ਹਤੀਆ ਫਰਮਾਂ ਦਾ ਲਾਈਵ ਮੁਕਾਬਲਾ ਤੇ ਹਿਸਾਬ (Both Firms Comparison)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              ਦੋਵਾਂ ਲਾਈਸੰਸਾਂ ਦੇ ਤਹਿਤ ਹੋਈ ਖਰੀਦ, ਲਿਫਟਿੰਗ ਅਤੇ ਬਕਾਇਆ ਯਾਰਡ ਸਟਾਕ ਦਾ ਵੱਖ-ਵੱਖ ਬਿਓਰਾ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLetterPad}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs transition border border-emerald-300 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>ਫਰਮ ਲੈਟਰ ਪੈਡ ਪ੍ਰਿੰਟ ਕਰੋ</span>
            </button>
          </div>
        </div>

        {/* Visual Share Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="text-emerald-900 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-700"></span>
              <span>1. {firm1Name} ({firm1Stats.bags.toLocaleString()} ਗੱਟੇ)</span>
            </span>
            <span className="text-blue-900 flex items-center gap-1.5">
              <span>2. {firm2Name} ({firm2Stats.bags.toLocaleString()} ਗੱਟੇ)</span>
              <span className="w-3 h-3 rounded-full bg-blue-700"></span>
            </span>
          </div>

          <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${totalPurchasedBags > 0 ? (firm1Stats.bags / totalPurchasedBags) * 100 : 50}%` }}
              className="bg-emerald-700 hover:bg-emerald-800 transition-all flex items-center justify-center text-[10px] text-white font-mono font-bold"
              title={`${firm1Name}: ${firm1Stats.bags} bags`}
            >
              {totalPurchasedBags > 0 && Math.round((firm1Stats.bags / totalPurchasedBags) * 100) > 10 ? `${Math.round((firm1Stats.bags / totalPurchasedBags) * 100)}%` : ''}
            </div>
            <div 
              style={{ width: `${totalPurchasedBags > 0 ? (firm2Stats.bags / totalPurchasedBags) * 100 : 50}%` }}
              className="bg-blue-700 hover:bg-blue-800 transition-all flex items-center justify-center text-[10px] text-white font-mono font-bold"
              title={`${firm2Name}: ${firm2Stats.bags} bags`}
            >
              {totalPurchasedBags > 0 && Math.round((firm2Stats.bags / totalPurchasedBags) * 100) > 10 ? `${Math.round((firm2Stats.bags / totalPurchasedBags) * 100)}%` : ''}
            </div>
          </div>
        </div>

        {/* Both Firms Cards Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
          
          {/* Firm 1: JAMMU TRADING CO. */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 rounded-2xl border-2 border-emerald-300 p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  ਲਾਈਸੰਸ: {ARHTIA_FIRMS[0]?.lic_number || 'JAL/LKH/133'}
                </span>
                <h3 className="text-lg font-black text-emerald-950 mt-1.5">
                  {firm1Name}
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  {ARHTIA_FIRMS[0]?.proprietor || 'PRO. HIMMAT SINGH'} • PAN: {ARHTIA_FIRMS[0]?.pan_number}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-500 block">ਕੁਲ ਖਰੀਦ ਰਕਮ</span>
                <span className="text-lg font-black text-emerald-900 font-mono">
                  {formatIndianCurrency(firm1Stats.amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-200">
              <div className="bg-white rounded-xl p-3 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">ਖਰੀਦ ਗੱਟੇ</span>
                <span className="text-base font-black text-gray-900 font-mono">{firm1Stats.bags.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-700 font-semibold block">{firm1Stats.quintals.toFixed(1)} Qtl</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">ਲਿਫਟਿੰਗ ਹੋਈ</span>
                <span className="text-base font-black text-purple-900 font-mono">{firm1Stats.liftedBags.toLocaleString()}</span>
                <span className="text-[10px] text-purple-700 font-semibold block">{(firm1Stats.liftedBags * 0.375).toFixed(1)} Qtl</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">ਯਾਰਡ ਬਕਾਇਆ</span>
                <span className={`text-base font-black font-mono ${firm1Stats.pendingBags > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {firm1Stats.pendingBags.toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-500 font-semibold block">{(firm1Stats.pendingBags * 0.375).toFixed(1)} Qtl</span>
              </div>
            </div>
          </div>

          {/* Firm 2: NEW JAMMU TRADING CO. */}
          <div className="bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 rounded-2xl border-2 border-blue-300 p-5 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-800 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  ਲਾਈਸੰਸ: {ARHTIA_FIRMS[1]?.lic_number || 'JAL/LKH/239'}
                </span>
                <h3 className="text-lg font-black text-blue-950 mt-1.5">
                  {firm2Name}
                </h3>
                <p className="text-xs text-blue-800 font-medium">
                  ਮੋਬਾਈਲ: {ARHTIA_FIRMS[1]?.mobile} • PAN: {ARHTIA_FIRMS[1]?.pan_number}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-gray-500 block">ਕੁਲ ਖਰੀਦ ਰਕਮ</span>
                <span className="text-lg font-black text-blue-900 font-mono">
                  {formatIndianCurrency(firm2Stats.amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-blue-200">
              <div className="bg-white rounded-xl p-3 border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">ਖਰੀਦ ਗੱਟੇ</span>
                <span className="text-base font-black text-gray-900 font-mono">{firm2Stats.bags.toLocaleString()}</span>
                <span className="text-[10px] text-blue-700 font-semibold block">{firm2Stats.quintals.toFixed(1)} Qtl</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">ਲਿਫਟਿੰਗ ਹੋਈ</span>
                <span className="text-base font-black text-purple-900 font-mono">{firm2Stats.liftedBags.toLocaleString()}</span>
                <span className="text-[10px] text-purple-700 font-semibold block">{(firm2Stats.liftedBags * 0.375).toFixed(1)} Qtl</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">ਯਾਰਡ ਬਕਾਇਆ</span>
                <span className={`text-base font-black font-mono ${firm2Stats.pendingBags > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {firm2Stats.pendingBags.toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-500 font-semibold block">{(firm2Stats.pendingBags * 0.375).toFixed(1)} Qtl</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Middle Section: Agency-wise Breakdown & Bardana / Labor Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Agency-Wise Procurement Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-700" />
                <span>ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀਆਂ ਦਾ ਬਿਓਰਾ (Agency-Wise Procurement)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                ਪਨਗਰੇਨ, ਮਾਰਕਫੈੱਡ, ਪਨਸਪ, ਵੇਅਰਹਾਊਸ ਅਤੇ ਐੱਫ.ਸੀ.ਆਈ. ਦੁਆਰਾ ਖਰੀਦ ਕੀਤੇ ਗੱਟੇ ਤੇ ਲਿਫਟਿੰਗ
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('agency')}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
            >
              <span>ਸਭ ਦੇਖੋ</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
            {agencyBreakdown.map((agency) => (
              <div 
                key={agency.key}
                className="bg-gray-50/70 hover:bg-gray-100/80 rounded-2xl p-4 border border-gray-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-gray-900">{agency.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 text-[10px] font-mono font-bold">
                      {agency.entriesCount} ਲਾਟ
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">ਖਰੀਦ ਗੱਟੇ</span>
                      <span className="text-base font-black text-gray-900 font-mono">
                        {agency.bags.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-600 block">{agency.quintals.toFixed(1)} Qtl</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">ਕੁਲ ਰਕਮ</span>
                      <span className="text-sm font-black text-emerald-800 font-mono">
                        {formatIndianCurrency(agency.amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between text-xs">
                  <span className="text-purple-800 font-medium">
                    ਲਿਫਟਿੰਗ: <b className="font-mono">{agency.liftedBags}</b>
                  </span>
                  <span className={agency.pendingBags > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-medium'}>
                    ਬਕਾਇਆ: <b className="font-mono">{agency.pendingBags} ਗੱਟੇ</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Bardana Meter & Labor Expenses */}
        <div className="space-y-6">
          
          {/* Bardana Meter */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-sm font-black text-gray-950 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <span>ਬਾਰਦਾਨਾ ਸਟਾਕ ਮੀਟਰ (Bardana Inventory)</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigateModule('bardana')}
                className="text-xs font-bold text-orange-700 hover:text-orange-900 cursor-pointer"
              >
                ਵੇਰਵਾ
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">ਏਜੰਸੀ / ਸ਼ੈਲਰ ਤੋਂ ਪ੍ਰਾਪਤ:</span>
                <span className="text-sm font-black text-emerald-800 font-mono">+{bardanaReceived.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">ਕਿਸਾਨਾਂ ਨੂੰ ਜਾਰੀ (Issued):</span>
                <span className="text-sm font-black text-rose-800 font-mono">-{bardanaIssued.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-black text-gray-900">ਮੰਡੀ ਯਾਰਡ ਵਿੱਚ ਬੈਲੇਂਸ:</span>
                <span className="text-base font-black text-orange-700 font-mono">{bardanaNetBalance.toLocaleString()} ਗੱਟੇ</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 bg-orange-50/70 rounded-xl p-2.5 text-[11px] text-orange-900 font-medium">
              ਸਟੈਂਡਰਡ ਪੈਕਿੰਗ: <b>37.5 ਕਿੱਲੋ ਗੱਟਾ</b> (ਨਵਾਂ ਤੇ ਪੁਰਾਣਾ ਮਾਰਕਾ)
            </div>
          </div>

          {/* Labor Deductions Summary */}
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-sm font-black text-gray-950 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-700" />
                <span>ਲੇਬਰ ਤੇ ਪੱਖਾ ਕਟੌਤੀਆਂ (Labor Expenses)</span>
              </h3>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ਪੱਲੇਦਾਰੀ (@ ₹8 ਪ੍ਰਤੀ ਗੱਟਾ):</span>
                <span className="font-bold font-mono text-gray-900">₹{totalLaborExpense.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ਸੁੱਕੀ ਕੀਤੀ ਲੇਬਰ (@ ₹5):</span>
                <span className="font-bold font-mono text-gray-900">₹{totalSukhiKiti.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ਡਬਲ ਪੱਖਾ ਖਰਚਾ (@ ₹4):</span>
                <span className="font-bold font-mono text-gray-900">₹{totalDoublePakha.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <span className="font-black text-gray-900">ਕੁਲ ਲੇਬਰ ਕਟੌਤੀ:</span>
                <span className="text-sm font-black text-emerald-800 font-mono">₹{totalAllDeductions.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Quick Action Launchpad */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">
              ਤੁਰੰਤ ਸ਼ਾਰਟਕੱਟ (Quick Mandi Actions)
            </h3>
          </div>
          <span className="text-xs text-gray-400">1-ਕਲਿੱਕ ਕੰਟਰੋਲ</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          
          <button
            type="button"
            onClick={() => onNavigateModule('arrivals')}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl border border-white/10 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <Wheat className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-white">ਨਵੀਂ ਆਵਕ</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('agency')}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl border border-white/10 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold text-white">ਸਰਕਾਰੀ ਖਰੀਦ</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('lifting')}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl border border-white/10 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <Truck className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold text-white">ਟਰੱਕ ਚਲਾਨ</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('bardana')}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl border border-white/10 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <Package className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-bold text-white">ਬਾਰਦਾਨਾ ਐਂਟਰੀ</span>
          </button>

          <button
            type="button"
            onClick={onAddNewFarmer}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl border border-white/10 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <Users className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-bold text-white">ਨਵਾਂ ਕਿਸਾਨ</span>
          </button>

          <button
            type="button"
            onClick={onOpenLetterPad}
            className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl border border-white/10 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <FileText className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-bold text-white">ਲੈਟਰ ਪੈਡ</span>
          </button>

          <button
            type="button"
            onClick={onOpenDuplicateCleaner}
            className="p-3 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 rounded-2xl border border-amber-400/40 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <Trash2 className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-bold text-amber-200">ਡੁਪਲੀਕੇਟ ਸਫਾਈ</span>
          </button>

          <button
            type="button"
            onClick={onOpenSheetModal}
            className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 rounded-2xl border border-emerald-400/40 transition text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            <span className="text-xs font-bold text-emerald-200">ਗੂਗਲ ਸ਼ੀਟ</span>
          </button>

        </div>
      </div>

      {/* Recent Mandi Activity Feed */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-800" />
              <span>ਤਾਜ਼ਾ ਮੰਡੀ ਗਤੀਵਿਧੀਆਂ (Recent Live Entries)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              ਮੰਡੀ ਵਿੱਚ ਦਰਜ ਹੋਈਆਂ ਤਾਜ਼ਾ ਆਵਕਾਂ, ਬੋਲੀਆਂ ਅਤੇ ਲਿਫਟਿੰਗ ਚਲਾਨ
            </p>
          </div>

          {/* Activity Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRecentTab('arrivals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                recentTab === 'arrivals' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ਆਵਕ ({cropArrivals.length})
            </button>
            <button
              type="button"
              onClick={() => setRecentTab('purchases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                recentTab === 'purchases' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ਖਰੀਦ ({agencyPurchases.length})
            </button>
            <button
              type="button"
              onClick={() => setRecentTab('lifting')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                recentTab === 'lifting' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ਲਿਫਟਿੰਗ ({liftingDispatches.length})
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="mt-4 divide-y divide-gray-100 overflow-x-auto">
          {recentTab === 'arrivals' && (
            cropArrivals.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">ਕੋਈ ਆਵਕ ਐਂਟਰੀ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।</div>
            ) : (
              cropArrivals.slice(0, 5).map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                      🌾
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {a.farmer_name} {a.farmer_name_pa && `(${a.farmer_name_pa})`}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {a.village} • {a.vehicle_trolley_no || 'ਟ੍ਰਾਲੀ'} • {a.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-gray-900 text-sm">{a.total_bags_arrived} ਗੱਟੇ</span>
                    <span className="block text-[11px] text-amber-800 font-semibold">{a.weight_quintals} Qtl</span>
                  </div>
                </div>
              ))
            )
          )}

          {recentTab === 'purchases' && (
            agencyPurchases.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">ਕੋਈ ਖਰੀਦ ਐਂਟਰੀ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।</div>
            ) : (
              agencyPurchases.slice(0, 5).map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
                      🏢
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {p.farmer_name} • {p.purchasing_agency}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        ਫਰਮ: {p.firm_name} • {p.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-gray-900 text-sm">{p.total_bags} ਗੱਟੇ</span>
                    <span className="block text-[11px] text-emerald-800 font-bold font-mono">₹{p.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )
          )}

          {recentTab === 'lifting' && (
            liftingDispatches.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">ਕੋਈ ਲਿਫਟਿੰਗ ਚਲਾਨ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।</div>
            ) : (
              liftingDispatches.slice(0, 5).map((l) => (
                <div key={l.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
                      🚚
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        {l.truck_number} • {l.seller_sheller_name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        ਚਲਾਨ: {l.challan_no} • {l.purchasing_agency}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-gray-900 text-sm">{l.bags_lifted} ਗੱਟੇ</span>
                    <span className={`block text-[11px] font-semibold ${l.pending_yard_bags > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {l.pending_yard_bags > 0 ? `${l.pending_yard_bags} ਬਾਕੀ` : 'ਪੂਰੀ ਲਿਫਟਿੰਗ'}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

    </div>
  );
};
