import React, { useState, useMemo } from 'react';
import { 
  AgencyPurchaseEntry, 
  FarmerMaster, 
  GoogleSheetConfig, 
  ArhtiaFirm, 
  ARHTIA_FIRMS, 
  MANDI_LOCATIONS 
} from '../types/mandi';
import { 
  Building2, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  Trash2, 
  Printer, 
  X,
  Users,
  Scale,
  Edit3,
  FileDown,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
  UserCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { appendAgencyPurchaseToSheets } from '../lib/sheets';
import { AllEntryPdfModal } from './AllEntryPdfModal';

export interface SelectableFarmerItem {
  uniqueKey: string;
  farmerId: string;
  linkedId?: string;
  isLinked: boolean;
  displayName: string;
  nameEn: string;
  namePa: string;
  fatherHusbandName: string;
  village: string;
  mobile: string;
  aadhaar: string;
  relation: string;
  mainFarmerName: string;
}

interface BatchFarmerRow {
  uniqueKey: string;
  farmerItem: SelectableFarmerItem;
  newJuteBags: number;
  oldJuteBags: number;
  totalBags: number;
  weightQtl: number;
  grossAmount: number;
  lotGatePass: string;
}

interface AgencyPurchaseModuleProps {
  entries: AgencyPurchaseEntry[];
  onAddEntry: (entry: AgencyPurchaseEntry) => void;
  onAddBatchPurchases?: (entries: AgencyPurchaseEntry[]) => void;
  onUpdateEntry: (entry: AgencyPurchaseEntry) => void;
  onDeleteEntry: (id: string) => void;
  onOpenJForm: (entry: AgencyPurchaseEntry) => void;
  registeredFarmers: FarmerMaster[];
  token: string | null;
  sheetConfig: GoogleSheetConfig | null;
  onOpenSheetModal: () => void;
}

export const AgencyPurchaseModule: React.FC<AgencyPurchaseModuleProps> = ({
  entries,
  onAddEntry,
  onAddBatchPurchases,
  onUpdateEntry,
  onDeleteEntry,
  onOpenJForm,
  registeredFarmers,
  token,
  sheetConfig,
  onOpenSheetModal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AgencyPurchaseEntry | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFirmView, setSelectedFirmView] = useState<'All' | 'JAMMU TRADING CO.' | 'NEW JAMMU TRADING CO.'>('All');
  const [firmFilter, setFirmFilter] = useState('All');
  const [mandiFilter, setMandiFilter] = useState('All');
  const [agencyFilter, setAgencyFilter] = useState('All');
  const [selectedDateTab, setSelectedDateTab] = useState<string>('All');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Distinct dates from entries for quick date tabs
  const distinctEntryDates = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.date) set.add(e.date);
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  // Modal Mode: 'batch' (Multi-Farmer 10-20 Farmers) vs 'single' (Single Farmer)
  const [modalMode, setModalMode] = useState<'batch' | 'single'>('batch');

  // Shared Procurement Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFirmId, setSelectedFirmId] = useState(ARHTIA_FIRMS[0].id);
  const [mandiName, setMandiName] = useState(MANDI_LOCATIONS[0]);
  const [agency, setAgency] = useState('Pungrain (ਪਨਗਰੇਨ)');
  const [cropType, setCropType] = useState('Paddy Grade A');
  const [cropVariety, setCropVariety] = useState('PR-126');
  const [ratePerQtl, setRatePerQtl] = useState<number>(2461);
  const [bagPackingKg, setBagPackingKg] = useState<number>(37.5);

  // Flatten registered farmers + linked farmers into unified selectable items
  const allSelectableFarmers = useMemo<SelectableFarmerItem[]>(() => {
    const list: SelectableFarmerItem[] = [];
    registeredFarmers.forEach((f) => {
      // 1. Main farmer
      list.push({
        uniqueKey: f.id,
        farmerId: f.id,
        isLinked: false,
        displayName: `${f.name_en}${f.name_pa ? ` (${f.name_pa})` : ''}`,
        nameEn: f.name_en,
        namePa: f.name_pa || '',
        fatherHusbandName: f.father_husband_name_en || '',
        village: f.village_en || '',
        mobile: f.mobile_number || '',
        aadhaar: f.aadhaar_number || '',
        relation: 'Self (ਮੁੱਖ ਕਿਸਾਨ)',
        mainFarmerName: f.name_en,
      });

      // 2. Linked family members / partners
      if (f.linked_farmers && f.linked_farmers.length > 0) {
        f.linked_farmers.forEach((lf) => {
          list.push({
            uniqueKey: `${f.id}_linked_${lf.id}`,
            farmerId: f.id,
            linkedId: lf.id,
            isLinked: true,
            displayName: `${lf.name_en}${lf.name_pa ? ` (${lf.name_pa})` : ''}`,
            nameEn: lf.name_en,
            namePa: lf.name_pa || '',
            fatherHusbandName: lf.father_husband_name_en || f.father_husband_name_en || '',
            village: lf.village_en || f.village_en || '',
            mobile: lf.mobile_number || f.mobile_number || '',
            aadhaar: lf.aadhaar_number || '',
            relation: lf.relation || 'ਲਿੰਕਡ ਮੈਂਬਰ',
            mainFarmerName: f.name_en,
          });
        });
      }
    });
    return list;
  }, [registeredFarmers]);

  // Multi-Farmer Batch State
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedDropdownFarmerKey, setSelectedDropdownFarmerKey] = useState('');
  const [batchRows, setBatchRows] = useState<BatchFarmerRow[]>([]);
  const [quickNewBags, setQuickNewBags] = useState<number>(0);
  const [quickOldBags, setQuickOldBags] = useState<number>(0);

  // Filtered farmers in selection modal
  const filteredFarmerChoices = useMemo(() => {
    const q = farmerSearch.toLowerCase().trim();
    if (!q) return allSelectableFarmers;
    return allSelectableFarmers.filter(
      (item) =>
        item.nameEn.toLowerCase().includes(q) ||
        item.namePa.includes(q) ||
        item.mainFarmerName.toLowerCase().includes(q) ||
        item.village.toLowerCase().includes(q) ||
        item.mobile.includes(q) ||
        item.relation.toLowerCase().includes(q)
    );
  }, [allSelectableFarmers, farmerSearch]);

  // Add farmer to batch with unique row ID (supports selecting same farmer MULTIPLE TIMES!)
  const handleAddFarmerToBatch = (item: SelectableFarmerItem) => {
    const rowId = `${item.uniqueKey}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const nBags = quickNewBags || 0;
    const oBags = quickOldBags || 0;
    const tot = nBags + oBags;
    const wt = Number(((tot * bagPackingKg) / 100).toFixed(2));
    const amt = Number((wt * ratePerQtl).toFixed(2));
    const newRow: BatchFarmerRow = {
      uniqueKey: rowId,
      farmerItem: item,
      newJuteBags: nBags,
      oldJuteBags: oBags,
      totalBags: tot,
      weightQtl: wt,
      grossAmount: amt,
      lotGatePass: `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    setBatchRows((prev) => [...prev, newRow]);
  };

  // Select all currently filtered farmers
  const handleSelectAllFiltered = () => {
    setBatchRows((prev) => {
      const additions: BatchFarmerRow[] = [];
      filteredFarmerChoices.forEach((item) => {
        const rowId = `${item.uniqueKey}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const nBags = quickNewBags || 0;
        const oBags = quickOldBags || 0;
        const tot = nBags + oBags;
        const wt = Number(((tot * bagPackingKg) / 100).toFixed(2));
        const amt = Number((wt * ratePerQtl).toFixed(2));
        additions.push({
          uniqueKey: rowId,
          farmerItem: item,
          newJuteBags: nBags,
          oldJuteBags: oBags,
          totalBags: tot,
          weightQtl: wt,
          grossAmount: amt,
          lotGatePass: `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
        });
      });
      return [...prev, ...additions];
    });
  };

  // Clear batch selection
  const handleClearBatch = () => {
    setBatchRows([]);
  };

  // Apply quick bags to all selected farmers
  const handleApplyQuickBagsToAll = () => {
    setBatchRows((prev) =>
      prev.map((row) => {
        const tot = quickNewBags + quickOldBags;
        const wt = Number(((tot * bagPackingKg) / 100).toFixed(2));
        const amt = Number((wt * ratePerQtl).toFixed(2));
        return {
          ...row,
          newJuteBags: quickNewBags,
          oldJuteBags: quickOldBags,
          totalBags: tot,
          weightQtl: wt,
          grossAmount: amt,
        };
      })
    );
  };

  // Update single row in batch table
  const handleUpdateBatchRow = (
    uniqueKey: string,
    field: 'newJuteBags' | 'oldJuteBags' | 'weightQtl' | 'lotGatePass',
    value: any
  ) => {
    setBatchRows((prev) =>
      prev.map((row) => {
        if (row.uniqueKey !== uniqueKey) return row;
        const updated = { ...row };

        if (field === 'newJuteBags') {
          const n = Number(value) || 0;
          updated.newJuteBags = n;
          updated.totalBags = n + updated.oldJuteBags;
          updated.weightQtl = Number(((updated.totalBags * bagPackingKg) / 100).toFixed(2));
          updated.grossAmount = Number((updated.weightQtl * ratePerQtl).toFixed(2));
        } else if (field === 'oldJuteBags') {
          const o = Number(value) || 0;
          updated.oldJuteBags = o;
          updated.totalBags = updated.newJuteBags + o;
          updated.weightQtl = Number(((updated.totalBags * bagPackingKg) / 100).toFixed(2));
          updated.grossAmount = Number((updated.weightQtl * ratePerQtl).toFixed(2));
        } else if (field === 'weightQtl') {
          const w = Number(value) || 0;
          updated.weightQtl = w;
          updated.grossAmount = Number((w * ratePerQtl).toFixed(2));
        } else if (field === 'lotGatePass') {
          updated.lotGatePass = String(value);
        }
        return updated;
      })
    );
  };

  // Remove row from batch
  const handleRemoveBatchRow = (uniqueKey: string) => {
    setBatchRows((prev) => prev.filter((r) => r.uniqueKey !== uniqueKey));
  };

  // Batch Totals
  const batchTotalFarmers = batchRows.length;
  const batchTotalNewBags = batchRows.reduce((sum, r) => sum + r.newJuteBags, 0);
  const batchTotalOldBags = batchRows.reduce((sum, r) => sum + r.oldJuteBags, 0);
  const batchTotalBags = batchTotalNewBags + batchTotalOldBags;
  const batchTotalWeight = batchRows.reduce((sum, r) => sum + r.weightQtl, 0);
  const batchTotalAmount = batchRows.reduce((sum, r) => sum + r.grossAmount, 0);

  // Submit Multi-Farmer Batch
  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (batchRows.length === 0) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ 1 ਕਿਸਾਨ ਚੁਣੋ!');
      return;
    }

    const activeFirm = ARHTIA_FIRMS.find((f) => f.id === selectedFirmId) || ARHTIA_FIRMS[0];
    const generatedEntries: AgencyPurchaseEntry[] = batchRows.map((row, index) => {
      const item = row.farmerItem;
      const uniqueSuffix = (Date.now() + index).toString().slice(-6);

      // Strictly use English farmer name for records & PDF as requested
      const selectedFarmerName = item.nameEn || item.displayName;

      return {
        id: `AUC-${uniqueSuffix}`,
        date,
        firm_id: activeFirm.id,
        firm_name: activeFirm.name,
        mandi_name: mandiName,
        farmer_id: item.farmerId,
        farmer_name: selectedFarmerName,
        father_husband_name: item.fatherHusbandName || undefined,
        address_village: item.village,
        village: item.village,
        mobile: item.mobile,
        billed_to_name: selectedFarmerName,
        relation_with_main: 'Self',
        crop_type: cropType,
        crop_variety: cropVariety,
        bag_packing_kg: bagPackingKg,
        new_jute_bags: row.newJuteBags,
        old_jute_bags: row.oldJuteBags,
        total_bags: row.totalBags,
        weight_quintals: row.weightQtl,
        rate_per_quintal: ratePerQtl,
        total_amount: row.grossAmount,
        purchasing_agency: agency,
        // Labor deductions completely removed as requested
        j_form_labor_rate: 0,
        j_form_labor_total: 0,
        sukhi_kiti_rate: 0,
        sukhi_kiti_total: 0,
        double_pakha_rate: 0,
        double_pakha_total: 0,
        previous_khata: 0,
        advance_paid: 0,
        net_payable: row.grossAmount,
        synced_to_sheets: false,
      };
    });

    if (onAddBatchPurchases) {
      onAddBatchPurchases(generatedEntries);
    } else {
      generatedEntries.forEach((entry) => onAddEntry(entry));
    }

    setIsModalOpen(false);
    setBatchRows([]);
  };

  // Single Farmer Mode Form States
  const [singleSelectedKey, setSingleSelectedKey] = useState('');
  const [singleFarmerName, setSingleFarmerName] = useState('');
  const [singleFatherHusband, setSingleFatherHusband] = useState('');
  const [singleBilledToName, setSingleBilledToName] = useState('');
  const [singleRelation, setSingleRelation] = useState('Self (ਖੁਦ)');
  const [singleVillage, setSingleVillage] = useState('');
  const [singleMobile, setSingleMobile] = useState('');
  const [singleNewJute, setSingleNewJute] = useState<number>(200);
  const [singleOldJute, setSingleOldJute] = useState<number>(200);
  const singleTotalBags = Number(singleNewJute || 0) + Number(singleOldJute || 0);
  const [singleWeightQtl, setSingleWeightQtl] = useState<number>(150.0);
  const [singlePrevKhata, setSinglePrevKhata] = useState<number>(0);
  const [singleAdvance, setSingleAdvance] = useState<number>(0);

  const handleSingleFarmerSelect = (key: string) => {
    setSingleSelectedKey(key);
    const found = allSelectableFarmers.find((item) => item.uniqueKey === key);
    if (found) {
      const chosenName = found.namePa ? `${found.nameEn} (${found.namePa})` : found.nameEn;
      setSingleFarmerName(chosenName);
      setSingleFatherHusband(found.fatherHusbandName);
      setSingleBilledToName(chosenName);
      setSingleRelation(found.isLinked ? found.relation : 'Self');
      setSingleVillage(found.village);
      setSingleMobile(found.mobile);
    }
  };

  const handleSingleBagsChange = (newJ: number, oldJ: number) => {
    setSingleNewJute(newJ);
    setSingleOldJute(oldJ);
    const tot = newJ + oldJ;
    const calcWeight = Number(((tot * bagPackingKg) / 100).toFixed(2));
    setSingleWeightQtl(calcWeight);
  };

  const singleGrossAmount = Number((singleWeightQtl * ratePerQtl).toFixed(2));
  const singleNetPayable = Number((singleGrossAmount + Number(singlePrevKhata) - Number(singleAdvance)).toFixed(2));

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFarmerName.trim()) {
      alert('ਕਿਸਾਨ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ');
      return;
    }

    const activeFirm = ARHTIA_FIRMS.find((f) => f.id === selectedFirmId) || ARHTIA_FIRMS[0];
    const newEntry: AgencyPurchaseEntry = {
      id: `AUC-${Date.now().toString().slice(-5)}`,
      date,
      firm_id: activeFirm.id,
      firm_name: activeFirm.name,
      mandi_name: mandiName,
      farmer_id: singleSelectedKey ? singleSelectedKey.split('_')[0] : undefined,
      farmer_name: singleFarmerName.trim(),
      father_husband_name: singleFatherHusband.trim() || undefined,
      address_village: singleVillage.trim(),
      village: singleVillage.trim(),
      mobile: singleMobile.trim(),
      billed_to_name: singleFarmerName.trim(),
      relation_with_main: 'Self',
      crop_type: cropType,
      crop_variety: cropVariety,
      bag_packing_kg: bagPackingKg,
      new_jute_bags: Number(singleNewJute) || 0,
      old_jute_bags: Number(singleOldJute) || 0,
      total_bags: singleTotalBags,
      weight_quintals: Number(singleWeightQtl) || 0,
      rate_per_quintal: Number(ratePerQtl) || 2461,
      total_amount: singleGrossAmount,
      purchasing_agency: agency,
      j_form_labor_rate: 0,
      j_form_labor_total: 0,
      sukhi_kiti_rate: 0,
      sukhi_kiti_total: 0,
      double_pakha_rate: 0,
      double_pakha_total: 0,
      previous_khata: Number(singlePrevKhata) || 0,
      advance_paid: Number(singleAdvance) || 0,
      net_payable: singleNetPayable,
      synced_to_sheets: false,
    };

    onAddEntry(newEntry);
    setIsModalOpen(false);
  };

  // Full Edit Submit
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const totBags = Number(editingEntry.new_jute_bags || 0) + Number(editingEntry.old_jute_bags || 0);
    const packing = editingEntry.bag_packing_kg || 37.5;
    const w = editingEntry.weight_quintals || Number(((totBags * packing) / 100).toFixed(2));
    const rate = editingEntry.rate_per_quintal || 2461;
    const gross = Number((w * rate).toFixed(2));
    const net = Number((gross + Number(editingEntry.previous_khata || 0) - Number(editingEntry.advance_paid || 0)).toFixed(2));

    const updated: AgencyPurchaseEntry = {
      ...editingEntry,
      farmer_name: editingEntry.farmer_name.trim(),
      billed_to_name: editingEntry.farmer_name.trim(),
      total_bags: totBags > 0 ? totBags : editingEntry.total_bags,
      weight_quintals: w,
      total_amount: gross,
      j_form_labor_rate: 0,
      j_form_labor_total: 0,
      sukhi_kiti_rate: 0,
      sukhi_kiti_total: 0,
      double_pakha_rate: 0,
      double_pakha_total: 0,
      net_payable: net,
    };

    onUpdateEntry(updated);
    setEditingEntry(null);
  };

  const handleSyncEntry = async (entry: AgencyPurchaseEntry) => {
    if (!token || !sheetConfig) {
      onOpenSheetModal();
      return;
    }

    setIsSyncing(entry.id);
    try {
      await appendAgencyPurchaseToSheets(token, sheetConfig.spreadsheetId, entry);
      entry.synced_to_sheets = true;
      alert(`ਖਰੀਦ/ਬੋਲੀ ਐਂਟਰੀ Google Sheets (Agency_Purchase_Auction tab) ਵਿੱਚ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ!`);
    } catch (err: any) {
      console.error(err);
      alert('ਗੂਗਲ ਸ਼ੀਟ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵਿੱਚ ਦਿੱਕਤ ਆਈ: ' + err.message);
    } finally {
      setIsSyncing(null);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.farmer_name.toLowerCase().includes(q) ||
      (e.father_husband_name && e.father_husband_name.toLowerCase().includes(q)) ||
      e.billed_to_name.toLowerCase().includes(q) ||
      (e.address_village && e.address_village.toLowerCase().includes(q)) ||
      (e.mandi_name && e.mandi_name.toLowerCase().includes(q)) ||
      e.id.toLowerCase().includes(q);
    const matchFirm =
      selectedFirmView === 'All'
        ? (firmFilter === 'All' || e.firm_id === firmFilter || e.firm_name === firmFilter)
        : selectedFirmView === 'JAMMU TRADING CO.'
        ? ((e.firm_id === 'JAMMU TRADING CO.' || e.firm_name?.includes('JAMMU TRADING CO.')) && !e.firm_name?.includes('NEW'))
        : (e.firm_id === 'NEW JAMMU TRADING CO.' || e.firm_name?.includes('NEW JAMMU'));

    const matchMandi = mandiFilter === 'All' || e.mandi_name?.includes(mandiFilter);
    const matchAgency = agencyFilter === 'All' || e.purchasing_agency.includes(agencyFilter);
    const matchDate = selectedDateTab === 'All' || e.date === selectedDateTab;
    return matchSearch && matchFirm && matchMandi && matchAgency && matchDate;
  });

  // Analytical Charts by Firm
  const jammuEntries = useMemo(() => {
    return entries.filter(
      (e) => (e.firm_id === 'JAMMU TRADING CO.' || e.firm_name?.includes('JAMMU TRADING CO.')) && !e.firm_name?.includes('NEW')
    );
  }, [entries]);

  const newJammuEntries = useMemo(() => {
    return entries.filter(
      (e) => e.firm_id === 'NEW JAMMU TRADING CO.' || e.firm_name?.includes('NEW JAMMU')
    );
  }, [entries]);

  const jammuStats = useMemo(() => {
    const bags = jammuEntries.reduce((s, e) => s + (e.total_bags || 0), 0);
    const newB = jammuEntries.reduce((s, e) => s + (e.new_jute_bags || 0), 0);
    const oldB = jammuEntries.reduce((s, e) => s + (e.old_jute_bags || 0), 0);
    const wt = jammuEntries.reduce((s, e) => s + (e.weight_quintals || 0), 0);
    const amt = jammuEntries.reduce((s, e) => s + (e.total_amount || 0), 0);
    return { count: jammuEntries.length, bags, newB, oldB, wt, amt };
  }, [jammuEntries]);

  const newJammuStats = useMemo(() => {
    const bags = newJammuEntries.reduce((s, e) => s + (e.total_bags || 0), 0);
    const newB = newJammuEntries.reduce((s, e) => s + (e.new_jute_bags || 0), 0);
    const oldB = newJammuEntries.reduce((s, e) => s + (e.old_jute_bags || 0), 0);
    const wt = newJammuEntries.reduce((s, e) => s + (e.weight_quintals || 0), 0);
    const amt = newJammuEntries.reduce((s, e) => s + (e.total_amount || 0), 0);
    return { count: newJammuEntries.length, bags, newB, oldB, wt, amt };
  }, [newJammuEntries]);

  const allStats = useMemo(() => {
    const bags = entries.reduce((s, e) => s + (e.total_bags || 0), 0);
    const newB = entries.reduce((s, e) => s + (e.new_jute_bags || 0), 0);
    const oldB = entries.reduce((s, e) => s + (e.old_jute_bags || 0), 0);
    const wt = entries.reduce((s, e) => s + (e.weight_quintals || 0), 0);
    const amt = entries.reduce((s, e) => s + (e.total_amount || 0), 0);
    return { count: entries.length, bags, newB, oldB, wt, amt };
  }, [entries]);

  const activeFirm = ARHTIA_FIRMS.find((f) => f.id === selectedFirmId) || ARHTIA_FIRMS[0];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden space-y-4">
      
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-800 rounded-xl text-amber-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                ਸਰਕਾਰੀ ਖਰੀਦ, ਬੋਲੀ ਤੇ ਜੇ-ਫਾਰਮ (Agency Purchase & J-Form)
              </h2>
              <p className="text-xs text-blue-200">
                JAMMU TRADING CO. & NEW JAMMU TRADING CO. • ਮਲਟੀ-ਕਿਸਾਨ ਬੈਚ ਐਂਟਰੀ • ਰੇਟ ₹2461/Qtl
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Daily Purchase Sheet / All Entry PDF Button */}
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            title="ਇੱਕੋ ਮਿਤੀ ਦੀਆਂ ਸਾਰੀਆਂ ਐਂਟਰੀਆਂ ਦਾ ਚਾਰਟ, PDF ਅਤੇ ਪ੍ਰਿੰਟ ਕੱਢੋ"
          >
            <FileDown className="w-4 h-4 text-amber-300" />
            <span>📄 ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਸ਼ੀਟ (PDF / ਪ੍ਰਿੰਟ)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('batch');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-blue-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ ਨਵੀਂ ਸਰਕਾਰੀ ਖਰੀਦ (ਮਲਟੀ-ਕਿਸਾਨ ਬੈਚ)</span>
          </button>
        </div>
      </div>

      {/* 3 Dedicated Firm View Tabs with Analytical Charts as requested: "LIST VCH JAMMU TRADING CO AND NEW JAMMU TRADING DA ALG ALG CHART SHOW HOVE AND IK JAGHA ALL ENRTY" */}
      <div className="px-5 pt-1 space-y-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => setSelectedFirmView('All')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
              selectedFirmView === 'All'
                ? 'bg-blue-900 text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:shadow-xs'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>🏛️ ਸਾਰੀਆਂ ਐਂਟਰੀਆਂ (All Entries)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              selectedFirmView === 'All' ? 'bg-amber-400 text-blue-950' : 'bg-gray-200 text-gray-700'
            }`}>
              {allStats.count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFirmView('JAMMU TRADING CO.')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
              selectedFirmView === 'JAMMU TRADING CO.'
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:shadow-xs'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏢 JAMMU TRADING CO. (ਜੰਮੂ ਟਰੇਡਿੰਗ)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              selectedFirmView === 'JAMMU TRADING CO.' ? 'bg-amber-300 text-emerald-950' : 'bg-gray-200 text-gray-700'
            }`}>
              {jammuStats.count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFirmView('NEW JAMMU TRADING CO.')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
              selectedFirmView === 'NEW JAMMU TRADING CO.'
                ? 'bg-indigo-800 text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:shadow-xs'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏢 NEW JAMMU TRADING CO. (ਨਿਊ ਜੰਮੂ ਟਰੇਡਿੰਗ)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              selectedFirmView === 'NEW JAMMU TRADING CO.' ? 'bg-amber-300 text-indigo-950' : 'bg-gray-200 text-gray-700'
            }`}>
              {newJammuStats.count}
            </span>
          </button>
        </div>

        {/* Dynamic Analytical Comparison Charts */}
        {selectedFirmView === 'All' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Jammu Trading Co. Card Chart */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/60 border-2 border-emerald-300 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="font-black text-xs text-emerald-950 uppercase">
                    JAMMU TRADING CO.
                  </span>
                  <span className="text-[10px] text-emerald-800 font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                    LIC: JAL/LKH/133
                  </span>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-900">
                  {jammuStats.count} ਕਿਸਾਨ ਐਂਟਰੀਆਂ
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਬੋਰੀਆਂ</span>
                  <span className="font-bold font-mono text-emerald-950 text-sm">{jammuStats.bags} Bags</span>
                  <span className="text-[9px] text-emerald-700 block font-mono">{jammuStats.newB}N + {jammuStats.oldB}O</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਵਜ਼ਨ</span>
                  <span className="font-bold font-mono text-emerald-950 text-sm">{jammuStats.wt.toFixed(2)} Qtl</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-gray-500 block">MSP ਰਕਮ</span>
                  <span className="font-black font-mono text-emerald-900 text-xs">₹{jammuStats.amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            {/* New Jammu Trading Co. Card Chart */}
            <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-blue-50/60 border-2 border-indigo-300 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  <span className="font-black text-xs text-indigo-950 uppercase">
                    NEW JAMMU TRADING CO.
                  </span>
                  <span className="text-[10px] text-indigo-800 font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                    LIC: JAL/LKH/134
                  </span>
                </div>
                <span className="text-xs font-bold font-mono text-indigo-900">
                  {newJammuStats.count} ਕਿਸਾਨ ਐਂਟਰੀਆਂ
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਬੋਰੀਆਂ</span>
                  <span className="font-bold font-mono text-indigo-950 text-sm">{newJammuStats.bags} Bags</span>
                  <span className="text-[9px] text-indigo-700 block font-mono">{newJammuStats.newB}N + {newJammuStats.oldB}O</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਵਜ਼ਨ</span>
                  <span className="font-bold font-mono text-indigo-950 text-sm">{newJammuStats.wt.toFixed(2)} Qtl</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-500 block">MSP ਰਕਮ</span>
                  <span className="font-black font-mono text-indigo-900 text-xs">₹{newJammuStats.amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        ) : selectedFirmView === 'JAMMU TRADING CO.' ? (
          <div className="p-4 bg-emerald-50/80 border-2 border-emerald-400 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-800" />
                <span className="font-black text-sm text-emerald-950">JAMMU TRADING CO. - ਵਿਸ਼ੇਸ਼ ਚਾਰਟ</span>
                <span className="px-2 py-0.5 bg-emerald-800 text-white rounded text-[10px] font-bold">ਐਕਟਿਵ ਫਰਮ</span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">ਲਾਈਸੰਸ: JAL/LKH/133 • ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ / ਮਹਿਰਾਜਵਾਲਾ / ਕੰਗ ਖੁਰਦ</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਕਿਸਾਨ</span>
                <span className="font-bold font-mono text-emerald-950 text-sm">{jammuStats.count}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-gray-500 block">ਬੋਰੀਆਂ (ਨਵਾਂ+ਪੁਰਾਣਾ)</span>
                <span className="font-bold font-mono text-emerald-950 text-sm">{jammuStats.bags} ({jammuStats.newB}N + {jammuStats.oldB}O)</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਵਜ਼ਨ</span>
                <span className="font-bold font-mono text-emerald-950 text-sm">{jammuStats.wt.toFixed(2)} Qtl</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਰਕਮ</span>
                <span className="font-black font-mono text-emerald-900 text-sm">₹{jammuStats.amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-indigo-50/80 border-2 border-indigo-400 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-800" />
                <span className="font-black text-sm text-indigo-950">NEW JAMMU TRADING CO. - ਵਿਸ਼ੇਸ਼ ਚਾਰਟ</span>
                <span className="px-2 py-0.5 bg-indigo-800 text-white rounded text-[10px] font-bold">ਐਕਟਿਵ ਫਰਮ</span>
              </div>
              <p className="text-[11px] text-indigo-800 mt-0.5">ਲਾਈਸੰਸ: JAL/LKH/134 • ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ / ਮਹਿਰਾਜਵਾਲਾ / ਕੰਗ ਖੁਰਦ</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200">
                <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਕਿਸਾਨ</span>
                <span className="font-bold font-mono text-indigo-950 text-sm">{newJammuStats.count}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200">
                <span className="text-[10px] text-gray-500 block">ਬੋਰੀਆਂ (ਨਵਾਂ+ਪੁਰਾਣਾ)</span>
                <span className="font-bold font-mono text-indigo-950 text-sm">{newJammuStats.bags} ({newJammuStats.newB}N + {newJammuStats.oldB}O)</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200">
                <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਵਜ਼ਨ</span>
                <span className="font-bold font-mono text-indigo-950 text-sm">{newJammuStats.wt.toFixed(2)} Qtl</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200">
                <span className="text-[10px] text-gray-500 block">ਕੁੱਲ ਰਕਮ</span>
                <span className="font-black font-mono text-indigo-900 text-sm">₹{newJammuStats.amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Farmer, Father, Mandi..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Firm filter */}
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="All">ਸਾਰੀਆਂ ਫਰਮਾਂ (All Firms)</option>
            {ARHTIA_FIRMS.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Mandi filter */}
          <select
            value={mandiFilter}
            onChange={(e) => setMandiFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="All">ਸਾਰੀਆਂ ਮੰਡੀਆਂ (All Mandis)</option>
            <option value="Kamalpur">Mandi Kamalpur</option>
            <option value="Mehrajwala">Mehrajwala</option>
            <option value="Kang Khurd">Kang Khurd</option>
          </select>

          {/* Agency filter */}
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="All">All Agencies</option>
            <option value="Pungrain">Pungrain</option>
            <option value="Markfed">Markfed</option>
            <option value="Punsup">Punsup</option>
            <option value="PSWC">PSWC (ਵੇਅਰਹਾਊਸ)</option>
            <option value="FCI">FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)</option>
          </select>
        </div>
      </div>

      {/* Date-wise Browser Bar (ਅਲੱਗ-ਅਲੱਗ ਮਿਤੀਆਂ ਦੇ ਟੈਬਜ਼ - ਜਦੋਂ ਕਲਿੱਕ ਕਰੀਏ ਓਸ ਮਿਤੀ ਦੇ ਸਾਰੇ ਕਿਸਾਨ ਆ ਜਾਣ) */}
      <div className="px-5 py-3 bg-slate-50 border-y border-gray-200 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-bold text-gray-800">
              ਮਿਤੀ ਅਨੁਸਾਰ ਸਰਕਾਰੀ ਖਰੀਦ (Browse by Purchase Date):
            </span>
          </div>
          {selectedDateTab !== 'All' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-blue-950 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>ਇਸ ਮਿਤੀ ({selectedDateTab.split('-').reverse().join('/')}) ਦੀ PDF / ਪ੍ਰਿੰਟ ਸ਼ੀਟ</span>
              </button>
            </div>
          )}
        </div>

        {/* Date Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedDateTab('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              selectedDateTab === 'All'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>ਸਾਰੀਆਂ ਮਿਤੀਆਂ (All Dates)</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
              {entries.length}
            </span>
          </button>

          {distinctEntryDates.map((d) => {
            const count = entries.filter((e) => e.date === d).length;
            const isSelected = selectedDateTab === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDateTab(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-800 text-white shadow-xs ring-2 ring-blue-500 ring-offset-1'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                }`}
              >
                <span>📅 {d.split('-').reverse().join('/')}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold ${
                  isSelected ? 'bg-amber-400 text-blue-950' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count} ਕਿਸਾਨ
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Date Summary Strip */}
        {selectedDateTab !== 'All' && (
          <div className="pt-1.5 flex items-center gap-3 text-xs text-blue-950 font-medium flex-wrap">
            <span className="bg-blue-100/80 text-blue-900 px-2 py-0.5 rounded-md font-bold">
              ਚੁਣੀ ਹੋਈ ਮਿਤੀ: {selectedDateTab.split('-').reverse().join('/')}
            </span>
            <span>ਕੁੱਲ ਕਿਸਾਨ: <strong>{filteredEntries.length}</strong></span>
            <span>•</span>
            <span>ਕੁੱਲ ਬੋਰੀਆਂ: <strong>{filteredEntries.reduce((s, e) => s + (e.total_bags || 0), 0)} Bags</strong></span>
            <span>•</span>
            <span>ਕੁੱਲ ਵਜ਼ਨ: <strong>{filteredEntries.reduce((s, e) => s + (e.weight_quintals || 0), 0).toFixed(2)} Qtl</strong></span>
          </div>
        )}
      </div>

      {/* Agency Purchase Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <th className="py-3 px-3">Date / Firm / Mandi</th>
              <th className="py-3 px-3">ਕਿਸਾਨ ਦਾ ਨਾਮ ਤੇ ਵੇਰਵਾ (Farmer Name & Details)</th>
              <th className="py-3 px-3 text-center">ਬਾਰਦਾਨਾ (N+O)</th>
              <th className="py-3 px-3 text-right">ਕੁੱਲ ਗੱਟੇ</th>
              <th className="py-3 px-3 text-right">ਵਜ਼ਨ (Qtl)</th>
              <th className="py-3 px-3 text-right">MSP ਰੇਟ</th>
              <th className="py-3 px-3 text-right">ਕੁੱਲ ਰਕਮ (MSP)</th>
              <th className="py-3 px-3 text-center">ਸ਼ੀਟ ਸਿੰਕ</th>
              <th className="py-3 px-3 text-right">100% ਸੋਧੋ / ਹਟਾਓ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-400 text-xs">
                  ਚੁਣੀ ਹੋਈ ਮਿਤੀ ਲਈ ਕੋਈ ਖਰੀਦ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
                </td>
              </tr>
            ) : (
              filteredEntries.map((item) => {
                // Show ONLY single selected farmer name
                const displayedFarmerName = item.farmer_name || item.billed_to_name;

                return (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900">{item.date}</div>
                      <div className="text-[10px] text-blue-900 font-bold">{item.firm_name || 'JAMMU TRADING CO.'}</div>
                      <div className="text-[10px] text-gray-500">{item.mandi_name || 'Mandi Kamalpur'}</div>
                    </td>

                    {/* ONLY Single Selected Farmer's Name */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-950 text-sm">{displayedFarmerName}</div>
                      <div className="text-gray-500 text-xs">
                        ਪਿਤਾ: {item.father_husband_name || '-'} • ਪਿੰਡ: {item.address_village || item.village || '-'}
                        {item.mobile ? ` • ਮੋ: ${item.mobile}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-gray-800">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-[11px]">
                        {item.new_jute_bags || 0}N + {item.old_jute_bags || 0}O
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      {item.total_bags}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-950">
                      {Number(item.weight_quintals || 0).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-950">
                      ₹{item.rate_per_quintal || 2461}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      ₹{Number(item.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {item.synced_to_sheets ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSyncEntry(item)}
                          disabled={isSyncing === item.id}
                          className="inline-flex items-center gap-1 text-[11px] bg-blue-700 hover:bg-blue-800 text-white px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>{isSyncing === item.id ? 'Syncing...' : 'Sync Tab'}</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenJForm(item)}
                          title="Print J-Form Slip"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingEntry({ ...item })}
                          title="100% Full Entry Edit"
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer font-bold inline-flex items-center gap-1 text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>ਸੋਧੋ (Edit)</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ਕੀ ਤੁਸੀਂ ਕਿਸਾਨ ${displayedFarmerName} ਦੀ ਖਰੀਦ ਐਂਟਰੀ ਹਟਾਉਣੀ ਚਾਹੁੰਦੇ ਹੋ?`)) {
                              onDeleteEntry(item.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Main Government Purchase & J-Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-200 overflow-hidden my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-800 rounded-xl text-amber-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">ਨਵੀਂ ਸਰਕਾਰੀ ਖਰੀਦ ਤੇ ਜੇ-ਫਾਰਮ ਦਰਜ ਕਰੋ (Agency Purchase)</h3>
                  <p className="text-[11px] text-blue-200">
                    ਇੱਕੋ ਮਿਤੀ 'ਤੇ 10-20 ਕਿਸਾਨਾਂ ਦੀ ਏਜੰਸੀ ਖਰੀਦ ਬੈਚ ਵਿੱਚ ਦਰਜ ਕਰੋ • ਲਿੰਕਡ ਕਿਸਾਨਾਂ ਦੀ ਸੂਚੀ ਸ਼ਾਮਲ
                  </p>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center bg-blue-950/80 p-1 rounded-xl border border-blue-700/50">
                <button
                  type="button"
                  onClick={() => setModalMode('batch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    modalMode === 'batch'
                      ? 'bg-amber-400 text-blue-950 shadow-sm'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>ਮਲਟੀ-ਕਿਸਾਨ ਬੈਚ (10-20 ਕਿਸਾਨ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    modalMode === 'single'
                      ? 'bg-amber-400 text-blue-950 shadow-sm'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>ਸਿੰਗਲ ਕਿਸਾਨ</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-300 hover:text-white ml-2 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">

              {/* Section 1: Common Procurement Settings (Applied to all) */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-blue-950 font-bold border-b border-blue-200/60 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    ਖਰੀਦ ਮਿਤੀ, ਫਰਮ, ਮੰਡੀ ਤੇ ਏਜੰਸੀ ਸੈਟਿੰਗ (Shared Purchase Settings)
                  </span>
                  <span className="text-[11px] font-mono text-blue-800">
                    ਐੱਮ.ਐੱਸ.ਪੀ. ਰੇਟ: ₹{ratePerQtl}/Qtl • ਭਰਤੀ: {bagPackingKg} kg
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਆੜ੍ਹਤੀਆ ਫਰਮ (Firm):</label>
                    <select
                      value={selectedFirmId}
                      onChange={(e) => setSelectedFirmId(e.target.value)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-black text-blue-950 focus:outline-none"
                    >
                      {ARHTIA_FIRMS.map((firm) => (
                        <option key={firm.id} value={firm.id}>
                          {firm.name} ({firm.lic_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਦਾਣਾ ਮੰਡੀ (Mandi):</label>
                    <select
                      value={mandiName}
                      onChange={(e) => setMandiName(e.target.value)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-bold text-gray-900 focus:outline-none"
                    >
                      {MANDI_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਖਰੀਦ ਮਿਤੀ (Procurement Date):</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਸਰਕਾਰੀ ਏਜੰਸੀ (Agency):</label>
                    <select
                      value={agency}
                      onChange={(e) => setAgency(e.target.value)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg font-bold text-blue-950 focus:outline-none"
                    >
                      <option value="Pungrain (ਪਨਗਰੇਨ)">Pungrain (ਪਨਗਰੇਨ)</option>
                      <option value="Markfed (ਮਾਰਕਫੈੱਡ)">Markfed (ਮਾਰਕਫੈੱਡ)</option>
                      <option value="Punsup (ਪਨਸਪ)">Punsup (ਪਨਸਪ)</option>
                      <option value="Punjab State Warehousing (PSWC)">PSWC (ਵੇਅਰਹਾਊਸ)</option>
                      <option value="FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)">FCI (ਕੇਂਦਰੀ ਖੁਰਾਕ ਨਿਗਮ)</option>
                      <option value="Private Sheller / Miller">Private Miller (ਸ਼ੈਲਰ)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਫਸਲ (Crop):</label>
                    <select
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-900"
                    >
                      <option value="Paddy Grade A">Paddy Grade A (ਝੋਨਾ)</option>
                      <option value="Hybrid">Hybrid (ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ)</option>
                      <option value="PR-126">PR-126 (ਪੀ.ਆਰ.-126)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਵੈਰਾਇਟੀ (Variety):</label>
                    <select
                      value={cropVariety}
                      onChange={(e) => setCropVariety(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-bold text-emerald-950"
                    >
                      <option value="PR-126">PR-126</option>
                      <option value="PR-131">PR-131</option>
                      <option value="Pusa 44">Pusa 44</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Paddy Grade A">Paddy Grade A</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਸਰਕਾਰੀ ਰੇਟ (₹/Qtl Fix):</label>
                    <input
                      type="number"
                      value={ratePerQtl}
                      onChange={(e) => setRatePerQtl(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-blue-400 rounded-lg font-mono font-black text-blue-950"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਬੋਰੀ ਭਰਤੀ (kg/bag):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={bagPackingKg}
                      onChange={(e) => setBagPackingKg(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* MODE 1: MULTI-FARMER BATCH PROCUREMENT (10 to 20 Farmers) */}
              {modalMode === 'batch' && (
                <form onSubmit={handleSubmitBatch} className="space-y-4">
                  
                  {/* Farmer Selector Box with Linked Farmers */}
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3">
                    
                    {/* PRIMARY: Farmer Dropdown with Multi-time Selection */}
                    <div className="bg-white p-3 border-2 border-emerald-400 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <label className="block text-gray-900 font-black text-xs flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-700" />
                          <span>ਕਿਸਾਨ ਡ੍ਰੌਪਡਾਊਨ ਲਿਸਟ (Select Farmer Dropdown):</span>
                        </label>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                          ਇੱਕੋ ਕਿਸਾਨ ਨੂੰ ਵਾਰ-ਵਾਰ (Multi-time) ਜੋੜਨ ਦੀ ਖੁੱਲ੍ਹ
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <select
                          value={selectedDropdownFarmerKey}
                          onChange={(e) => setSelectedDropdownFarmerKey(e.target.value)}
                          className="w-full p-2.5 bg-emerald-50/70 border-2 border-emerald-400 focus:border-emerald-700 rounded-xl text-gray-900 font-bold text-xs focus:outline-none"
                        >
                          <option value="">-- ਕਿਸਾਨ ਚੁਣੋ (Select Farmer to Add) --</option>
                          {allSelectableFarmers.map((f) => (
                            <option key={`dd-${f.uniqueKey}`} value={f.uniqueKey}>
                              {f.nameEn} {f.namePa ? `(${f.namePa})` : ''} [{f.relation}] • ਪਿੰਡ: {f.village} • ਮੋ: {f.mobile}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedDropdownFarmerKey}
                          onClick={() => {
                            const found = allSelectableFarmers.find((f) => f.uniqueKey === selectedDropdownFarmerKey);
                            if (found) {
                              handleAddFarmerToBatch(found);
                            }
                          }}
                          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shrink-0 transition shadow-sm cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ ਕਿਸਾਨ ਜੋੜੋ (Add)</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950 text-xs">
                          ਜਾਂ ਹੇਠਾਂ ਕਿਸਾਨ ਕਾਰਡ ਤੋਂ ਸਿੱਧਾ ਜੋੜੋ (Quick Add Cards):
                        </span>
                        <span className="bg-emerald-800 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono">
                          {batchRows.length} ਲਿਸਟ ਵਿੱਚ ਹਨ
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          ਸਾਰੇ ਚੁਣੋ (Select All)
                        </button>
                        <button
                          type="button"
                          onClick={handleClearBatch}
                          className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          ਸਭ ਹਟਾਓ (Clear All)
                        </button>
                      </div>
                    </div>

                    {/* Search Bar for Farmers */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={farmerSearch}
                        onChange={(e) => setFarmerSearch(e.target.value)}
                        placeholder="ਕਿਸਾਨ ਦਾ ਨਾਮ, ਲਿੰਕਡ ਮੈਂਬਰ, ਪਿੰਡ ਜਾਂ ਮੋਬਾਈਲ ਨੰਬਰ ਖੋਜੋ..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-600 text-xs"
                      />
                    </div>

                    {/* Scrollable Farmers Multi-Select Grid */}
                    <div className="max-h-48 overflow-y-auto p-2 bg-white border border-emerald-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredFarmerChoices.length === 0 ? (
                        <div className="col-span-full py-4 text-center text-gray-400 text-xs">
                          ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ। Farmer Register ਵਿੱਚ ਨਵਾਂ ਕਿਸਾਨ ਜੋੜੋ।
                        </div>
                      ) : (
                        filteredFarmerChoices.map((item) => {
                          const count = batchRows.filter((r) => r.farmerItem.uniqueKey === item.uniqueKey).length;
                          return (
                            <div
                              key={`choice-${item.uniqueKey}`}
                              className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                                count > 0
                                  ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs'
                                  : 'bg-gray-50/70 border-gray-200 hover:bg-emerald-50/40'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-gray-900 text-xs truncate">
                                  {item.displayName}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {item.isLinked ? (
                                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold text-[9.5px]">
                                      {item.relation} (ਲਿੰਕਡ: {item.mainFarmerName})
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold text-[9.5px]">
                                      ਮੁੱਖ ਕਿਸਾਨ
                                    </span>
                                  )}
                                  <span className="text-gray-500 text-[10px] truncate">
                                    {item.village} • {item.mobile}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {count > 0 && (
                                  <span className="px-1.5 py-0.5 bg-amber-200 text-amber-950 font-black text-[10px] rounded-md font-mono">
                                    {count}x
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleAddFarmerToBatch(item)}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1"
                                  title="ਇਸ ਕਿਸਾਨ ਨੂੰ ਜੋੜੋ (ਵਾਰ-ਵਾਰ ਵੀ ਜੋੜ ਸਕਦੇ ਹੋ)"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>ਜੋੜੋ</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Batch Fast-Fill Utility Bar */}
                  {batchRows.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-700" />
                        <span className="font-bold text-amber-950">
                          ਸਾਰੇ ਚੁਣੇ {batchRows.length} ਕਿਸਾਨਾਂ 'ਤੇ ਬਰਾਬਰ ਬਾਰਦਾਨਾ ਲਗਾਓ:
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-gray-600">ਨਵਾਂ:</span>
                          <input
                            type="number"
                            value={quickNewBags}
                            onChange={(e) => setQuickNewBags(Number(e.target.value))}
                            className="w-16 p-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-gray-600">ਪੁਰਾਣਾ:</span>
                          <input
                            type="number"
                            value={quickOldBags}
                            onChange={(e) => setQuickOldBags(Number(e.target.value))}
                            className="w-16 p-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyQuickBagsToAll}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                        >
                          ਸਾਰਿਆਂ 'ਤੇ ਲਾਗੂ ਕਰੋ (Apply to All)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Batch Entries Table */}
                  {batchRows.length > 0 && (
                    <div className="border border-gray-300 rounded-xl overflow-hidden shadow-xs">
                      <div className="p-2.5 bg-gray-100 border-b border-gray-200 font-bold text-gray-800 flex items-center justify-between">
                        <span>ਚੁਣੇ ਹੋਏ {batchRows.length} ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ ਸੂਚੀ (Batch Table):</span>
                        <span className="text-[11px] font-normal text-gray-600">
                          ਵਜ਼ਨ = ਬੋਰੀਆਂ × 37.5 kg / 100 • ਰਕਮ = ਵਜ਼ਨ × ₹{ratePerQtl}
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-gray-50 text-gray-700 sticky top-0 border-b border-gray-200 z-10 font-bold">
                            <tr>
                              <th className="p-2 w-8">#</th>
                              <th className="p-2">ਕਿਸਾਨ ਤੇ ਲਿੰਕਡ ਮੈਂਬਰ (Farmer)</th>
                              <th className="p-2 text-center w-24">ਨਵਾਂ ਜੂਟ</th>
                              <th className="p-2 text-center w-24">ਪੁਰਾਣਾ ਜੂਟ</th>
                              <th className="p-2 text-right w-20">ਕੁੱਲ ਬੋਰੀਆਂ</th>
                              <th className="p-2 text-right w-28">ਵਜ਼ਨ (Qtl)</th>
                              <th className="p-2 text-right w-32">ਰਕਮ (₹ Gross)</th>
                              <th className="p-2 w-28">ਢੇਰੀ / ਗੇਟ ਪਾਸ</th>
                              <th className="p-2 text-center w-10">ਹਟਾਓ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {batchRows.map((row, idx) => (
                              <tr key={row.uniqueKey} className="hover:bg-blue-50/30 transition-colors">
                                <td className="p-2 font-mono text-gray-500 font-bold">{idx + 1}</td>
                                
                                <td className="p-2">
                                  <div className="font-bold text-gray-900">{row.farmerItem.displayName}</div>
                                  <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                    {row.farmerItem.isLinked && (
                                      <span className="text-purple-700 font-semibold">[{row.farmerItem.relation}]</span>
                                    )}
                                    <span>ਪਿੰਡ: {row.farmerItem.village}</span>
                                  </div>
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    value={row.newJuteBags}
                                    onChange={(e) => handleUpdateBatchRow(row.uniqueKey, 'newJuteBags', e.target.value)}
                                    className="w-20 p-1.5 bg-emerald-50/50 border border-emerald-300 rounded font-mono font-bold text-center"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    value={row.oldJuteBags}
                                    onChange={(e) => handleUpdateBatchRow(row.uniqueKey, 'oldJuteBags', e.target.value)}
                                    className="w-20 p-1.5 bg-amber-50/50 border border-amber-300 rounded font-mono font-bold text-center"
                                  />
                                </td>

                                <td className="p-2 text-right font-mono font-bold text-gray-900">
                                  {row.totalBags}
                                </td>

                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={row.weightQtl}
                                    onChange={(e) => handleUpdateBatchRow(row.uniqueKey, 'weightQtl', e.target.value)}
                                    className="w-24 p-1.5 bg-white border border-gray-300 rounded font-mono font-bold text-right text-emerald-950"
                                  />
                                </td>

                                <td className="p-2 text-right font-mono font-black text-blue-950">
                                  ₹{row.grossAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </td>

                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={row.lotGatePass}
                                    onChange={(e) => handleUpdateBatchRow(row.uniqueKey, 'lotGatePass', e.target.value)}
                                    placeholder="LOT-101"
                                    className="w-24 p-1.5 bg-white border border-gray-300 rounded font-mono text-xs"
                                  />
                                </td>

                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBatchRow(row.uniqueKey)}
                                    className="text-gray-400 hover:text-red-600 p-1 rounded"
                                    title="ਹਟਾਓ"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Batch Summary Bar */}
                      <div className="p-3 bg-emerald-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-emerald-300 text-[10px] block">ਕੁੱਲ ਕਿਸਾਨ</span>
                            <span className="font-bold text-sm font-mono">{batchTotalFarmers} Farmers</span>
                          </div>
                          <div>
                            <span className="text-emerald-300 text-[10px] block">ਨਵਾਂ + ਪੁਰਾਣਾ ਜੂਟ</span>
                            <span className="font-bold text-sm font-mono">{batchTotalNewBags}N + {batchTotalOldBags}O</span>
                          </div>
                          <div>
                            <span className="text-emerald-300 text-[10px] block">ਕੁੱਲ ਬੋਰੀਆਂ</span>
                            <span className="font-bold text-sm font-mono">{batchTotalBags} Bags</span>
                          </div>
                          <div>
                            <span className="text-emerald-300 text-[10px] block">ਕੁੱਲ ਸਰਕਾਰੀ ਵਜ਼ਨ</span>
                            <span className="font-bold text-sm font-mono">{batchTotalWeight.toFixed(2)} Qtl</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-amber-300 text-[11px] font-bold block">ਕੁੱਲ ਸਰਕਾਰੀ ਐੱਮ.ਐੱਸ.ਪੀ. ਰਕਮ</span>
                          <span className="font-black text-lg text-amber-300 font-mono">
                            ₹{batchTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Batch Save Action */}
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                      ਰੱਦ ਕਰੋ
                    </button>
                    <button
                      type="submit"
                      disabled={batchRows.length === 0}
                      className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>ਸਾਰੇ {batchRows.length} ਕਿਸਾਨਾਂ ਦੀ ਸਰਕਾਰੀ ਖਰੀਦ ਤੇ ਜੇ-ਫਾਰਮ ਦਰਜ ਕਰੋ</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                </form>
              )}

              {/* MODE 2: SINGLE FARMER PROCUREMENT (Without 3 Labor Boxes) */}
              {modalMode === 'single' && (
                <form onSubmit={handleSingleSubmit} className="space-y-4">
                  
                  {/* Farmer Selector showing Registered & Linked Farmers */}
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      ਕਿਸਾਨ ਮਾਸਟਰ / ਲਿੰਕਡ ਮੈਂਬਰ ਚੁਣੋ (Select Farmer or Linked Member):
                    </label>
                    <select
                      value={singleSelectedKey}
                      onChange={(e) => handleSingleFarmerSelect(e.target.value)}
                      className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-gray-900 font-bold focus:outline-none"
                    >
                      <option value="">-- ਕਿਸਾਨ ਚੁਣੋ ਜਾਂ ਹੇਠਾਂ ਨਵਾਂ ਨਾਮ ਭਰੋ --</option>
                      {allSelectableFarmers.map((item) => (
                        <option key={item.uniqueKey} value={item.uniqueKey}>
                          {item.displayName} - [{item.relation}] • ਪਿੰਡ: {item.village} • ਮੋਬਾਈਲ: {item.mobile}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name):</label>
                      <input
                        type="text"
                        value={singleFarmerName}
                        onChange={(e) => setSingleFarmerName(e.target.value)}
                        placeholder="Malkit Singh"
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਮ (Father/Husband):</label>
                      <input
                        type="text"
                        value={singleFatherHusband}
                        onChange={(e) => setSingleFatherHusband(e.target.value)}
                        placeholder="Harnek Singh"
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">ਪਿੰਡ / ਪਤਾ (Village/Address):</label>
                      <input
                        type="text"
                        value={singleVillage}
                        onChange={(e) => setSingleVillage(e.target.value)}
                        placeholder="Bhadaur / Barnala"
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">ਜੇ-ਫਾਰਮ ਕਿਸ ਦੇ ਨਾਮ ਕੱਟਣਾ ਹੈ (Billed To):</label>
                      <input
                        type="text"
                        value={singleBilledToName}
                        onChange={(e) => setSingleBilledToName(e.target.value)}
                        placeholder="Jaspreet Kaur"
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-blue-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">ਰਿਸ਼ਤਾ (Relation with Main Farmer):</label>
                      <input
                        type="text"
                        value={singleRelation}
                        onChange={(e) => setSingleRelation(e.target.value)}
                        placeholder="Wife (ਪਤਨੀ) / Self"
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Bags & Weight */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-950">ਨਵਾਂ ਤੇ ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ + 37.5 kg ਸਟੈਂਡਰਡ ਭਰਤੀ</span>
                      <span className="text-[11px] font-bold text-amber-800">ਕੁੱਲ: {singleTotalBags} Bags</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-gray-600 font-semibold mb-1">ਨਵਾਂ ਜੂਟ (New):</label>
                        <input
                          type="number"
                          value={singleNewJute}
                          onChange={(e) => handleSingleBagsChange(Number(e.target.value), singleOldJute)}
                          className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣਾ ਜੂਟ (Old):</label>
                        <input
                          type="number"
                          value={singleOldJute}
                          onChange={(e) => handleSingleBagsChange(singleNewJute, Number(e.target.value))}
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-600 font-semibold mb-1">ਵਜ਼ਨ (Quintals):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={singleWeightQtl}
                          onChange={(e) => setSingleWeightQtl(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-black text-emerald-900"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-600 font-semibold mb-1">ਰੇਟ (₹/Qtl):</label>
                        <input
                          type="number"
                          value={ratePerQtl}
                          onChange={(e) => setRatePerQtl(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-blue-400 rounded-lg font-mono font-black text-blue-950"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-gray-600 text-[11px] block">ਕੁੱਲ ਸਰਕਾਰੀ ਰਕਮ (Gross MSP Value)</span>
                      <div className="font-mono font-bold text-gray-900 text-sm">₹{singleGrossAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-800 text-[11px] font-bold block">ਨੈੱਟ ਅਦਾਇਗੀ (Net Payable)</span>
                      <div className="font-mono font-black text-lg text-emerald-950">₹{singleNetPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  {/* Single Save Action */}
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                      ਰੱਦ ਕਰੋ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                    >
                      ਖਰੀਦ ਐਂਟਰੀ ਸੇਵ ਕਰੋ (Save Purchase)
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 100% Full Edit Modal (Without 3 Labor Boxes) */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden my-auto">
            <div className="p-4 bg-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">100% ਪੂਰੀ ਖਰੀਦ ਐਂਟਰੀ ਐਡਿਟ ਕਰੋ (Full 100% Edit Purchase)</h3>
                  <p className="text-[10px] text-blue-200">ID: {editingEntry.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-gray-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਖਰੀਦ ਮਿਤੀ (Date):</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold font-mono text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਆੜ੍ਹਤੀਆ ਫਰਮ (Firm):</label>
                  <select
                    value={editingEntry.firm_id}
                    onChange={(e) => {
                      const f = ARHTIA_FIRMS.find((firm) => firm.id === e.target.value);
                      setEditingEntry({ ...editingEntry, firm_id: e.target.value, firm_name: f ? f.name : editingEntry.firm_name });
                    }}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    {ARHTIA_FIRMS.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਦਾਣਾ ਮੰਡੀ (Dana Mandi):</label>
                  <select
                    value={editingEntry.mandi_name || MANDI_LOCATIONS[0]}
                    onChange={(e) => setEditingEntry({ ...editingEntry, mandi_name: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    {MANDI_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਖਰੀਦ ਏਜੰਸੀ (Agency):</label>
                  <select
                    value={editingEntry.purchasing_agency || 'Pungrain (ਪਨਗਰੇਨ)'}
                    onChange={(e) => setEditingEntry({ ...editingEntry, purchasing_agency: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    <option value="Pungrain (ਪਨਗਰੇਨ)">Pungrain (ਪਨਗਰੇਨ)</option>
                    <option value="Markfed (ਮਾਰਕਫੈੱਡ)">Markfed (ਮਾਰਕਫੈੱਡ)</option>
                    <option value="Punsup (ਪਨਸਪ)">Punsup (ਪਨਸਪ)</option>
                    <option value="PSWC (ਵੇਅਰਹਾਊਸ)">PSWC (ਵੇਅਰਹਾਊਸ)</option>
                    <option value="FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)">FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਾਨ ਦਾ ਨਾਮ:</label>
                  <input
                    type="text"
                    value={editingEntry.farmer_name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, farmer_name: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਮ:</label>
                  <input
                    type="text"
                    value={editingEntry.father_husband_name || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, father_husband_name: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਪਿੰਡ / ਪਤਾ:</label>
                  <input
                    type="text"
                    value={editingEntry.address_village || editingEntry.village || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, address_village: e.target.value, village: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਨਵਾਂ ਜੂਟ:</label>
                  <input
                    type="number"
                    value={editingEntry.new_jute_bags || 0}
                    onChange={(e) => {
                      const n = Number(e.target.value) || 0;
                      const o = editingEntry.old_jute_bags || 0;
                      setEditingEntry({ ...editingEntry, new_jute_bags: n, total_bags: n + o });
                    }}
                    className="w-full p-1.5 bg-white border border-emerald-300 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣਾ ਜੂਟ:</label>
                  <input
                    type="number"
                    value={editingEntry.old_jute_bags || 0}
                    onChange={(e) => {
                      const o = Number(e.target.value) || 0;
                      const n = editingEntry.new_jute_bags || 0;
                      setEditingEntry({ ...editingEntry, old_jute_bags: o, total_bags: n + o });
                    }}
                    className="w-full p-1.5 bg-white border border-amber-300 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਵਜ਼ਨ Qtl:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEntry.weight_quintals}
                    onChange={(e) => setEditingEntry({ ...editingEntry, weight_quintals: Number(e.target.value) || 0 })}
                    className="w-full p-1.5 bg-white border border-gray-300 rounded font-mono font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਰੇਟ ₹:</label>
                  <input
                    type="number"
                    value={editingEntry.rate_per_quintal}
                    onChange={(e) => setEditingEntry({ ...editingEntry, rate_per_quintal: Number(e.target.value) || 2461 })}
                    className="w-full p-1.5 bg-white border border-blue-400 rounded font-mono font-bold text-blue-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md"
                >
                  ਸੋਧ ਸੇਵ ਕਰੋ (Update 100%)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      {isPdfModalOpen && (
        <AllEntryPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          entries={entries}
          registeredFarmers={registeredFarmers}
          initialFirmId={selectedFirmView !== 'All' ? selectedFirmView : (firmFilter !== 'All' ? firmFilter : selectedFirmId)}
          initialMandi={mandiFilter !== 'All' ? mandiFilter : mandiName}
          initialDate={selectedDateTab !== 'All' ? selectedDateTab : date}
        />
      )}

    </div>
  );
};
