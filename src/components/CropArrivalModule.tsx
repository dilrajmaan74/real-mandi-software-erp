import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CropArrivalEntry, 
  FarmerMaster, 
  GoogleSheetConfig, 
  MANDI_LOCATIONS, 
  AgencyPurchaseEntry,
  PADDY_VARIETIES 
} from '../types/mandi';
import { 
  Wheat, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  Trash2, 
  Calendar, 
  Truck, 
  Scale, 
  X,
  Droplets,
  FileText,
  UserCheck,
  Edit3,
  Layers,
  BarChart3,
  Clock,
  AlertCircle,
  Users,
  Check,
  ListPlus,
  MapPin,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingUp
} from 'lucide-react';
import { appendCropArrivalToSheets } from '../lib/sheets';
import { getSavedVillages, registerVillage, VillageItem } from '../lib/villages';

interface CropArrivalModuleProps {
  entries: CropArrivalEntry[];
  onAddEntry: (entry: CropArrivalEntry) => void;
  onAddBatchEntries?: (entries: CropArrivalEntry[]) => void;
  onUpdateEntry: (entry: CropArrivalEntry) => void;
  onDeleteEntry: (id: string) => void;
  registeredFarmers: FarmerMaster[];
  agencyPurchases?: AgencyPurchaseEntry[];
  token: string | null;
  sheetConfig: GoogleSheetConfig | null;
  onOpenSheetModal: () => void;
}

export const CropArrivalModule: React.FC<CropArrivalModuleProps> = ({
  entries,
  onAddEntry,
  onAddBatchEntries,
  onUpdateEntry,
  onDeleteEntry,
  registeredFarmers,
  agencyPurchases = [],
  token,
  sheetConfig,
  onOpenSheetModal,
}) => {
  // Navigation tabs within Crop Arrival
  const [activeTab, setActiveTab] = useState<'list' | 'batch' | 'comparison'>('list');

  // Single Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CropArrivalEntry | null>(null);
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('All');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Form states for Single Entry (Default Bags set to ZERO 0)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mandiName, setMandiName] = useState('Mandi Kamalpur (ਕਮਾਲਪੁਰ)');
  const [farmerId, setFarmerId] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [farmerNamePa, setFarmerNamePa] = useState('');
  const [fatherHusbandName, setFatherHusbandName] = useState('');
  const [village, setVillage] = useState('');
  const [villagePa, setVillagePa] = useState('');
  const [mobile, setMobile] = useState('');
  const [cropType, setCropType] = useState('Paddy Grade A');
  const [cropVariety, setCropVariety] = useState('PR-126');
  const [vehicleNo, setVehicleNo] = useState('');
  const [bagPackingKg, setBagPackingKg] = useState<number>(37.5);
  const [newJuteBags, setNewJuteBags] = useState<number>(0);
  const [oldJuteBags, setOldJuteBags] = useState<number>(0);
  const totalBags = Number(newJuteBags || 0) + Number(oldJuteBags || 0);
  const [looseWeightKg, setLooseWeightKg] = useState<number>(0);
  const [weightQtl, setWeightQtl] = useState<number>(0);
  const [moisture, setMoisture] = useState<number>(16.5);
  const [parchiNo, setParchiNo] = useState(`PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // 3 Dedicated Labor / Deduction Boxes
  const [laborRate, setLaborRate] = useState<number>(8);
  const [enableSukhiKiti, setEnableSukhiKiti] = useState<boolean>(false);
  const [sukhiKitiRate, setSukhiKitiRate] = useState<number>(5);
  const [enableDoublePakha, setEnableDoublePakha] = useState<boolean>(false);
  const [doublePakhaRate, setDoublePakhaRate] = useState<number>(4);

  // --- BATCH ENTRY MODE STATES (Default Bags set to ZERO 0) ---
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchEntryDate, setBatchEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchMandi, setBatchMandi] = useState('Mandi Kamalpur (ਕਮਾਲਪੁਰ)');
  const [stagedEntries, setStagedEntries] = useState<CropArrivalEntry[]>([]);
  
  // Staging Row Form states
  const [batchFarmerId, setBatchFarmerId] = useState('');
  const [batchFarmerSearchText, setBatchFarmerSearchText] = useState('');
  const [isFarmerSearchOpen, setIsFarmerSearchOpen] = useState(false);
  const batchFarmerSearchRef = useRef<HTMLDivElement>(null);

  const [batchFarmerName, setBatchFarmerName] = useState('');
  const [batchFarmerNamePa, setBatchFarmerNamePa] = useState('');
  const [batchFatherName, setBatchFatherName] = useState('');
  const [batchVillage, setBatchVillage] = useState('');
  const [batchVillagePa, setBatchVillagePa] = useState('');
  const [batchMobile, setBatchMobile] = useState('');
  const [batchCropType, setBatchCropType] = useState('Paddy Grade A');
  const [batchCropVariety, setBatchCropVariety] = useState('PR-126');
  const [batchVehicleNo, setBatchVehicleNo] = useState('');
  const [batchNewBags, setBatchNewBags] = useState<number>(0);
  const [batchOldBags, setBatchOldBags] = useState<number>(0);
  const [batchLooseKg, setBatchLooseKg] = useState<number>(0);
  const [batchMoisture, setBatchMoisture] = useState<number>(17);
  const [batchParchiNo, setBatchParchiNo] = useState(`PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // Batch 3 Labor & Cleaning Deduction states
  const [batchLaborRate, setBatchLaborRate] = useState<number>(8);
  const [batchEnableSukhiKiti, setBatchEnableSukhiKiti] = useState<boolean>(false);
  const [batchSukhiKitiRate, setBatchSukhiKitiRate] = useState<number>(5);
  const [batchEnableDoublePakha, setBatchEnableDoublePakha] = useState<boolean>(false);
  const [batchDoublePakhaRate, setBatchDoublePakhaRate] = useState<number>(4);

  // Comparison Tab Search & Filter
  const [compSearch, setCompSearch] = useState('');
  const [compStatusFilter, setCompStatusFilter] = useState<'All' | 'Pending' | 'Completed' | 'Over' | 'Linked' | 'Duplicate'>('All');
  const [expandedFarmerKeys, setExpandedFarmerKeys] = useState<Record<string, boolean>>({});

  const toggleFarmerExpand = (key: string) => {
    setExpandedFarmerKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Dynamic Village Master List
  const [savedVillages, setSavedVillages] = useState<VillageItem[]>(() => getSavedVillages());

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (batchFarmerSearchRef.current && !batchFarmerSearchRef.current.contains(e.target as Node)) {
        setIsFarmerSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time farmer search filtering for Batch Mode
  const filteredBatchFarmers = useMemo(() => {
    const q = batchFarmerSearchText.trim().toLowerCase();
    if (!q) return registeredFarmers.slice(0, 40);
    return registeredFarmers.filter((f) => {
      const matchNameEn = f.name_en.toLowerCase().includes(q);
      const matchNamePa = (f.name_pa || '').toLowerCase().includes(q);
      const matchFatherEn = (f.father_husband_name_en || '').toLowerCase().includes(q);
      const matchFatherPa = (f.father_husband_name_pa || '').toLowerCase().includes(q);
      const matchVillageEn = f.village_en.toLowerCase().includes(q);
      const matchVillagePa = (f.village_pa || '').toLowerCase().includes(q);
      const matchMobile = (f.mobile_number || '').includes(q);
      return matchNameEn || matchNamePa || matchFatherEn || matchFatherPa || matchVillageEn || matchVillagePa || matchMobile;
    });
  }, [registeredFarmers, batchFarmerSearchText]);

  useEffect(() => {
    const handleVillageUpdate = () => {
      setSavedVillages(getSavedVillages());
    };
    window.addEventListener('kisanmitra_villages_updated', handleVillageUpdate);
    return () => window.removeEventListener('kisanmitra_villages_updated', handleVillageUpdate);
  }, []);

  // Auto calculate weight when bags, loose kg, or packing changes:
  const recalculateWeight = (newJ: number, oldJ: number, packing: number, looseKg: number) => {
    const tot = newJ + oldJ;
    const calcWeight = Number((((tot * packing) + looseKg) / 100).toFixed(2));
    setWeightQtl(calcWeight);
  };

  const handleBagsChange = (newJ: number, oldJ: number) => {
    setNewJuteBags(newJ);
    setOldJuteBags(oldJ);
    recalculateWeight(newJ, oldJ, bagPackingKg, looseWeightKg);
  };

  const handlePackingChange = (packing: number) => {
    setBagPackingKg(packing);
    recalculateWeight(newJuteBags, oldJuteBags, packing, looseWeightKg);
  };

  const handleLooseWeightChange = (looseKg: number) => {
    setLooseWeightKg(looseKg);
    recalculateWeight(newJuteBags, oldJuteBags, bagPackingKg, looseKg);
  };

  // Labor deductions calculations
  const laborTotal = Number((totalBags * laborRate).toFixed(2));
  const sukhiKitiTotal = enableSukhiKiti ? Number((totalBags * sukhiKitiRate).toFixed(2)) : 0;
  const doublePakhaTotal = enableDoublePakha ? Number((totalBags * doublePakhaRate).toFixed(2)) : 0;
  const totalLaborDeductions = Number((laborTotal + sukhiKitiTotal + doublePakhaTotal).toFixed(2));

  const handleFarmerSelect = (fId: string) => {
    setFarmerId(fId);
    const found = registeredFarmers.find((f) => f.id === fId);
    if (found) {
      setFarmerName(found.name_en);
      setFarmerNamePa(found.name_pa);
      setFatherHusbandName(found.father_husband_name_en || found.father_husband_name_pa || '');
      setVillage(found.village_en);
      setVillagePa(found.village_pa);
      setMobile(found.mobile_number);
    }
  };

  const handleBatchFarmerSelect = (fId: string) => {
    setBatchFarmerId(fId);
    const found = registeredFarmers.find((f) => f.id === fId);
    if (found) {
      setBatchFarmerName(found.name_en);
      setBatchFarmerNamePa(found.name_pa);
      setBatchFatherName(found.father_husband_name_en || found.father_husband_name_pa || '');
      setBatchVillage(found.village_en);
      setBatchVillagePa(found.village_pa);
      setBatchMobile(found.mobile_number);
    }
  };

  const resetSingleForm = () => {
    setFarmerId('');
    setFarmerName('');
    setFarmerNamePa('');
    setFatherHusbandName('');
    setVillage('');
    setVillagePa('');
    setMobile('');
    setVehicleNo('');
    setNewJuteBags(0);
    setOldJuteBags(0);
    setLooseWeightKg(0);
    setBagPackingKg(37.5);
    setWeightQtl(0);
    setLaborRate(8);
    setEnableSukhiKiti(false);
    setSukhiKitiRate(5);
    setEnableDoublePakha(false);
    setDoublePakhaRate(4);
    setParchiNo(`PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName.trim()) {
      alert('ਕਿਸਾਨ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ ਜਾਂ ਚੁਣੋ');
      return;
    }

    const currentParchi = parchiNo.trim() || `PR-${Date.now().toString().slice(-4)}`;

    const newEntry: CropArrivalEntry = {
      id: `ARR-${Date.now().toString().slice(-5)}`,
      date,
      mandi_name: mandiName,
      farmer_id: farmerId || undefined,
      farmer_name: farmerName.trim(),
      farmer_name_pa: farmerNamePa.trim(),
      father_husband_name: fatherHusbandName.trim() || undefined,
      village: village.trim(),
      village_pa: villagePa.trim(),
      mobile: mobile.trim(),
      crop_type: cropType,
      crop_variety: cropVariety,
      vehicle_trolley_no: vehicleNo.trim() || 'Tractor Trolley',
      bag_packing_kg: Number(bagPackingKg) || 37.5,
      new_jute_bags: Number(newJuteBags) || 0,
      old_jute_bags: Number(oldJuteBags) || 0,
      total_bags_arrived: totalBags,
      loose_weight_kg: Number(looseWeightKg) || 0,
      weight_quintals: Number(weightQtl) || 0,
      moisture_percentage: Number(moisture) || 17,
      parchi_no: currentParchi,
      gate_pass_no: currentParchi,
      labor_rate: laborRate,
      labor_total: laborTotal,
      sukhi_kiti_rate: enableSukhiKiti ? sukhiKitiRate : 0,
      sukhi_kiti_total: sukhiKitiTotal,
      double_pakha_rate: enableDoublePakha ? doublePakhaRate : 0,
      double_pakha_total: doublePakhaTotal,
      total_labor_deductions: totalLaborDeductions,
      synced_to_sheets: false,
    };

    if (village.trim()) {
      registerVillage(village.trim(), villagePa.trim());
    }

    onAddEntry(newEntry);
    setIsModalOpen(false);
    resetSingleForm();
  };

  // --- BATCH STAGING HANDLERS ---
  const handleAddToBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFarmerName.trim()) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ ਜਾਂ ਚੁਣੋ');
      return;
    }

    const totBags = Number(batchNewBags || 0) + Number(batchOldBags || 0);
    if (totBags <= 0) {
      alert('ਕੁੱਲ ਗੱਟਿਆਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ');
      return;
    }

    const calculatedWeight = Number((((totBags * 37.5) + Number(batchLooseKg || 0)) / 100).toFixed(2));
    const currentParchi = batchParchiNo.trim() || `PR-${Date.now().toString().slice(-4)}`;

    const bLaborRate = Number(batchLaborRate) >= 0 ? Number(batchLaborRate) : 8;
    const bSukhiRate = batchEnableSukhiKiti ? Number(batchSukhiKitiRate || 0) : 0;
    const bDoubleRate = batchEnableDoublePakha ? Number(batchDoublePakhaRate || 0) : 0;

    const bLaborTotal = Number((totBags * bLaborRate).toFixed(2));
    const bSukhiTotal = Number((totBags * bSukhiRate).toFixed(2));
    const bDoubleTotal = Number((totBags * bDoubleRate).toFixed(2));
    const bTotalDeductions = Number((bLaborTotal + bSukhiTotal + bDoubleTotal).toFixed(2));

    const stagedItem: CropArrivalEntry = {
      id: `ARR-B-${Date.now().toString().slice(-4)}-${stagedEntries.length + 1}`,
      date: batchEntryDate || batchDate,
      mandi_name: batchMandi,
      farmer_id: batchFarmerId || undefined,
      farmer_name: batchFarmerName.trim(),
      farmer_name_pa: batchFarmerNamePa.trim(),
      father_husband_name: batchFatherName.trim() || undefined,
      village: batchVillage.trim(),
      village_pa: batchVillagePa.trim(),
      mobile: batchMobile.trim(),
      crop_type: batchCropType,
      crop_variety: batchCropVariety,
      vehicle_trolley_no: batchVehicleNo.trim() || 'Tractor Trolley',
      bag_packing_kg: 37.5,
      new_jute_bags: Number(batchNewBags) || 0,
      old_jute_bags: Number(batchOldBags) || 0,
      total_bags_arrived: totBags,
      loose_weight_kg: Number(batchLooseKg) || 0,
      weight_quintals: calculatedWeight,
      moisture_percentage: Number(batchMoisture) || 17,
      parchi_no: currentParchi,
      gate_pass_no: currentParchi,
      labor_rate: bLaborRate,
      labor_total: bLaborTotal,
      sukhi_kiti_rate: bSukhiRate,
      sukhi_kiti_total: bSukhiTotal,
      double_pakha_rate: bDoubleRate,
      double_pakha_total: bDoubleTotal,
      total_labor_deductions: bTotalDeductions,
      synced_to_sheets: false,
    };

    if (batchVillage.trim()) {
      registerVillage(batchVillage.trim(), batchVillagePa.trim());
    }

    setStagedEntries((prev) => [...prev, stagedItem]);

    // Reset input row for next farmer (keep batchEntryDate for rapid entry)
    setBatchFarmerId('');
    setBatchFarmerSearchText('');
    setBatchFarmerName('');
    setBatchFarmerNamePa('');
    setBatchFatherName('');
    setBatchVillage('');
    setBatchVillagePa('');
    setBatchMobile('');
    setBatchVehicleNo('');
    setBatchNewBags(0);
    setBatchOldBags(0);
    setBatchLooseKg(0);
    setBatchParchiNo(`PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setBatchEnableSukhiKiti(false);
    setBatchEnableDoublePakha(false);
  };

  const handleUpdateStagedDate = (id: string, newDate: string) => {
    setStagedEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, date: newDate } : item))
    );
  };

  const handleRemoveStagedItem = (id: string) => {
    setStagedEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const uniqueBatchDates = useMemo(() => {
    return Array.from(new Set(stagedEntries.map((e) => e.date))).filter(Boolean);
  }, [stagedEntries]);

  const handleSaveAllBatch = () => {
    if (stagedEntries.length === 0) {
      alert('ਕੋਈ ਵੀ ਐਂਟਰੀ ਲਿਸਟ ਵਿੱਚ ਨਹੀਂ ਹੈ। ਪਹਿਲਾਂ ਕਿਸਾਨ ਦੀ ਐਂਟਰੀ ਜੋੜੋ।');
      return;
    }

    if (onAddBatchEntries) {
      onAddBatchEntries(stagedEntries);
    } else {
      stagedEntries.forEach((entry) => onAddEntry(entry));
    }

    const dateSummary = uniqueBatchDates.length > 1
      ? `${uniqueBatchDates.length} ਵੱਖ-ਵੱਖ ਮਿਤੀਆਂ (${uniqueBatchDates.join(', ')})`
      : `ਮਿਤੀ ${uniqueBatchDates[0] || batchDate}`;

    alert(`${dateSummary} ਦੀਆਂ ਕੁੱਲ ${stagedEntries.length} ਐਂਟਰੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈਆਂ!`);
    setStagedEntries([]);
    setActiveTab('list');
  };

  const openEditModal = (entry: CropArrivalEntry) => {
    setEditingEntry({ ...entry });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const totBags = Number(editingEntry.new_jute_bags || 0) + Number(editingEntry.old_jute_bags || 0);
    const packing = editingEntry.bag_packing_kg || 37.5;
    const loose = Number(editingEntry.loose_weight_kg || 0);
    const calculatedWeight = editingEntry.weight_quintals || Number((((totBags * packing) + loose) / 100).toFixed(2));

    const lRate = editingEntry.labor_rate !== undefined ? editingEntry.labor_rate : 8;
    const lTotal = Number((totBags * lRate).toFixed(2));
    const sRate = editingEntry.sukhi_kiti_rate || 0;
    const sTotal = Number((totBags * sRate).toFixed(2));
    const dRate = editingEntry.double_pakha_rate || 0;
    const dTotal = Number((totBags * dRate).toFixed(2));
    const totDeductions = Number((lTotal + sTotal + dTotal).toFixed(2));

    const updatedParchi = editingEntry.parchi_no || editingEntry.gate_pass_no;

    const updated: CropArrivalEntry = {
      ...editingEntry,
      parchi_no: updatedParchi,
      gate_pass_no: updatedParchi,
      total_bags_arrived: totBags > 0 ? totBags : editingEntry.total_bags_arrived,
      weight_quintals: calculatedWeight,
      labor_rate: lRate,
      labor_total: lTotal,
      sukhi_kiti_rate: sRate,
      sukhi_kiti_total: sTotal,
      double_pakha_rate: dRate,
      double_pakha_total: dTotal,
      total_labor_deductions: totDeductions,
    };

    if (updated.village) {
      registerVillage(updated.village, updated.village_pa);
    }

    onUpdateEntry(updated);
    setEditingEntry(null);
  };

  const handleSyncEntry = async (entry: CropArrivalEntry) => {
    if (!token || !sheetConfig) {
      onOpenSheetModal();
      return;
    }

    setIsSyncing(entry.id);
    try {
      await appendCropArrivalToSheets(token, sheetConfig.spreadsheetId, entry);
      entry.synced_to_sheets = true;
      alert(`ਆਵਕ ਐਂਟਰੀ Google Sheets (Crop_Arrival_Inward tab) ਵਿੱਚ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ!`);
    } catch (err: any) {
      console.error(err);
      alert('ਗੂਗਲ ਸ਼ੀਟ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵਿੱਚ ਦਿੱਕਤ ਆਈ: ' + err.message);
    } finally {
      setIsSyncing(null);
    }
  };

  // AUTOMATIC CHRONOLOGICAL SORTING BY DATE DESCENDING:
  // If an entry for 10/10/2026 is added after 12/10/2026, it will automatically place into date order!
  const sortedAndFilteredEntries = useMemo(() => {
    const q = search.toLowerCase();
    return [...entries]
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeB !== timeA) return timeB - timeA; // Newest date first
        return (b.id || '').localeCompare(a.id || '');
      })
      .filter((e) => {
        const pNo = e.parchi_no || e.gate_pass_no || '';
        const matchSearch =
          e.farmer_name.toLowerCase().includes(q) ||
          (e.farmer_name_pa && e.farmer_name_pa.includes(q)) ||
          e.village.toLowerCase().includes(q) ||
          pNo.toLowerCase().includes(q) ||
          (e.mandi_name && e.mandi_name.toLowerCase().includes(q));
        const matchCrop = cropFilter === 'All' || e.crop_type.includes(cropFilter) || e.crop_variety.includes(cropFilter);
        return matchSearch && matchCrop;
      });
  }, [entries, search, cropFilter]);

  const totalQuintals = entries.reduce((acc, curr) => acc + (curr.weight_quintals || 0), 0);
  const totalBagsCount = entries.reduce((acc, curr) => acc + (curr.total_bags_arrived || 0), 0);

  // --- FARMER ARRIVAL VS PURCHASE COMPARISON DATA ---
  // Calculates for each farmer: Arrived bags, Own purchased bags, Linked family member purchased bags, and remaining balance bags
  // 100% collision-free, distinguishes duplicate names by father/husband name & village, and properly attributes linked farmer purchases
  const comparisonData = useMemo(() => {
    const cleanStr = (s?: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

    // 1. Identify all duplicate names across registered farmers
    const regNameCounts = new Map<string, number>();
    registeredFarmers.forEach((rf) => {
      const n = cleanStr(rf.name_en);
      if (n) regNameCounts.set(n, (regNameCounts.get(n) || 0) + 1);
    });

    // 2. Seed farmer map with registered farmers keyed by their UNIQUE ID
    const farmerMap = new Map<string, {
      uniqueKey: string;
      farmer_id?: string;
      name_en: string;
      name_pa: string;
      father_husband_name_en: string;
      father_husband_name_pa?: string;
      village_en: string;
      village_pa?: string;
      mobile: string;
      aadhaar?: string;
      isRegistered: boolean;
      isDuplicateName: boolean;
      arrived_bags: number;
      arrived_new_bags: number;
      arrived_old_bags: number;
      arrived_quintals: number;
      arrivals: {
        id: string;
        date: string;
        parchi_no?: string;
        trolley_no?: string;
        bags: number;
        new_bags: number;
        old_bags: number;
        quintals: number;
        variety: string;
      }[];
      own_purchased_bags: number;
      own_purchased_quintals: number;
      linked_farmers: {
        id: string;
        name_en: string;
        name_pa: string;
        relation: string;
        mobile: string;
        bags: number;
        quintals: number;
        purchases: {
          id: string;
          date: string;
          agency: string;
          firm_name: string;
          bags: number;
          quintals: number;
          rate: number;
          amount: number;
        }[];
      }[];
      linked_purchased_bags: number;
      linked_purchased_quintals: number;
      total_purchased_bags: number;
      total_purchased_quintals: number;
      balance_bags: number;
      balance_quintals: number;
      purchases: {
        id: string;
        date: string;
        agency: string;
        firm_name: string;
        billed_to_name: string;
        relation: string;
        is_linked: boolean;
        bags: number;
        quintals: number;
        rate: number;
        amount: number;
      }[];
    }>();

    registeredFarmers.forEach((rf) => {
      const isDup = (regNameCounts.get(cleanStr(rf.name_en)) || 0) > 1;
      farmerMap.set(rf.id, {
        uniqueKey: rf.id,
        farmer_id: rf.id,
        name_en: rf.name_en,
        name_pa: rf.name_pa || rf.name_en,
        father_husband_name_en: rf.father_husband_name_en || '',
        father_husband_name_pa: rf.father_husband_name_pa || '',
        village_en: rf.village_en || '',
        village_pa: rf.village_pa || '',
        mobile: rf.mobile_number || '',
        aadhaar: rf.aadhaar_number || '',
        isRegistered: true,
        isDuplicateName: isDup,
        arrived_bags: 0,
        arrived_new_bags: 0,
        arrived_old_bags: 0,
        arrived_quintals: 0,
        arrivals: [],
        own_purchased_bags: 0,
        own_purchased_quintals: 0,
        linked_farmers: (rf.linked_farmers || []).map((lf) => ({
          id: lf.id,
          name_en: lf.name_en,
          name_pa: lf.name_pa || lf.name_en,
          relation: lf.relation || 'Linked Member',
          mobile: lf.mobile_number || '',
          bags: 0,
          quintals: 0,
          purchases: [],
        })),
        linked_purchased_bags: 0,
        linked_purchased_quintals: 0,
        total_purchased_bags: 0,
        total_purchased_quintals: 0,
        balance_bags: 0,
        balance_quintals: 0,
        purchases: [],
      });
    });

    // Helper: find registered farmer by composite matching
    const findRegisteredFarmer = (
      fid?: string,
      name?: string,
      father?: string,
      village?: string,
      mobile?: string
    ) => {
      if (fid && farmerMap.has(fid)) {
        return farmerMap.get(fid);
      }
      const cName = cleanStr(name);
      if (!cName) return undefined;

      const cFather = cleanStr(father);
      const cVillage = cleanStr(village);
      const cMobile = cleanStr(mobile);

      const candidates = Array.from(farmerMap.values()).filter((r) => {
        return (
          cleanStr(r.name_en) === cName ||
          cleanStr(r.name_pa) === cName
        );
      });

      if (candidates.length === 1) {
        return candidates[0];
      }

      if (candidates.length > 1) {
        if (cFather) {
          const matchFather = candidates.find(
            (c) =>
              cleanStr(c.father_husband_name_en) === cFather ||
              cleanStr(c.father_husband_name_pa) === cFather
          );
          if (matchFather) return matchFather;
        }
        if (cVillage) {
          const matchVillage = candidates.find(
            (c) =>
              cleanStr(c.village_en) === cVillage ||
              cleanStr(c.village_pa) === cVillage
          );
          if (matchVillage) return matchVillage;
        }
        if (cMobile) {
          const matchMobile = candidates.find((c) => cleanStr(c.mobile) === cMobile);
          if (matchMobile) return matchMobile;
        }
        return candidates[0];
      }

      return undefined;
    };

    // 3. Process Arrivals
    entries.forEach((arr) => {
      let rec = findRegisteredFarmer(
        arr.farmer_id,
        arr.farmer_name,
        arr.father_husband_name,
        arr.village,
        arr.mobile
      );

      if (!rec) {
        // Create an unregistered farmer record with unique composite key
        const unregKey = `UNREG_${cleanStr(arr.farmer_name)}_${cleanStr(arr.father_husband_name || '')}_${cleanStr(arr.village || '')}`;
        rec = farmerMap.get(unregKey);
        if (!rec) {
          rec = {
            uniqueKey: unregKey,
            farmer_id: arr.farmer_id,
            name_en: arr.farmer_name,
            name_pa: arr.farmer_name_pa || arr.farmer_name,
            father_husband_name_en: arr.father_husband_name || '',
            father_husband_name_pa: arr.father_husband_name_pa || '',
            village_en: arr.village || '',
            village_pa: arr.village_pa || '',
            mobile: arr.mobile || '',
            isRegistered: false,
            isDuplicateName: false,
            arrived_bags: 0,
            arrived_new_bags: 0,
            arrived_old_bags: 0,
            arrived_quintals: 0,
            arrivals: [],
            own_purchased_bags: 0,
            own_purchased_quintals: 0,
            linked_farmers: [],
            linked_purchased_bags: 0,
            linked_purchased_quintals: 0,
            total_purchased_bags: 0,
            total_purchased_quintals: 0,
            balance_bags: 0,
            balance_quintals: 0,
            purchases: [],
          };
          farmerMap.set(unregKey, rec);
        }
      }

      const arrBags = Number(arr.total_bags_arrived || 0);
      const arrWt = Number(arr.weight_quintals || 0);
      rec.arrived_bags += arrBags;
      rec.arrived_new_bags += Number(arr.new_jute_bags || 0);
      rec.arrived_old_bags += Number(arr.old_jute_bags || 0);
      rec.arrived_quintals = Number((rec.arrived_quintals + arrWt).toFixed(2));
      rec.arrivals.push({
        id: arr.id,
        date: arr.date,
        parchi_no: arr.parchi_no || arr.gate_pass_no,
        trolley_no: arr.vehicle_trolley_no,
        bags: arrBags,
        new_bags: Number(arr.new_jute_bags || 0),
        old_bags: Number(arr.old_jute_bags || 0),
        quintals: arrWt,
        variety: arr.crop_variety || arr.crop_type || 'PR-126',
      });
    });

    // 4. Process Agency Purchases (Both Main Farmer & Linked Farmer purchases)
    agencyPurchases.forEach((pur) => {
      const purBags = Number(pur.total_bags || 0);
      const purWt = Number(pur.weight_quintals || 0);
      const purAmt = Number(pur.total_amount || 0);
      const purRate = Number(pur.rate_per_quintal || 2461);
      const cPurFarmer = cleanStr(pur.farmer_name);
      const cBilledTo = cleanStr(pur.billed_to_name);

      // Check A: Is this purchase for a LINKED FARMER of a registered farmer?
      let linkedOwner: ReturnType<typeof farmerMap.get> | undefined;
      let matchedLinkedMember: (typeof farmerMap extends Map<any, infer V> ? V : never)['linked_farmers'][0] | undefined;

      // Method 1: If pur has farmer_id of the main registered farmer
      if (pur.farmer_id && farmerMap.has(pur.farmer_id)) {
        const potentialOwner = farmerMap.get(pur.farmer_id)!;
        const foundLf = potentialOwner.linked_farmers.find(
          (lf) =>
            cleanStr(lf.name_en) === cPurFarmer ||
            cleanStr(lf.name_pa) === cPurFarmer ||
            cleanStr(lf.name_en) === cBilledTo ||
            cleanStr(lf.name_pa) === cBilledTo
        );
        if (foundLf || (pur.relation_with_main && pur.relation_with_main !== 'Self')) {
          linkedOwner = potentialOwner;
          matchedLinkedMember = foundLf;
        }
      }

      // Method 2: If not found yet, check all registered farmers for matching linked member
      if (!linkedOwner) {
        for (const rfRec of farmerMap.values()) {
          const foundLf = rfRec.linked_farmers.find(
            (lf) =>
              cleanStr(lf.name_en) === cPurFarmer ||
              cleanStr(lf.name_pa) === cPurFarmer ||
              cleanStr(lf.name_en) === cBilledTo ||
              cleanStr(lf.name_pa) === cBilledTo
          );
          if (foundLf) {
            linkedOwner = rfRec;
            matchedLinkedMember = foundLf;
            break;
          }
        }
      }

      // If matched as a Linked Farmer Purchase:
      if (linkedOwner) {
        linkedOwner.linked_purchased_bags += purBags;
        linkedOwner.linked_purchased_quintals = Number((linkedOwner.linked_purchased_quintals + purWt).toFixed(2));

        if (!matchedLinkedMember) {
          const dynName = pur.billed_to_name || pur.farmer_name;
          matchedLinkedMember = {
            id: `LF-DYN-${Date.now().toString().slice(-4)}`,
            name_en: dynName,
            name_pa: dynName,
            relation: pur.relation_with_main || 'Family Member',
            mobile: pur.mobile || '',
            bags: 0,
            quintals: 0,
            purchases: [],
          };
          linkedOwner.linked_farmers.push(matchedLinkedMember);
        }

        matchedLinkedMember.bags += purBags;
        matchedLinkedMember.quintals = Number((matchedLinkedMember.quintals + purWt).toFixed(2));
        matchedLinkedMember.purchases.push({
          id: pur.id,
          date: pur.date,
          agency: pur.purchasing_agency,
          firm_name: pur.firm_name,
          bags: purBags,
          quintals: purWt,
          rate: purRate,
          amount: purAmt,
        });

        linkedOwner.purchases.push({
          id: pur.id,
          date: pur.date,
          agency: pur.purchasing_agency,
          firm_name: pur.firm_name,
          billed_to_name: pur.billed_to_name || pur.farmer_name,
          relation: pur.relation_with_main || matchedLinkedMember.relation || 'Linked Member',
          is_linked: true,
          bags: purBags,
          quintals: purWt,
          rate: purRate,
          amount: purAmt,
        });
        return;
      }

      // Check B: It is an OWN PURCHASE of a Main Farmer
      let mainRec = findRegisteredFarmer(
        pur.farmer_id,
        pur.farmer_name,
        pur.father_husband_name,
        pur.village || pur.address_village,
        pur.mobile
      );

      if (!mainRec) {
        // Try unregistered
        const unregKey = `UNREG_${cleanStr(pur.farmer_name)}_${cleanStr(pur.father_husband_name || '')}_${cleanStr(pur.village || pur.address_village || '')}`;
        mainRec = farmerMap.get(unregKey);
        if (!mainRec) {
          mainRec = {
            uniqueKey: unregKey,
            farmer_id: pur.farmer_id,
            name_en: pur.farmer_name,
            name_pa: pur.farmer_name,
            father_husband_name_en: pur.father_husband_name || '',
            village_en: pur.village || pur.address_village || '',
            mobile: pur.mobile || '',
            isRegistered: false,
            isDuplicateName: false,
            arrived_bags: 0,
            arrived_new_bags: 0,
            arrived_old_bags: 0,
            arrived_quintals: 0,
            arrivals: [],
            own_purchased_bags: 0,
            own_purchased_quintals: 0,
            linked_farmers: [],
            linked_purchased_bags: 0,
            linked_purchased_quintals: 0,
            total_purchased_bags: 0,
            total_purchased_quintals: 0,
            balance_bags: 0,
            balance_quintals: 0,
            purchases: [],
          };
          farmerMap.set(unregKey, mainRec);
        }
      }

      mainRec.own_purchased_bags += purBags;
      mainRec.own_purchased_quintals = Number((mainRec.own_purchased_quintals + purWt).toFixed(2));
      mainRec.purchases.push({
        id: pur.id,
        date: pur.date,
        agency: pur.purchasing_agency,
        firm_name: pur.firm_name,
        billed_to_name: pur.farmer_name,
        relation: 'Self (ਖੁਦ)',
        is_linked: false,
        bags: purBags,
        quintals: purWt,
        rate: purRate,
        amount: purAmt,
      });
    });

    // 5. Compute Balances and Check Duplicate Names across the active records
    const allRecords = Array.from(farmerMap.values());
    const finalNameCounts = new Map<string, number>();
    allRecords.forEach((r) => {
      const n = cleanStr(r.name_en);
      if (n) finalNameCounts.set(n, (finalNameCounts.get(n) || 0) + 1);
    });

    const list = allRecords.map((rec) => {
      const isDup = (finalNameCounts.get(cleanStr(rec.name_en)) || 0) > 1;
      const totalPurchased = rec.own_purchased_bags + rec.linked_purchased_bags;
      const totalPurchasedWt = Number((rec.own_purchased_quintals + rec.linked_purchased_quintals).toFixed(2));
      const balBags = rec.arrived_bags - totalPurchased;
      const balWt = Number((rec.arrived_quintals - totalPurchasedWt).toFixed(2));

      return {
        ...rec,
        isDuplicateName: isDup,
        total_purchased_bags: totalPurchased,
        total_purchased_quintals: totalPurchasedWt,
        balance_bags: balBags,
        balance_quintals: balWt,
      };
    });

    // Filter to only those with arrival OR purchase history
    return list.filter((r) => r.arrived_bags > 0 || r.total_purchased_bags > 0);
  }, [registeredFarmers, entries, agencyPurchases]);

  // Grand summary totals across all farmers in the Arrival vs Purchase Ledger
  const comparisonGrandTotals = useMemo(() => {
    let totalArrivalBags = 0;
    let totalArrivalQtl = 0;
    let totalOwnBags = 0;
    let totalOwnQtl = 0;
    let totalLinkedBags = 0;
    let totalLinkedQtl = 0;
    let totalPurchasedBags = 0;
    let totalPurchasedQtl = 0;
    let totalBalanceBags = 0;
    let totalBalanceQtl = 0;

    let clearedCount = 0;
    let pendingCount = 0;
    let overPurchasedCount = 0;
    let duplicateCount = 0;
    let linkedActiveCount = 0;

    comparisonData.forEach((rec) => {
      totalArrivalBags += rec.arrived_bags;
      totalArrivalQtl += rec.arrived_quintals;
      totalOwnBags += rec.own_purchased_bags;
      totalOwnQtl += rec.own_purchased_quintals;
      totalLinkedBags += rec.linked_purchased_bags;
      totalLinkedQtl += rec.linked_purchased_quintals;
      totalPurchasedBags += rec.total_purchased_bags;
      totalPurchasedQtl += rec.total_purchased_quintals;
      totalBalanceBags += rec.balance_bags;
      totalBalanceQtl += rec.balance_quintals;

      if (rec.balance_bags === 0) clearedCount++;
      else if (rec.balance_bags > 0) pendingCount++;
      else overPurchasedCount++;

      if (rec.isDuplicateName) duplicateCount++;
      if (rec.linked_purchased_bags > 0) linkedActiveCount++;
    });

    return {
      totalArrivalBags,
      totalArrivalQtl: Number(totalArrivalQtl.toFixed(2)),
      totalOwnBags,
      totalOwnQtl: Number(totalOwnQtl.toFixed(2)),
      totalLinkedBags,
      totalLinkedQtl: Number(totalLinkedQtl.toFixed(2)),
      totalPurchasedBags,
      totalPurchasedQtl: Number(totalPurchasedQtl.toFixed(2)),
      totalBalanceBags,
      totalBalanceQtl: Number(totalBalanceQtl.toFixed(2)),
      totalFarmers: comparisonData.length,
      clearedCount,
      pendingCount,
      overPurchasedCount,
      duplicateCount,
      linkedActiveCount,
    };
  }, [comparisonData]);

  const filteredComparison = useMemo(() => {
    const q = compSearch.toLowerCase().trim();
    return comparisonData.filter((r) => {
      const matchSearch =
        !q ||
        r.name_en.toLowerCase().includes(q) ||
        r.name_pa.toLowerCase().includes(q) ||
        r.father_husband_name_en.toLowerCase().includes(q) ||
        r.village_en.toLowerCase().includes(q) ||
        r.mobile.includes(q) ||
        r.arrivals.some((a) => (a.parchi_no || '').toLowerCase().includes(q)) ||
        r.linked_farmers.some(
          (lf) =>
            lf.name_en.toLowerCase().includes(q) ||
            lf.name_pa.toLowerCase().includes(q)
        );

      if (!matchSearch) return false;

      if (compStatusFilter === 'Pending') {
        return r.balance_bags > 0;
      }
      if (compStatusFilter === 'Completed') {
        return r.balance_bags === 0;
      }
      if (compStatusFilter === 'Over') {
        return r.balance_bags < 0;
      }
      if (compStatusFilter === 'Linked') {
        return r.linked_purchased_bags > 0;
      }
      if (compStatusFilter === 'Duplicate') {
        return r.isDuplicateName;
      }
      return true;
    });
  }, [comparisonData, compSearch, compStatusFilter]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden space-y-4">
      
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/80 rounded-xl text-amber-300">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                ਫਸਲ ਆਵਕ ਤੇ ਆਮਦ (Crop Inward & Arrival)
              </h2>
              <p className="text-xs text-emerald-200">
                ਪਰਚੀ ਨੰਬਰ (Parchi No) • ਤਾਰੀਖ ਅਨੁਸਾਰ ਆਟੋਮੈਟਿਕ ਲਿਸਟ • ਇੱਕਠੀਆਂ ਬੈਚ ਐਂਟਰੀਆਂ • ਕਿਸਾਨ ਆਵਕ ਬਨਾਮ ਖਰੀਦ ਚਾਰਟ
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Batch Entry Mode Quick Switch */}
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'batch' ? 'list' : 'batch')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-amber-400 text-amber-950 ring-2 ring-white'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            }`}
          >
            <ListPlus className="w-4 h-4 text-amber-300" />
            <span>ਇਕੱਠੀਆਂ ਐਂਟਰੀਆਂ (Batch Entry Mode)</span>
          </button>

          {/* Single Entry Modal Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ ਨਵੀਂ ਪਰਚੀ ਦਰਜ ਕਰੋ</span>
          </button>
        </div>
      </div>

      {/* 3 Internal Sub-Tabs Navigation */}
      <div className="px-5 border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Wheat className="w-4 h-4" />
            <span>1. ਆਵਕ ਰਿਕਾਰਡ ਲਿਸਟ ({entries.length})</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
              Auto Date-Wise
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'batch'
                ? 'border-amber-600 text-amber-900 bg-amber-50/60'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ListPlus className="w-4 h-4 text-amber-600" />
            <span>2. ਇਕੱਠੀਆਂ ਐਂਟਰੀਆਂ / ਬੈਚ ਮੋਡ (Batch Entry)</span>
            {stagedEntries.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                {stagedEntries.length} Staged
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'comparison'
                ? 'border-blue-600 text-blue-900 bg-blue-50/60'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>3. ਕਿਸਾਨ ਆਵਕ ਬਨਾਮ ਖਰੀਦ ਚਾਰਟ (Arrival vs Purchase Ledger)</span>
            <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">
              ਲਿੰਕ ਕਿਸਾਨ ਹਿਸਾਬ
            </span>
          </button>
        </div>
      </div>

      {/* KPI Stats (Always Visible for Overview) */}
      <div className="px-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਕੁੱਲ ਆਵਕ ਵਜ਼ਨ (Weight)</span>
          <div className="text-lg font-bold font-mono text-emerald-900">{totalQuintals.toFixed(2)} Qtl</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਕੁੱਲ ਆਏ ਗੱਟੇ (Total Bags)</span>
          <div className="text-lg font-bold font-mono text-amber-900">{totalBagsCount} Bags</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਲੜੀਬੱਧ ਕ੍ਰਮ (Sorting)</span>
          <div className="text-xs font-bold text-blue-900 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>ਆਟੋਮੈਟਿਕ ਤਾਰੀਖ ਅਨੁਸਾਰ</span>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">Google Sheet Tab</span>
          <div className="text-xs font-bold font-mono text-purple-900 mt-1">Crop_Arrival_Inward</div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: REGULAR CHRONOLOGICAL CROP ARRIVAL LIST                */}
      {/* ============================================================== */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          {/* Search & Filter */}
          <div className="px-5 py-1 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ਕਿਸਾਨ, ਪਿੰਡ, ਦਾਣਾ ਮੰਡੀ, ਪਰਚੀ ਨੰਬਰ (Parchi No) ਖੋਜੋ..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-gray-500">ਕਿਸਮ:</span>
              <select
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">ਸਾਰੀਆਂ ਕਿਸਮਾਂ (All Varieties)</option>
                <option value="Paddy Grade A">Paddy Grade A</option>
                <option value="Hybrid">Hybrid</option>
                <option value="PR-126">PR-126</option>
              </select>
            </div>
          </div>

          {/* Inward Arrival Table */}
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <th className="py-3 px-3">ਪਰਚੀ ਨੰਬਰ / ਮਿਤੀ (Parchi No / Date)</th>
                  <th className="py-3 px-3">ਮੰਡੀ (Dana Mandi)</th>
                  <th className="py-3 px-3">ਕਿਸਾਨ ਤੇ ਪਿੰਡ (Farmer & Village)</th>
                  <th className="py-3 px-3">ਫਸਲ ਤੇ ਕਿਸਮ (Crop Variety)</th>
                  <th className="py-3 px-3">ਟਰਾਲੀ / ਵਾਹਨ (Vehicle)</th>
                  <th className="py-3 px-3 text-right">ਗੱਟੇ ਤੇ ਤੋਟਾ (Bags)</th>
                  <th className="py-3 px-3 text-right">ਵਜ਼ਨ (Quintals)</th>
                  <th className="py-3 px-3 text-right">3 ਲੇਬਰ ਬਾਕਸ</th>
                  <th className="py-3 px-3 text-center">ਨਮੀ (Moisture)</th>
                  <th className="py-3 px-3 text-center">Sheet Sync</th>
                  <th className="py-3 px-3 text-right">ਐਕਸ਼ਨ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedAndFilteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400">
                      ਕੋਈ ਆਵਕ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। ਨਵੀਂ ਪਰਚੀ ਕੱਟਣ ਲਈ ਉੱਪਰ ਦਿੱਤੇ ਬਟਨ 'ਤੇ ਕਲਿੱਕ ਕਰੋ।
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredEntries.map((item) => {
                    const totBags = item.total_bags_arrived;
                    const newBags = item.new_jute_bags ?? Math.round(totBags / 2);
                    const oldBags = item.old_jute_bags ?? Math.floor(totBags / 2);
                    const looseKg = item.loose_weight_kg ?? 0;
                    const pNo = item.parchi_no || item.gate_pass_no || 'PR-000';

                    return (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-3 px-3 font-mono">
                          <div className="font-bold text-emerald-950 flex items-center gap-1">
                            <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1 rounded font-semibold">ਪਰਚੀ</span>
                            <span>{pNo}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-sans mt-0.5">{item.date}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {item.mandi_name || 'Mandi Kamalpur'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900">
                            {item.farmer_name}
                            {item.father_husband_name && (
                              <span className="text-gray-600 font-normal ml-1.5 text-xs">
                                (ਸ/ਓ {item.father_husband_name})
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 font-sans text-[11px]">
                            ਪਿੰਡ: {item.village} {item.father_husband_name && `• ਪਿਤਾ: ${item.father_husband_name}`} {item.mobile && `• 📞 ${item.mobile}`}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-gray-800">{item.crop_type}</div>
                          <div className="text-[11px] text-emerald-700 font-medium">{item.crop_variety}</div>
                        </td>

                        <td className="py-3 px-3 font-mono text-gray-600">
                          {item.vehicle_trolley_no}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-950">
                          <div>{totBags} Bags</div>
                          <div className="text-[10px] text-gray-500 font-normal">
                            {newBags}N + {oldBags}O
                            {looseKg > 0 && <span className="ml-1 text-emerald-700 font-bold">+{looseKg}kg ਤੋਟਾ</span>}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-950">
                          {Number(item.weight_quintals || 0).toFixed(2)} Qtl
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-[11px]">
                          <div className="font-bold text-red-800">
                            -₹{((item.labor_total || 0) + (item.sukhi_kiti_total || 0) + (item.double_pakha_total || 0)).toFixed(0)}
                          </div>
                          <div className="text-[9px] text-gray-500">
                            J:₹{item.labor_rate ?? 8} | ਸੁਕੀ:₹{item.sukhi_kiti_rate || 0} | ਪੱਖਾ:₹{item.double_pakha_rate || 0}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-200">
                            {item.moisture_percentage}%
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {item.synced_to_sheets ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSyncEntry(item)}
                              disabled={isSyncing === item.id}
                              className="inline-flex items-center gap-1 text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              <span>{isSyncing === item.id ? 'Syncing...' : 'Sync Tab'}</span>
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(item)}
                              title="ਐਡਿਟ ਕਰੋ"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer font-bold inline-flex items-center gap-1 text-[11px]"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => onDeleteEntry(item.id)}
                              title="ਹਟਾਓ"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BATCH / MULTI ENTRY MODE (ਇਕੱਠੀਆਂ ਐਂਟਰੀਆਂ ਦਰਜ ਕਰੋ)      */}
      {/* ============================================================== */}
      {activeTab === 'batch' && (
        <div className="p-5 space-y-5">
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-4">
            <h3 className="font-bold text-amber-950 flex items-center gap-2 text-sm">
              <ListPlus className="w-5 h-5 text-amber-700" />
              <span>ਇੱਕੋ ਤਾਰੀਖ ਦੀਆਂ ਇਕੱਠੀਆਂ ਫਸਲ ਆਵਕ ਐਂਟਰੀਆਂ (Batch Crop Arrival Entry)</span>
            </h3>
            <p className="text-xs text-amber-900 mt-1">
              ਇੱਕ ਵਾਰ ਤਾਰੀਖ ਅਤੇ ਦਾਣਾ ਮੰਡੀ ਸੈੱਟ ਕਰੋ। ਫਿਰ ਵਾਰ-ਵਾਰ ਮੋਡਲ ਖੋਲ੍ਹਣ ਦੀ ਲੋੜ ਨਹੀਂ — ਕਿਸਾਨ ਚੁਣ ਕੇ "ਬੈਚ ਵਿੱਚ ਜੋੜੋ" 'ਤੇ ਕਲਿੱਕ ਕਰਦੇ ਜਾਓ। ਅੰਤ ਵਿੱਚ ਸਾਰੀਆਂ ਐਂਟਰੀਆਂ ਇੱਕ ਕਲਿੱਕ ਨਾਲ ਸੇਵ ਕਰੋ।
            </p>

            {/* Master Header for this Batch: Date, Mandi, Crop & Variety */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-amber-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">
                    📅 ਡਿਫਾਲਟ ਆਵਕ ਮਿਤੀ (Default Date):
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setBatchDate(today);
                        setBatchEntryDate(today);
                      }}
                      className="px-2 py-0.5 bg-white border border-amber-300 rounded text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                    >
                      ਅੱਜ (Today)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yest = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                        setBatchDate(yest);
                        setBatchEntryDate(yest);
                      }}
                      className="px-2 py-0.5 bg-white border border-amber-300 rounded text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                    >
                      ਕੱਲ੍ਹ (Yesterday)
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => {
                    setBatchDate(e.target.value);
                    setBatchEntryDate(e.target.value);
                  }}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold font-mono text-gray-900 text-xs"
                />
                <span className="text-[10px] text-amber-800 mt-1 block font-semibold">
                  * ਮਲਟੀ-ਡੇਟ: ਹਰ ਕਿਸਾਨ ਦੀ ਵੱਖਰੀ ਤਾਰੀਖ ਵੀ ਰੱਖ ਸਕਦੇ ਹੋ।
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  🏛️ ਦਾਣਾ ਮੰਡੀ (Mandi Yard):
                </label>
                <select
                  value={batchMandi}
                  onChange={(e) => setBatchMandi(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 text-xs"
                >
                  {MANDI_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  🌾 ਡਿਫਾਲਟ ਫਸਲ (Crop):
                </label>
                <select
                  value={batchCropType}
                  onChange={(e) => setBatchCropType(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 text-xs"
                >
                  <option value="Paddy Grade A">Paddy Grade A (ਝੋਨਾ ਗ੍ਰੇਡ-ਏ)</option>
                  <option value="Paddy Common">Paddy Common (ਝੋਨਾ ਆਮ)</option>
                  <option value="PR-126">PR-126 (ਪੀ.ਆਰ.-126)</option>
                  <option value="Basmati 1509">Basmati 1509 (ਬਾਸਮਤੀ)</option>
                  <option value="Basmati 1121">Basmati 1121 (ਬਾਸਮਤੀ)</option>
                  <option value="Basmati 1718">Basmati 1718 (ਬਾਸਮਤੀ)</option>
                  <option value="Hybrid">Hybrid (ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ)</option>
                  <option value="Wheat">Wheat (ਕਣਕ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  🏷️ ਕਿਸਮ (Crop Variety):
                </label>
                <select
                  value={batchCropVariety}
                  onChange={(e) => setBatchCropVariety(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 text-xs focus:outline-none"
                >
                  {PADDY_VARIETIES.map((v) => (
                    <option key={`master-batch-v-${v}`} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Row Adder Form (With Multi-Date Selector per farmer) */}
          <form onSubmit={handleAddToBatch} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>+ ਨਵਾਂ ਕਿਸਾਨ ਜੋੜੋ (Add Farmer to Batch):</span>
              </span>
              <span className="text-[11px] text-gray-500 font-mono">Parchi: {batchParchiNo}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>📅 ਆਵਕ ਮਿਤੀ (Date):</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                    Multi-Date
                  </span>
                </label>
                <input
                  type="date"
                  value={batchEntryDate}
                  onChange={(e) => setBatchEntryDate(e.target.value)}
                  className="w-full p-2 bg-emerald-50/80 border border-emerald-300 rounded-lg font-mono font-bold text-gray-900 shadow-sm"
                  required
                />
              </div>

              {/* Real-time Search Box for Registered Farmer */}
              <div ref={batchFarmerSearchRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-700 font-bold flex items-center gap-1">
                    <Search className="w-3.5 h-3.5 text-emerald-700" />
                    <span>ਰਜਿਸਟਰਡ ਕਿਸਾਨ ਖੋਜੋ:</span>
                  </label>
                  {batchFarmerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setBatchFarmerId('');
                        setBatchFarmerSearchText('');
                        setBatchFarmerName('');
                        setBatchFarmerNamePa('');
                        setBatchFatherName('');
                        setBatchVillage('');
                        setBatchVillagePa('');
                        setBatchMobile('');
                      }}
                      className="text-[10px] text-red-600 hover:text-red-800 font-bold cursor-pointer"
                    >
                      ✕ ਕਲੀਅਰ
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={batchFarmerSearchText}
                    onChange={(e) => {
                      setBatchFarmerSearchText(e.target.value);
                      setIsFarmerSearchOpen(true);
                    }}
                    onFocus={() => setIsFarmerSearchOpen(true)}
                    placeholder="ਕਿਸਾਨ, ਪਿਤਾ ਦਾ ਨਾਮ ਜਾਂ ਪਿੰਡ..."
                    className="w-full pl-8 pr-7 py-2 bg-white border-2 border-emerald-400 focus:border-emerald-700 rounded-lg text-gray-900 font-bold text-xs shadow-sm focus:outline-none"
                  />
                  {batchFarmerSearchText && (
                    <button
                      type="button"
                      onClick={() => {
                        setBatchFarmerSearchText('');
                        setIsFarmerSearchOpen(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 font-bold text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Instant Filtered Floating Dropdown */}
                {isFarmerSearchOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-emerald-500 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-gray-100">
                    <div className="bg-emerald-950 text-white px-3 py-1.5 text-[10px] font-bold flex items-center justify-between sticky top-0 z-10">
                      <span>ਮਿਲੇ ਕਿਸਾਨ ({filteredBatchFarmers.length})</span>
                      <button
                        type="button"
                        onClick={() => setIsFarmerSearchOpen(false)}
                        className="text-emerald-300 hover:text-white cursor-pointer"
                      >
                        ਬੰਦ ਕਰੋ ✕
                      </button>
                    </div>

                    {filteredBatchFarmers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-500 space-y-1">
                        <p className="font-semibold text-gray-700">ਕੋਈ ਰਜਿਸਟਰਡ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ।</p>
                        <p className="text-[10px] text-gray-400">ਤੁਸੀਂ ਅਗਲੇ ਖਾਨਿਆਂ ਵਿੱਚ ਨਾਮ ਸਿੱਧਾ ਹੱਥੀਂ ਵੀ ਭਰ ਸਕਦੇ ਹੋ।</p>
                      </div>
                    ) : (
                      filteredBatchFarmers.map((f) => {
                        const isSelected = batchFarmerId === f.id;
                        return (
                          <button
                            key={`batch-search-f-${f.id}`}
                            type="button"
                            onClick={() => {
                              handleBatchFarmerSelect(f.id);
                              setBatchFarmerSearchText(`${f.name_en} (${f.village_en})`);
                              setIsFarmerSearchOpen(false);
                            }}
                            className={`w-full text-left p-2.5 transition-colors cursor-pointer flex items-center justify-between gap-2 hover:bg-emerald-50 ${
                              isSelected ? 'bg-emerald-100/70 border-l-4 border-emerald-700 font-bold' : ''
                            }`}
                          >
                            <div>
                              <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                <span>{f.name_en}</span>
                                {f.name_pa && <span className="text-emerald-800">({f.name_pa})</span>}
                                {f.father_husband_name_en && (
                                  <span className="text-[10px] text-amber-900 bg-amber-50 px-1 rounded border border-amber-200">
                                    ਸ/ਓ {f.father_husband_name_en}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-600 flex items-center gap-2 mt-0.5">
                                <span className="text-emerald-700 font-semibold">📍 {f.village_en}</span>
                                {f.mobile_number && <span className="font-mono text-gray-500">📞 {f.mobile_number}</span>}
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold shrink-0">
                              ਚੁਣੋ →
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name):</label>
                <input
                  type="text"
                  value={batchFarmerName}
                  onChange={(e) => setBatchFarmerName(e.target.value)}
                  placeholder="e.g. Malkit Singh / ਮਲਕੀਤ ਸਿੰਘ"
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-900 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>ਕਿਸਾਨ ਦੇ ਪਿਤਾ ਦਾ ਨਾਮ (Father Name):</span>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">ਸ/ਓ</span>
                </label>
                <input
                  type="text"
                  value={batchFatherName}
                  onChange={(e) => setBatchFatherName(e.target.value)}
                  placeholder="ਸ/ਓ ਪਿਤਾ ਦਾ ਨਾਮ (e.g. Mukhtiar Singh)"
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg text-gray-900 font-semibold placeholder:font-normal shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>ਪਿੰਡ (Village):</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">ਸੁਝਾਅ ਲਿਸਟ</span>
                </label>
                <input
                  type="text"
                  value={batchVillage}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBatchVillage(val);
                    const matched = savedVillages.find(
                      (v) => v.name_en.toLowerCase() === val.trim().toLowerCase() || v.name_pa === val.trim()
                    );
                    if (matched) {
                      setBatchVillagePa(matched.name_pa);
                    }
                  }}
                  list="batch-villages-datalist"
                  placeholder="e.g. Bhadaur / ਭਦੌੜ"
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-gray-900 font-bold shadow-sm"
                  required
                />
                <datalist id="batch-villages-datalist">
                  {savedVillages.map((v) => (
                    <option key={`batch-v-${v.name_en}`} value={v.name_en}>
                      {v.name_pa} ({v.name_en})
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Quick Village Chips for Batch Entry */}
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ਪਿੰਡ ਦੀ ਤੇਜ਼ੀ ਨਾਲ ਚੋਣ (Quick Select Pind - ਕਲਿੱਕ ਕਰਦੇ ਹੀ ਭਰ ਜਾਵੇਗਾ):</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">ਨਵਾਂ ਪਿੰਡ ਆਪੇ ਸੇਵ ਹੋ ਜਾਵੇਗਾ</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-0.5">
                {savedVillages.slice(0, 16).map((v) => {
                  const isSelected =
                    (batchVillage && batchVillage.toLowerCase() === v.name_en.toLowerCase()) ||
                    (batchVillagePa && batchVillagePa === v.name_pa);
                  return (
                    <button
                      key={`batch-chip-${v.name_en}`}
                      type="button"
                      onClick={() => {
                        setBatchVillage(v.name_en);
                        setBatchVillagePa(v.name_pa);
                      }}
                      className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                          : 'bg-white hover:bg-emerald-100 text-gray-800 border-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      {v.name_pa ? `${v.name_pa} (${v.name_en})` : v.name_en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Crop, Variety, Mobile & Vehicle */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  🌾 ਫਸਲ ਦਾ ਨਾਮ (Crop):
                </label>
                <select
                  value={batchCropType}
                  onChange={(e) => setBatchCropType(e.target.value)}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-bold text-gray-900"
                >
                  <option value="Paddy Grade A">Paddy Grade A (ਝੋਨਾ ਗ੍ਰੇਡ-ਏ)</option>
                  <option value="Paddy Common">Paddy Common (ਝੋਨਾ ਆਮ)</option>
                  <option value="PR-126">PR-126 (ਪੀ.ਆਰ.-126)</option>
                  <option value="Basmati 1509">Basmati 1509</option>
                  <option value="Basmati 1121">Basmati 1121</option>
                  <option value="Basmati 1718">Basmati 1718</option>
                  <option value="Hybrid">Hybrid (ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ)</option>
                  <option value="Wheat">Wheat (ਕਣਕ)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  🏷️ ਕਿਸਮ (Variety):
                </label>
                <select
                  value={batchCropVariety}
                  onChange={(e) => setBatchCropVariety(e.target.value)}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-bold text-gray-900 shadow-sm"
                >
                  {PADDY_VARIETIES.map((v) => (
                    <option key={`row-batch-v-${v}`} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਮੋਬਾਈਲ (Mobile):</label>
                <input
                  type="tel"
                  value={batchMobile}
                  onChange={(e) => setBatchMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono text-gray-900 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਵਾਹਨ / ਟਰਾਲੀ (Vehicle):</label>
                <input
                  type="text"
                  value={batchVehicleNo}
                  onChange={(e) => setBatchVehicleNo(e.target.value)}
                  placeholder="PB-19-TR-4021"
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono uppercase text-gray-900 shadow-sm"
                />
              </div>
            </div>

            {/* Row 3: Bags, Loose & Parchi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>ਨਵਾਂ ਜੂਟ (New Bags):</span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded font-semibold">0 ਡਿਫਾਲਟ</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={batchNewBags === 0 ? '' : batchNewBags}
                  onChange={(e) => setBatchNewBags(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full p-2 bg-white border-2 border-emerald-300 focus:border-emerald-600 rounded-lg font-mono font-bold text-emerald-950 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>ਪੁਰਾਣਾ ਜੂਟ (Old Bags):</span>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1 rounded font-semibold">0 ਡਿਫਾਲਟ</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={batchOldBags === 0 ? '' : batchOldBags}
                  onChange={(e) => setBatchOldBags(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full p-2 bg-white border-2 border-amber-300 focus:border-amber-600 rounded-lg font-mono font-bold text-amber-950 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>ਤੋਟਾ (Loose kg):</span>
                  <span className="text-[10px] text-purple-800 bg-purple-100 px-1 rounded font-semibold">0 ਕਿਲੋ</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={batchLooseKg === 0 ? '' : batchLooseKg}
                  onChange={(e) => setBatchLooseKg(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full p-2 bg-white border-2 border-purple-300 focus:border-purple-600 rounded-lg font-mono font-bold text-purple-950 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">ਪਰਚੀ ਨੰਬਰ (Parchi No):</label>
                <input
                  type="text"
                  value={batchParchiNo}
                  onChange={(e) => setBatchParchiNo(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900 shadow-sm"
                />
              </div>
            </div>

            {/* 3 Labor & Cleaning Deduction Boxes */}
            <div className="border border-gray-300 rounded-xl p-3 bg-white space-y-2.5">
              <div className="text-xs font-bold text-gray-900 flex items-center justify-between border-b pb-1.5 border-gray-200">
                <span className="flex items-center gap-1.5">
                  <span>🔨 3 ਲੇਬਰ ਤੇ ਕਟੌਤੀ ਬਾਕਸ (3 Labor & Cleaning Deduction Boxes):</span>
                </span>
                <span className="text-red-700 font-mono font-bold">
                  ਕਟੌਤੀ: -₹{(
                    ((Number(batchNewBags || 0) + Number(batchOldBags || 0)) * (Number(batchLaborRate) >= 0 ? Number(batchLaborRate) : 8)) +
                    (batchEnableSukhiKiti ? (Number(batchNewBags || 0) + Number(batchOldBags || 0)) * Number(batchSukhiKitiRate || 0) : 0) +
                    (batchEnableDoublePakha ? (Number(batchNewBags || 0) + Number(batchOldBags || 0)) * Number(batchDoublePakhaRate || 0) : 0)
                  ).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Box 1: J-Form Labor (₹8/bag) */}
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-gray-900 text-[11px]">ਬਾਕਸ 1: ਜੇ-ਫਾਰਮ ਲੇਬਰ (Labor)</div>
                    <div className="text-[10px] text-gray-500">ਮੰਡੀ ਬੋਰਡ ਖਰਚਾ (₹{batchLaborRate}/ਗੱਟਾ)</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-gray-600">₹</span>
                    <input
                      type="number"
                      value={batchLaborRate}
                      onChange={(e) => setBatchLaborRate(Number(e.target.value))}
                      className="w-12 p-1 bg-white border border-gray-300 rounded font-mono font-bold text-center text-xs"
                    />
                    <span className="font-mono font-bold text-red-800 text-xs">
                      =₹{((Number(batchNewBags || 0) + Number(batchOldBags || 0)) * Number(batchLaborRate || 0)).toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Box 2: Sukhi Kiti (Optional ₹5/bag - ਜੇ ਹੋਇਆ ਤਾਂ ਹੀ ਐਂਟਰੀ) */}
                <div
                  className={`p-2.5 border rounded-xl flex items-center justify-between gap-2 transition-all ${
                    batchEnableSukhiKiti
                      ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300/60 shadow-sm'
                      : 'bg-white/80 border-gray-200 opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="batch-sukhi-kiti"
                      checked={batchEnableSukhiKiti}
                      onChange={(e) => setBatchEnableSukhiKiti(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer accent-amber-600"
                    />
                    <label htmlFor="batch-sukhi-kiti" className="cursor-pointer select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-[11px]">ਬਾਕਸ 2: ਸੁਕਾਈ ਖਰਚਾ (Sukhi Kiti)</span>
                        {batchEnableSukhiKiti ? (
                          <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded-full">ਲਾਗੂ (Active)</span>
                        ) : (
                          <span className="text-[9px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.2 rounded-full">ਆਪਸ਼ਨਲ</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {batchEnableSukhiKiti
                          ? `ਸੁਕਾਈ ਲੱਗੀ: ₹${batchSukhiKitiRate}/ਗੱਟਾ`
                          : 'ਸਿਰਫ਼ ਤਾਂ ਹੀ ਟਿੱਕ ਕਰੋ ਜੇ ਸੁਕਾਈ ਕੀਤੀ ਹੋਵੇ (₹5/ਗੱਟਾ)'}
                      </div>
                    </label>
                  </div>
                  {batchEnableSukhiKiti ? (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-gray-600">₹</span>
                      <input
                        type="number"
                        value={batchSukhiKitiRate}
                        onChange={(e) => setBatchSukhiKitiRate(Number(e.target.value))}
                        className="w-12 p-1 bg-white border border-amber-400 rounded font-mono font-bold text-center text-xs"
                      />
                      <span className="font-mono font-bold text-red-800 text-xs">
                        =₹{((Number(batchNewBags || 0) + Number(batchOldBags || 0)) * Number(batchSukhiKitiRate || 0)).toFixed(0)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono italic">₹0 (ਬੰਦ)</span>
                  )}
                </div>

                {/* Box 3: Double Pakha (Optional ₹4/bag - ਜੇ ਹੋਇਆ ਤਾਂ ਹੀ ਐਂਟਰੀ) */}
                <div
                  className={`p-2.5 border rounded-xl flex items-center justify-between gap-2 transition-all ${
                    batchEnableDoublePakha
                      ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300/60 shadow-sm'
                      : 'bg-white/80 border-gray-200 opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="batch-double-pakha"
                      checked={batchEnableDoublePakha}
                      onChange={(e) => setBatchEnableDoublePakha(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                    />
                    <label htmlFor="batch-double-pakha" className="cursor-pointer select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 text-[11px]">ਬਾਕਸ 3: ਡਬਲ ਪੱਖਾ / ਛਣਾਈ</span>
                        {batchEnableDoublePakha ? (
                          <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">ਲਾਗੂ (Active)</span>
                        ) : (
                          <span className="text-[9px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.2 rounded-full">ਆਪਸ਼ਨਲ</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {batchEnableDoublePakha
                          ? `ਛਣਾਈ ਲੱਗੀ: ₹${batchDoublePakhaRate}/ਗੱਟਾ`
                          : 'ਸਿਰਫ਼ ਤਾਂ ਹੀ ਟਿੱਕ ਕਰੋ ਜੇ ਡਬਲ ਪੱਖਾ ਲਾਇਆ ਹੋਵੇ (₹4/ਗੱਟਾ)'}
                      </div>
                    </label>
                  </div>
                  {batchEnableDoublePakha ? (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-gray-600">₹</span>
                      <input
                        type="number"
                        value={batchDoublePakhaRate}
                        onChange={(e) => setBatchDoublePakhaRate(Number(e.target.value))}
                        className="w-12 p-1 bg-white border border-blue-400 rounded font-mono font-bold text-center text-xs"
                      />
                      <span className="font-mono font-bold text-red-800 text-xs">
                        =₹{((Number(batchNewBags || 0) + Number(batchOldBags || 0)) * Number(batchDoublePakhaRate || 0)).toFixed(0)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono italic">₹0 (ਬੰਦ)</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-emerald-900 font-semibold space-y-0.5 sm:space-y-0 sm:space-x-2">
                <span>ਗਣਨਾ: {Number(batchNewBags || 0) + Number(batchOldBags || 0)} ਗੱਟੇ = {(((Number(batchNewBags || 0) + Number(batchOldBags || 0)) * 37.5 + Number(batchLooseKg || 0)) / 100).toFixed(2)} ਕੁਇੰਟਲ</span>
                <span className="text-red-700 font-bold">• ਕਟੌਤੀ: -₹{(
                  ((Number(batchNewBags || 0) + Number(batchOldBags || 0)) * (Number(batchLaborRate) >= 0 ? Number(batchLaborRate) : 8)) +
                  (batchEnableSukhiKiti ? (Number(batchNewBags || 0) + Number(batchOldBags || 0)) * Number(batchSukhiKitiRate || 0) : 0) +
                  (batchEnableDoublePakha ? (Number(batchNewBags || 0) + Number(batchOldBags || 0)) * Number(batchDoublePakhaRate || 0) : 0)
                ).toFixed(2)}</span>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>ਬੈਚ ਵਿੱਚ ਜੋੜੋ (+ Add to Batch List)</span>
              </button>
            </div>
          </form>

          {/* Staged List Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
            <div className="p-3 bg-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-gray-800">
                  ਤਿਆਰ ਬੈਚ ਐਂਟਰੀਆਂ ({stagedEntries.length} ਕਿਸਾਨ):
                </span>
                {uniqueBatchDates.length > 0 && (
                  <span className="text-[11px] text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                    {uniqueBatchDates.length > 1 ? `${uniqueBatchDates.length} ਵੱਖ-ਵੱਖ ਮਿਤੀਆਂ (${uniqueBatchDates.join(', ')})` : `ਮਿਤੀ: ${uniqueBatchDates[0]}`}
                  </span>
                )}
              </div>
              {stagedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStagedEntries([])}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer self-end sm:self-auto"
                >
                  ਸਭ ਕਲੀਅਰ ਕਰੋ (Clear All)
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">📅 ਮਿਤੀ (Date)</th>
                    <th className="py-2.5 px-3">ਪਰਚੀ ਨੰਬਰ</th>
                    <th className="py-2.5 px-3">ਕਿਸਾਨ ਦਾ ਨਾਮ ਤੇ ਪਿੰਡ</th>
                    <th className="py-2.5 px-3">🌾 ਫਸਲ ਤੇ ਕਿਸਮ</th>
                    <th className="py-2.5 px-3">ਵਾਹਨ / ਟਰਾਲੀ</th>
                    <th className="py-2.5 px-3 text-right">ਕੁੱਲ ਗੱਟੇ (ਨਵੇਂ+ਪੁਰਾਣੇ)</th>
                    <th className="py-2.5 px-3 text-right">ਵਜ਼ਨ (ਕੁਇੰਟਲ)</th>
                    <th className="py-2.5 px-3 text-right">3 ਕਟੌਤੀ ਬਾਕਸ (ਲ/ਸੁ/ਪ)</th>
                    <th className="py-2.5 px-3 text-center">ਹਟਾਓ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stagedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400">
                        ਅਜੇ ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਜੋੜਿਆ ਗਿਆ। ਉੱਪਰ ਕਿਸਾਨ ਦਾ ਡਾਟਾ ਭਰ ਕੇ "ਬੈਚ ਵਿੱਚ ਜੋੜੋ" ਦਬਾਓ।
                      </td>
                    </tr>
                  ) : (
                    stagedEntries.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-amber-50/40">
                        <td className="py-2 px-3 font-mono text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono">
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleUpdateStagedDate(item.id, e.target.value)}
                            className="p-1 bg-amber-50/80 border border-amber-300 rounded font-mono text-[11px] font-bold text-gray-900"
                            title="ਇਸ ਐਂਟਰੀ ਦੀ ਮਿਤੀ ਬਦਲੋ (Edit Date)"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-950">{item.parchi_no}</td>
                        <td className="py-2 px-3">
                          <div>
                            <span className="font-bold text-gray-900">{item.farmer_name}</span>
                            {item.father_husband_name && (
                              <span className="text-gray-600 font-medium ml-1.5 text-[11px]">
                                (ਸ/ਓ {item.father_husband_name})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-sans">
                            ਪਿੰਡ: {item.village} {item.mobile && `• 📞 ${item.mobile}`}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-emerald-950">{item.crop_type}</div>
                          <div className="text-[11px] text-amber-900 font-semibold">{item.crop_variety || 'ਆਮ'}</div>
                        </td>
                        <td className="py-2 px-3 font-mono text-gray-600">{item.vehicle_trolley_no}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                          {item.total_bags_arrived} Bags ({item.new_jute_bags}N + {item.old_jute_bags}O)
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900">
                          {item.weight_quintals.toFixed(2)} Qtl
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          <div className="font-bold text-red-700">₹{(item.total_labor_deductions ?? item.labor_total ?? 0).toFixed(2)}</div>
                          <div className="text-[10px] text-gray-500 flex flex-col items-end">
                            <span>ਜੇ: ₹{item.labor_total}</span>
                            {item.sukhi_kiti_total && item.sukhi_kiti_total > 0 ? (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">
                                + ਸੁਕਾਈ: ₹{item.sukhi_kiti_total} (@₹{item.sukhi_kiti_rate})
                              </span>
                            ) : null}
                            {item.double_pakha_total && item.double_pakha_total > 0 ? (
                              <span className="text-blue-700 font-bold bg-blue-50 px-1 rounded">
                                + ਪੱਖਾ: ₹{item.double_pakha_total} (@₹{item.double_pakha_rate})
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedItem(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Batch Totals & Final Save Button */}
            {stagedEntries.length > 0 && (
              <div className="p-4 bg-emerald-50 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-emerald-950 font-bold flex flex-wrap items-center gap-3">
                  <span>ਕੁੱਲ ਕਿਸਾਨ: {stagedEntries.length}</span>
                  <span>•</span>
                  <span>ਕੁੱਲ ਗੱਟੇ: {stagedEntries.reduce((s, i) => s + i.total_bags_arrived, 0)} Bags</span>
                  <span>•</span>
                  <span>ਕੁੱਲ ਵਜ਼ਨ: {stagedEntries.reduce((s, i) => s + i.weight_quintals, 0).toFixed(2)} Qtl</span>
                  <span>•</span>
                  <span className="text-red-800">ਕੁੱਲ ਕਟੌਤੀਆਂ: ₹{stagedEntries.reduce((s, i) => s + (i.total_labor_deductions || i.labor_total || 0), 0).toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAllBatch}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>ਸਾਰੀਆਂ {stagedEntries.length} ਐਂਟਰੀਆਂ ਸੇਵ ਕਰੋ (Save All Entries)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: FARMER ARRIVAL VS PURCHASE COMPARISON CHART / LEDGER   */}
      {/* ============================================================== */}
      {activeTab === 'comparison' && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Top Informational Header */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-black text-white flex items-center gap-2 text-base sm:text-lg">
                  <BarChart3 className="w-5 h-5 text-amber-300" />
                  <span>ਕਿਸਾਨ ਆਵਕ ਬਨਾਮ ਖਰੀਦ ਚਾਰਟ ਤੇ ਲਿੰਕ ਕਿਸਾਨ ਹਿਸਾਬ (Arrival vs Purchase Ledger)</span>
                </h3>
                <p className="text-xs text-blue-200 mt-1 max-w-3xl">
                  ਸਰਕਾਰੀ ਖਰੀਦ ਪਾਉਣ ਤੋਂ ਪਹਿਲਾਂ ਇੱਥੇ ਚੈੱਕ ਕਰੋ: ਕਿਸਾਨ ਦੇ ਮੰਡੀ ਵਿੱਚ ਕੁੱਲ ਕਿੰਨੇ ਗੱਟੇ ਆਏ, ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਨਾਮ ਕਿੰਨੇ ਪਾਸ ਹੋਏ, ਲਿੰਕਡ ਮੈਂਬਰਾਂ ਦੇ ਨਾਮ ਕਿੰਨੇ ਕੱਟੇ ਗਏ ਅਤੇ ਯਾਰਡ ਵਿੱਚ ਕਿੰਨੇ ਬੈਗ ਬਕਾਇਆ ਹਨ।
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 shrink-0">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                <span className="font-bold text-amber-200">100% ਸੁਰੱਖਿਅਤ ਖਰੀਦ ਕੰਟਰੋਲ</span>
              </div>
            </div>
          </div>

          {/* 🌟 TOP GRAND TOTAL SUMMARY PANEL (ਕੁੱਲ ਆਵਕ, ਮੁੱਖ ਖਰੀਦ, ਲਿੰਕਡ ਖਰੀਦ ਤੇ ਬਾਕੀ ਬਕਾਇਆ) */}
          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="font-black text-sm text-indigo-950 uppercase tracking-wide">
                  ਮੰਡੀ ਯਾਰਡ ਦਾ ਕੁੱਲ ਸਾਂਝਾ ਹਿਸਾਬ (MANDI YARD GRAND SUMMARY)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono font-bold">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700">
                  ਕੁੱਲ ਖਾਤੇ: <strong>{comparisonGrandTotals.totalFarmers} ਕਿਸਾਨ</strong>
                </span>
                <span className="bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 text-amber-950">
                  ⏳ ਬਕਾਇਆ: <strong>{comparisonGrandTotals.pendingCount} ਕਿਸਾਨ</strong>
                </span>
                <span className="bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-950">
                  ✅ ਮੁਕੰਮਲ: <strong>{comparisonGrandTotals.clearedCount} ਕਿਸਾਨ</strong>
                </span>
                {comparisonGrandTotals.overPurchasedCount > 0 && (
                  <span className="bg-red-100 px-2.5 py-1 rounded-lg border border-red-300 text-red-900 animate-pulse">
                    🚨 ਵਾਧੂ ਖਰੀਦ: <strong>{comparisonGrandTotals.overPurchasedCount} ਕਿਸਾਨ</strong>
                  </span>
                )}
                {comparisonGrandTotals.duplicateCount > 0 && (
                  <span className="bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-300 text-purple-900">
                    ⚠️ ਇੱਕੋ ਨਾਮ ਵਾਲੇ: <strong>{comparisonGrandTotals.duplicateCount} ਕਿਸਾਨ</strong>
                  </span>
                )}
              </div>
            </div>

            {/* 5 Big Stat Boxes for Yard Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1. ਕੁੱਲ ਆਵਕ ਬੋਰੀਆਂ */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-blue-200 shadow-xs">
                <span className="text-[11px] font-bold text-blue-900 block mb-0.5 flex items-center gap-1">
                  <Wheat className="w-3.5 h-3.5 text-blue-600" />
                  1. ਕੁੱਲ ਆਵਕ (Arrival)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-blue-950">
                  {comparisonGrandTotals.totalArrivalBags} <span className="text-xs font-normal text-blue-800">Bags</span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-700 block mt-0.5">
                  {comparisonGrandTotals.totalArrivalQtl.toFixed(2)} Qtl
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">ਮੰਡੀ ਵਿੱਚ ਆਈ ਫਸਲ</span>
              </div>

              {/* 2. ਮੁੱਖ ਕਿਸਾਨ ਖਰੀਦ */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-200 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-900 block mb-0.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  2. ਮੁੱਖ ਕਿਸਾਨ ਖਰੀਦ (Own)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
                  {comparisonGrandTotals.totalOwnBags} <span className="text-xs font-normal text-emerald-800">Bags</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 block mt-0.5">
                  {comparisonGrandTotals.totalOwnQtl.toFixed(2)} Qtl
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">ਆਪਣੇ ਨਾਮ 'ਤੇ ਪਾਸ</span>
              </div>

              {/* 3. ਲਿੰਕਡ ਕਿਸਾਨ ਖਰੀਦ */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-purple-200 shadow-xs">
                <span className="text-[11px] font-bold text-purple-900 block mb-0.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  3. ਲਿੰਕਡ ਖਰੀਦ (Linked)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-purple-950">
                  {comparisonGrandTotals.totalLinkedBags} <span className="text-xs font-normal text-purple-800">Bags</span>
                </div>
                <span className="text-xs font-mono font-bold text-purple-700 block mt-0.5">
                  {comparisonGrandTotals.totalLinkedQtl.toFixed(2)} Qtl
                </span>
                <span className="text-[10px] text-purple-700 font-semibold block mt-1">ਪਰਿਵਾਰਕ ਮੈਂਬਰਾਂ ਦੇ ਨਾਮ</span>
              </div>

              {/* 4. ਕੁੱਲ ਖਰੀਦ ਜੋੜ (ਮੁੱਖ + ਲਿੰਕਡ) */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-cyan-200 shadow-xs">
                <span className="text-[11px] font-bold text-cyan-950 block mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700" />
                  4. ਕੁੱਲ ਖਰੀਦ (Total Pass)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-cyan-950">
                  {comparisonGrandTotals.totalPurchasedBags} <span className="text-xs font-normal text-cyan-800">Bags</span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-800 block mt-0.5">
                  {comparisonGrandTotals.totalPurchasedQtl.toFixed(2)} Qtl
                </span>
                <span className="text-[10px] text-gray-500 block mt-1">ਮੁੱਖ + ਲਿੰਕਡ ਦੋਵੇਂ ਸ਼ਾਮਲ</span>
              </div>

              {/* 5. ਮੰਡੀ ਵਿੱਚ ਬਾਕੀ ਬਕਾਇਆ */}
              <div className={`p-3.5 rounded-xl border-2 shadow-xs ${
                comparisonGrandTotals.totalBalanceBags > 0
                  ? 'bg-amber-50/90 border-amber-400'
                  : comparisonGrandTotals.totalBalanceBags === 0
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-red-50 border-red-400'
              }`}>
                <span className={`text-[11px] font-black block mb-0.5 flex items-center gap-1 ${
                  comparisonGrandTotals.totalBalanceBags > 0 ? 'text-amber-950' : 'text-emerald-950'
                }`}>
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  5. ਬਾਕੀ ਬਕਾਇਆ (Balance)
                </span>
                <div className={`text-xl sm:text-2xl font-black font-mono ${
                  comparisonGrandTotals.totalBalanceBags > 0
                    ? 'text-amber-950'
                    : comparisonGrandTotals.totalBalanceBags === 0
                    ? 'text-emerald-900'
                    : 'text-red-900'
                }`}>
                  {comparisonGrandTotals.totalBalanceBags} <span className="text-xs font-normal text-gray-700">Bags</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-900 block mt-0.5">
                  {comparisonGrandTotals.totalBalanceQtl.toFixed(2)} Qtl
                </span>
                <span className="text-[10px] font-bold text-amber-900 block mt-1">
                  {comparisonGrandTotals.totalBalanceBags > 0 ? 'ਖਰੀਦਣ ਲਈ ਬਕਾਇਆ' : 'ਸਾਰੀ ਆਵਕ ਨਿੱਬੜੀ'}
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar & Status Filter Tabs */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={compSearch}
                onChange={(e) => setCompSearch(e.target.value)}
                placeholder="ਕਿਸਾਨ, ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ, ਪਿੰਡ, ਮੋਬਾਈਲ ਜਾਂ ਪਰਚੀ ਨੰਬਰ ਖੋਜੋ..."
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
              {compSearch && (
                <button
                  type="button"
                  onClick={() => setCompSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCompStatusFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  compStatusFilter === 'All'
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                ਸਾਰੇ ({comparisonData.length})
              </button>
              <button
                type="button"
                onClick={() => setCompStatusFilter('Pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  compStatusFilter === 'Pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>ਬਾਕੀ ਬੈਗ ({comparisonGrandTotals.pendingCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setCompStatusFilter('Completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  compStatusFilter === 'Completed'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ਮੁਕੰਮਲ ({comparisonGrandTotals.clearedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setCompStatusFilter('Linked')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  compStatusFilter === 'Linked'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ਲਿੰਕਡ ਖਰੀਦ ਵਾਲੇ ({comparisonGrandTotals.linkedActiveCount})</span>
              </button>
              {comparisonGrandTotals.overPurchasedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setCompStatusFilter('Over')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    compStatusFilter === 'Over'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-red-50 text-red-900 border border-red-300 hover:bg-red-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ਵਾਧੂ ਖਰੀਦ ({comparisonGrandTotals.overPurchasedCount})</span>
                </button>
              )}
              {comparisonGrandTotals.duplicateCount > 0 && (
                <button
                  type="button"
                  onClick={() => setCompStatusFilter('Duplicate')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    compStatusFilter === 'Duplicate'
                      ? 'bg-amber-900 text-white shadow-xs'
                      : 'bg-yellow-50 text-yellow-950 border border-yellow-300 hover:bg-yellow-100'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  <span>ਇੱਕੋ ਨਾਮ ਵਾਲੇ ({comparisonGrandTotals.duplicateCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Comparison Cards / Ledger Rows */}
          <div className="space-y-3.5">
            {filteredComparison.length === 0 ? (
              <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl bg-white space-y-2">
                <BarChart3 className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="font-bold text-sm text-gray-700">ਕੋਈ ਕਿਸਾਨ ਹਿਸਾਬ ਨਹੀਂ ਮਿਲਿਆ</p>
                <p className="text-xs text-gray-400">ਖੋਜ ਜਾਂ ਫਿਲਟਰ ਬਦਲ ਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।</p>
              </div>
            ) : (
              filteredComparison.map((rec) => {
                const isCleared = rec.balance_bags === 0;
                const isOver = rec.balance_bags < 0;
                const isExpanded = !!expandedFarmerKeys[rec.uniqueKey];

                return (
                  <div 
                    key={rec.uniqueKey}
                    className={`border-2 rounded-2xl p-4 bg-white shadow-xs transition-all space-y-3.5 ${
                      rec.isDuplicateName
                        ? 'border-amber-300 bg-amber-50/20'
                        : isOver
                        ? 'border-red-300 bg-red-50/20'
                        : isCleared
                        ? 'border-emerald-200 hover:border-emerald-300'
                        : 'border-blue-200 hover:border-blue-400'
                    }`}
                  >
                    {/* Header: Farmer Details + Disambiguation Badge + Safe Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm shrink-0 shadow-xs ${
                          rec.isDuplicateName
                            ? 'bg-amber-200 text-amber-950 border border-amber-400'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}>
                          {rec.name_en.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <div className="font-black text-gray-950 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                            <span>{rec.name_en}</span>
                            {rec.name_pa && (
                              <span className="text-gray-600 font-semibold text-xs sm:text-sm">({rec.name_pa})</span>
                            )}
                            {rec.isRegistered ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                                ਰਜਿਸਟਰਡ ਖਾਤਾ
                              </span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                                ਸਿੱਧੀ ਆਵਕ
                              </span>
                            )}
                          </div>

                          {/* Identification details: Father/Husband Name, Village, Mobile */}
                          <div className="flex items-center gap-2.5 text-xs text-gray-700 flex-wrap">
                            <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                              ਪਿਤਾ/ਪਤੀ: <strong>{rec.father_husband_name_en || rec.father_husband_name_pa || 'ਦਰਜ ਨਹੀਂ'}</strong>
                            </span>
                            <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                              ਪਿੰਡ: <strong>{rec.village_en || rec.village_pa || 'ਦਰਜ ਨਹੀਂ'}</strong>
                            </span>
                            {rec.mobile && (
                              <span className="text-gray-600 font-mono">📞 {rec.mobile}</span>
                            )}
                          </div>

                          {/* ⚠️ DUPLICATE NAME SAFEGUARD BADGE */}
                          {rec.isDuplicateName && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>ਇੱਕੋ ਨਾਮ ਵਾਲਾ ਵੱਖਰਾ ਖਾਤਾ: ਪਿਤਾ {rec.father_husband_name_en || 'N/A'} • ਪਿੰਡ {rec.village_en || 'N/A'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Status Badge */}
                      <div className="shrink-0 sm:self-start">
                        {isCleared ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-100 text-emerald-950 px-3.5 py-1.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ਸਾਰੀ ਫਸਲ ਪਾਸ (0 ਬੈਗ ਬਾਕੀ)
                          </span>
                        ) : isOver ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black bg-red-100 text-red-950 px-3.5 py-1.5 rounded-full border border-red-300 animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            ਵਾਧੂ ਖਰੀਦ (+{Math.abs(rec.balance_bags)} ਬੈਗ ਵੱਧ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black bg-amber-100 text-amber-950 px-3.5 py-1.5 rounded-full border-2 border-amber-400 shadow-xs">
                            <Clock className="w-4 h-4 text-amber-700 animate-spin" />
                            {rec.balance_bags} ਬੈਗ ਮੰਡੀ ਵਿੱਚ ਬਾਕੀ (Pending)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SAFE PURCHASE FINANCIAL PROTECTION NOTICE */}
                    {rec.balance_bags > 0 ? (
                      <div className="p-2.5 bg-amber-50/80 border border-amber-300 rounded-xl text-xs flex items-center justify-between gap-3 text-amber-950">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            <strong>ਫਰਮ ਸੁਰੱਖਿਆ ਚੇਤਾਵਨੀ:</strong> ਇਸ ਕਿਸਾਨ ਦੇ ਖਾਤੇ ਵਿੱਚ ਵੱਧ ਤੋਂ ਵੱਧ <strong>{rec.balance_bags} ਬੋਰੀਆਂ ({rec.balance_quintals.toFixed(2)} Qtl)</strong> ਦੀ ਹੀ ਖਰੀਦ ਪਾਈ ਜਾ ਸਕਦੀ ਹੈ।
                          </span>
                        </div>
                        <span className="font-mono font-black text-amber-900 shrink-0 bg-white px-2 py-0.5 rounded border border-amber-200">
                          ਸੁਰੱਖਿਅਤ ਹੱਦ: {rec.balance_bags} Bags
                        </span>
                      </div>
                    ) : isOver ? (
                      <div className="p-2.5 bg-red-100 border border-red-300 rounded-xl text-xs flex items-center gap-2 text-red-950 font-bold">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          ਨੁਕਸਾਨ ਦਾ ਖਤਰਾ! ਇਸ ਕਿਸਾਨ ਦੇ ਖਾਤੇ ਵਿੱਚ ਆਵਕ ਨਾਲੋਂ {Math.abs(rec.balance_bags)} ਬੈਗ ({Math.abs(rec.balance_quintals).toFixed(2)} Qtl) ਵੱਧ ਖਰੀਦ ਪੈ ਚੁੱਕੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਖਰੀਦ ਐਂਟਰੀ ਚੈੱਕ ਕਰੋ।
                        </span>
                      </div>
                    ) : null}

                    {/* Numeric Metric Bars (4 Cards) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {/* Box 1: Arrived */}
                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                        <span className="text-blue-900 block text-[11px] font-bold">1. ਕੁੱਲ ਆਏ ਗੱਟੇ (Arrival):</span>
                        <div className="text-base sm:text-lg font-black font-mono text-blue-950 mt-0.5">
                          {rec.arrived_bags} <span className="text-xs font-normal text-blue-800">Bags</span>
                        </div>
                        <div className="text-[11px] font-mono font-bold text-blue-800 mt-0.5">
                          {rec.arrived_quintals.toFixed(2)} Qtl
                        </div>
                        <span className="text-[10px] text-gray-500 block mt-1">
                          {rec.arrivals.length} ਆਵਕ ਪਰਚੀਆਂ / ਟਰਾਲੀਆਂ
                        </span>
                      </div>

                      {/* Box 2: Own Name Purchase */}
                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                        <span className="text-emerald-900 block text-[11px] font-bold">2. ਮੁੱਖ ਕਿਸਾਨ ਖਰੀਦ (Own):</span>
                        <div className="text-base sm:text-lg font-black font-mono text-emerald-950 mt-0.5">
                          {rec.own_purchased_bags} <span className="text-xs font-normal text-emerald-800">Bags</span>
                        </div>
                        <div className="text-[11px] font-mono font-bold text-emerald-800 mt-0.5">
                          {rec.own_purchased_quintals.toFixed(2)} Qtl
                        </div>
                        <span className="text-[10px] text-emerald-700 block mt-1">
                          ਖੁਦ ਆਪਣੇ ਨਾਮ 'ਤੇ
                        </span>
                      </div>

                      {/* Box 3: Linked Farmers Total */}
                      <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                        <span className="text-purple-900 block text-[11px] font-bold">3. ਲਿੰਕਡ ਖਰੀਦ (Linked):</span>
                        <div className="text-base sm:text-lg font-black font-mono text-purple-950 mt-0.5">
                          {rec.linked_purchased_bags} <span className="text-xs font-normal text-purple-800">Bags</span>
                        </div>
                        <div className="text-[11px] font-mono font-bold text-purple-800 mt-0.5">
                          {rec.linked_purchased_quintals.toFixed(2)} Qtl
                        </div>
                        <span className="text-[10px] text-purple-700 block mt-1">
                          {rec.linked_farmers.filter((lf) => lf.bags > 0).length} ਮੈਂਬਰਾਂ ਦੇ ਨਾਮ 'ਤੇ
                        </span>
                      </div>

                      {/* Box 4: Balance Remaining */}
                      <div className={`p-3 rounded-xl border-2 ${
                        rec.balance_bags > 0 
                          ? 'bg-amber-50 border-amber-300' 
                          : isCleared
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-red-50 border-red-300'
                      }`}>
                        <span className="text-gray-800 block text-[11px] font-black">4. ਮੰਡੀ ਵਿੱਚ ਬਕਾਇਆ (Balance):</span>
                        <div className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                          rec.balance_bags > 0 ? 'text-amber-950' : isCleared ? 'text-emerald-950' : 'text-red-950'
                        }`}>
                          {rec.balance_bags} <span className="text-xs font-normal text-gray-700">Bags</span>
                        </div>
                        <div className="text-[11px] font-mono font-black text-amber-900 mt-0.5">
                          {rec.balance_quintals.toFixed(2)} Qtl
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 block mt-1">
                          {rec.balance_bags > 0 ? 'ਯਾਰਡ ਵਿੱਚ ਪਏ ਹਨ' : isCleared ? 'ਪੂਰਾ ਹਿਸਾਬ ਨਿੱਬੜਿਆ' : 'ਵਾਧੂ ਕਟੌਤੀ'}
                        </span>
                      </div>
                    </div>

                    {/* LINKED FAMILY MEMBERS BREAKDOWN DRAWER */}
                    {rec.linked_farmers && rec.linked_farmers.length > 0 && (
                      <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2">
                        <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-700" />
                            <span>ਲਿੰਕ ਕੀਤੇ ਪਰਿਵਾਰਕ ਮੈਂਬਰਾਂ ਦੇ ਨਾਮ 'ਤੇ ਖਰੀਦ ਵੇਰਵਾ (Linked Members Breakdown):</span>
                          </div>
                          <span className="text-[11px] font-mono text-indigo-800 font-bold">
                            ਕੁੱਲ ਲਿੰਕਡ: {rec.linked_purchased_bags} Bags ({rec.linked_purchased_quintals.toFixed(2)} Qtl)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {rec.linked_farmers.map((lf) => (
                            <div 
                              key={lf.id || lf.name_en}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                lf.bags > 0
                                  ? 'bg-purple-100/70 border-purple-300 text-purple-950 font-bold'
                                  : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              <div>
                                <span className="font-bold text-gray-950 block">{lf.name_en}</span>
                                <span className="text-[10px] text-gray-500 block">
                                  {lf.relation} {lf.mobile && `• 📞 ${lf.mobile}`}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                                  lf.bags > 0 ? 'bg-purple-800 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {lf.bags} Bags
                                </span>
                                {lf.bags > 0 && (
                                  <span className="block text-[10px] font-mono text-purple-900 mt-0.5">
                                    {lf.quintals.toFixed(2)} Qtl
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EXPANDABLE ACCORDION FOR COMPLETE ARRIVAL & PURCHASE HISTORY */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleFarmerExpand(rec.uniqueKey)}
                        className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-800 border border-gray-200 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            ਆਵਕ ਪਰਚੀਆਂ ({rec.arrivals.length}) ਅਤੇ ਸਰਕਾਰੀ ਖਰੀਦ ਸਲਿੱਪਾਂ ({rec.purchases.length}) ਦਾ ਪੂਰਾ ਹਿਸਾਬ ਦੇਖੋ
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-indigo-700 font-bold">
                          {isExpanded ? (
                            <>
                              <span>ਵੇਰਵੇ ਬੰਦ ਕਰੋ</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>ਪੂਰੇ ਵੇਰਵੇ ਖੋਲ੍ਹੋ</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </span>
                      </button>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div className="mt-2.5 p-3.5 bg-white border border-gray-200 rounded-xl space-y-4 animate-in fade-in duration-150">
                          {/* 1. Arrival Entries Table */}
                          <div>
                            <div className="text-xs font-bold text-blue-950 mb-1.5 flex items-center gap-1">
                              <Wheat className="w-3.5 h-3.5 text-blue-600" />
                              <span>ਆਵਕ ਪਰਚੀਆਂ ਦਾ ਵੇਰਵਾ (Crop Arrival Inward Records):</span>
                            </div>
                            {rec.arrivals.length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic">ਕੋਈ ਆਵਕ ਪਰਚੀ ਨਹੀਂ ਮਿਲੀ।</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                                  <thead className="bg-blue-50 text-blue-950 font-bold text-[11px]">
                                    <tr>
                                      <th className="p-2">ਮਿਤੀ (Date)</th>
                                      <th className="p-2">ਪਰਚੀ ਨੰਬਰ</th>
                                      <th className="p-2">ਟਰਾਲੀ / ਗੱਡੀ</th>
                                      <th className="p-2 text-right">ਬਾਰਦਾਨਾ (N+O)</th>
                                      <th className="p-2 text-right">ਕੁੱਲ ਬੋਰੀਆਂ</th>
                                      <th className="p-2 text-right">ਵਜ਼ਨ (Qtl)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {rec.arrivals.map((a) => (
                                      <tr key={a.id} className="hover:bg-gray-50 text-[11px]">
                                        <td className="p-2 font-mono">{a.date.split('-').reverse().join('/')}</td>
                                        <td className="p-2 font-mono font-bold text-indigo-900">{a.parchi_no || '-'}</td>
                                        <td className="p-2 font-mono text-gray-700">{a.trolley_no || '-'}</td>
                                        <td className="p-2 text-right font-mono text-gray-600">{a.new_bags}N + {a.old_bags}O</td>
                                        <td className="p-2 text-right font-mono font-bold text-gray-900">{a.bags} Bags</td>
                                        <td className="p-2 text-right font-mono font-bold text-emerald-900">{a.quintals.toFixed(2)} Qtl</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* 2. Purchase Entries Table */}
                          <div>
                            <div className="text-xs font-bold text-emerald-950 mb-1.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ਸਰਕਾਰੀ ਖਰੀਦਾਂ / ਬੋਲੀਆਂ ਦਾ ਵੇਰਵਾ (Agency Purchases & Auctions):</span>
                            </div>
                            {rec.purchases.length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic">ਕੋਈ ਖਰੀਦ ਐਂਟਰੀ ਨਹੀਂ ਹੋਈ।</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
                                  <thead className="bg-emerald-50 text-emerald-950 font-bold text-[11px]">
                                    <tr>
                                      <th className="p-2">ਮਿਤੀ (Date)</th>
                                      <th className="p-2">ਸਰਕਾਰੀ ਏਜੰਸੀ</th>
                                      <th className="p-2">ਫਰਮ (Firm)</th>
                                      <th className="p-2">ਜਿਸਦੇ ਨਾਮ ਪਾਸ ਹੋਈ</th>
                                      <th className="p-2 text-center">ਕਿਸਮ</th>
                                      <th className="p-2 text-right">ਬੋਰੀਆਂ (Bags)</th>
                                      <th className="p-2 text-right">ਵਜ਼ਨ (Qtl)</th>
                                      <th className="p-2 text-right">ਰਕਮ (MSP)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {rec.purchases.map((p) => (
                                      <tr key={p.id} className="hover:bg-gray-50 text-[11px]">
                                        <td className="p-2 font-mono">{p.date.split('-').reverse().join('/')}</td>
                                        <td className="p-2 font-bold text-gray-900">{p.agency}</td>
                                        <td className="p-2 text-[10px] text-gray-600">{p.firm_name}</td>
                                        <td className="p-2 font-bold text-indigo-950">
                                          {p.billed_to_name}
                                          {p.relation && p.relation !== 'Self (ਖੁਦ)' && (
                                            <span className="block text-[10px] text-purple-700 font-normal">
                                              ({p.relation})
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            p.is_linked ? 'bg-purple-100 text-purple-900' : 'bg-emerald-100 text-emerald-900'
                                          }`}>
                                            {p.is_linked ? 'ਲਿੰਕਡ ਖਰੀਦ' : 'ਮੁੱਖ ਖਰੀਦ'}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-mono font-bold text-gray-900">{p.bags} Bags</td>
                                        <td className="p-2 text-right font-mono font-bold text-emerald-900">{p.quintals.toFixed(2)} Qtl</td>
                                        <td className="p-2 text-right font-mono font-bold text-blue-950">
                                          ₹{p.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SINGLE ENTRY MODAL (ਪਰਚੀ ਨੰਬਰ)                                */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-900/10 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Wheat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    ਨਵੀਂ ਫਸਲ ਆਵਕ ਦਰਜ ਕਰੋ (New Crop Arrival)
                  </h3>
                  <p className="text-xs text-gray-500">
                    ਪਰਚੀ ਨੰਬਰ ਕੱਟੋ • 37.5kg ਭਰਤੀ • 3 ਲੇਬਰ ਬਾਕਸ ਕਟੌਤੀ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
              
              {/* Row 1: Date & Mandi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਆਵਕ ਮਿਤੀ (Date):</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold font-mono text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਦਾਣਾ ਮੰਡੀ (Dana Mandi):</label>
                  <select
                    value={mandiName}
                    onChange={(e) => setMandiName(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold text-gray-900"
                  >
                    {MANDI_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Select Registered Farmer */}
              <div>
                <label className="block text-gray-600 font-semibold mb-1">
                  ਕਿਸਾਨ ਮਾਸਟਰ ਵਿੱਚੋਂ ਚੁਣੋ (Select Registered Farmer):
                </label>
                <select
                  value={farmerId}
                  onChange={(e) => handleFarmerSelect(e.target.value)}
                  className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-gray-900 font-bold"
                >
                  <option value="">-- ਕਿਸਾਨ ਚੁਣੋ ਜਾਂ ਹੱਥੀਂ ਨਾਮ ਭਰੋ (Select Farmer) --</option>
                  {registeredFarmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name_en} ({f.name_pa}) - ਪਿੰਡ: {f.village_en} • ਮੋਬਾਈਲ: {f.mobile_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Farmer Name, Father Name & Village */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name):</label>
                  <input
                    type="text"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="Malkit Singh / ਮਲਕੀਤ ਸਿੰਘ"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ (Father Name):</label>
                  <input
                    type="text"
                    value={fatherHusbandName}
                    onChange={(e) => setFatherHusbandName(e.target.value)}
                    placeholder="ਸ/ਓ ਪਿਤਾ ਦਾ ਨਾਮ (Father Name)"
                    className="w-full p-2.5 bg-gray-50 border border-amber-300 rounded-xl text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1 flex items-center justify-between">
                    <span>ਪਿੰਡ (Village):</span>
                    <span className="text-[10px] text-emerald-700">ਸੁਝਾਅ ਲਿਸਟ</span>
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVillage(val);
                      const matched = savedVillages.find(
                        (v) => v.name_en.toLowerCase() === val.trim().toLowerCase() || v.name_pa === val.trim()
                      );
                      if (matched) {
                        setVillagePa(matched.name_pa);
                      }
                    }}
                    list="single-arrival-villages-datalist"
                    placeholder="Bhadaur / Barnala / ਭਦੌੜ"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold"
                    required
                  />
                  <datalist id="single-arrival-villages-datalist">
                    {savedVillages.map((v) => (
                      <option key={`single-v-${v.name_en}`} value={v.name_en}>
                        {v.name_pa} ({v.name_en})
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Quick Select Village Chips for Single Entry Modal */}
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-950 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>ਪਿੰਡ ਚੁਣੋ (Select Village):</span>
                  </span>
                  <span className="text-[10px] text-emerald-700">ਕੋਈ ਵੀ ਨਵਾਂ ਪਿੰਡ ਆਪੇ ਸੇਵ ਹੋਵੇਗਾ</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pt-0.5">
                  {savedVillages.slice(0, 14).map((v) => {
                    const isSelected =
                      (village && village.toLowerCase() === v.name_en.toLowerCase()) ||
                      (villagePa && villagePa === v.name_pa);
                    return (
                      <button
                        key={`single-chip-${v.name_en}`}
                        type="button"
                        onClick={() => {
                          setVillage(v.name_en);
                          setVillagePa(v.name_pa);
                        }}
                        className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                            : 'bg-white hover:bg-emerald-100 text-gray-800 border-gray-300 hover:border-emerald-400'
                        }`}
                      >
                        {v.name_pa ? `${v.name_pa} (${v.name_en})` : v.name_en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Mobile & Vehicle Trolley */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਮੋਬਾਈਲ ਨੰਬਰ (Mobile):</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਟਰਾਲੀ / ਗੱਡੀ ਨੰਬਰ (Vehicle/Trolley):</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder="PB-19-TR-4021"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono uppercase text-gray-900"
                  />
                </div>
              </div>

              {/* Row 5: Crop Variety Dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਫਸਲ ਦਾ ਨਾਮ (Crop):</label>
                  <select
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    <option value="Paddy Grade A">Paddy Grade A (ਝੋਨਾ ਗ੍ਰੇਡ-ਏ)</option>
                    <option value="Hybrid">Hybrid (ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ)</option>
                    <option value="PR-126">PR-126 (ਪੀ.ਆਰ.-126)</option>
                    <option value="Basmati 1509">Basmati 1509</option>
                    <option value="Basmati 1121">Basmati 1121</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">ਕਿਸਮ (Variety):</label>
                  <select
                    value={cropVariety}
                    onChange={(e) => setCropVariety(e.target.value)}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 shadow-sm"
                  >
                    {PADDY_VARIETIES.map((v) => (
                      <option key={`single-variety-opt-${v}`} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bags & Weight: 37.5 kg per bag with New & Old Jute breakdown */}
              <div className="border border-amber-300 rounded-xl p-3 bg-amber-50/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <span>ਬਾਰਦਾਨਾ ਭਰਤੀ (37.5 Kg Standard) + ਤੋਟਾ (Loose kg)</span>
                  <span className="font-mono text-amber-800">ਕੁੱਲ: {totalBags} ਗੱਟੇ</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਨਵਾਂ ਜੂਟ (New):</label>
                    <input
                      type="number"
                      min="0"
                      value={newJuteBags === 0 ? '' : newJuteBags}
                      onChange={(e) => handleBagsChange(e.target.value === '' ? 0 : Number(e.target.value), oldJuteBags)}
                      placeholder="0"
                      className="w-full p-2 bg-white border-2 border-emerald-300 rounded-lg font-mono font-bold text-emerald-950 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਪੁਰਾਣਾ ਜੂਟ (Old):</label>
                    <input
                      type="number"
                      min="0"
                      value={oldJuteBags === 0 ? '' : oldJuteBags}
                      onChange={(e) => handleBagsChange(newJuteBags, e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-white border-2 border-amber-300 rounded-lg font-mono font-bold text-amber-950 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਤੋਟਾ / Loose (Kg):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={looseWeightKg === 0 ? '' : looseWeightKg}
                      onChange={(e) => handleLooseWeightChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0"
                      className="w-full p-2 bg-white border-2 border-purple-300 rounded-lg font-mono font-bold text-purple-950 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਪੈਕਿੰਗ (Kg):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={bagPackingKg}
                      onChange={(e) => handlePackingChange(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-gray-600 font-semibold mb-1">ਵਜ਼ਨ (Quintals):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightQtl}
                      onChange={(e) => setWeightQtl(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-black text-emerald-900"
                      required
                    />
                  </div>
                </div>

                <div className="text-[11px] text-amber-900 flex justify-between pt-1 border-t border-amber-200">
                  <span>ਗਣਨਾ: ({totalBags} ਗੱਟੇ × {bagPackingKg}kg) + {looseWeightKg}kg ਤੋਟਾ = {((totalBags * bagPackingKg) + looseWeightKg).toFixed(1)} kg</span>
                  <span className="font-bold font-mono">{weightQtl.toFixed(2)} ਕੁਇੰਟਲ</span>
                </div>
              </div>

              {/* 3 Labor Boxes */}
              <div className="border border-gray-300 rounded-xl p-3 bg-gray-50 space-y-2.5">
                <div className="text-xs font-bold text-gray-900 flex items-center justify-between border-b pb-1.5 border-gray-200">
                  <span>3 ਲੇਬਰ ਤੇ ਕਟੌਤੀ ਬਾਕਸ (3 Labor & Cleaning Deduction Boxes)</span>
                  <span className="text-red-700 font-mono font-bold">-₹{totalLaborDeductions.toFixed(2)}</span>
                </div>

                {/* Box 1: J-Form Labor (Fixed ₹8/bag) */}
                <div className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-900">ਬਾਕਸ 1: ਜੇ-ਫਾਰਮ ਲੇਬਰ (J-Form Labor - ₹8/bag)</div>
                    <div className="text-[10px] text-gray-500">ਮੰਡੀ ਬੋਰਡ ਲੇਬਰ ਖਰਚਾ (₹{laborRate} × {totalBags} ਬੋਰੀਆਂ)</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-gray-600">₹</span>
                    <input
                      type="number"
                      value={laborRate}
                      onChange={(e) => setLaborRate(Number(e.target.value))}
                      className="w-14 p-1 bg-gray-50 border border-gray-300 rounded font-mono font-bold text-center"
                    />
                    <span className="font-mono font-bold text-red-800 text-xs">
                      = ₹{laborTotal}
                    </span>
                  </div>
                </div>

                {/* Box 2: Sukhi Kiti Paddy (Optional ₹5/bag) */}
                <div className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="arr-sukhi-kiti"
                      checked={enableSukhiKiti}
                      onChange={(e) => setEnableSukhiKiti(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="arr-sukhi-kiti" className="cursor-pointer">
                      <div className="font-bold text-gray-900">ਬਾਕਸ 2: ਸੁਕਾਈ ਖਰਚਾ (Sukhi Kiti - ₹5/bag Optional)</div>
                      <div className="text-[10px] text-gray-500">ਜੇਕਰ ਝੋਨਾ ਸੁਕਾਇਆ ਗਿਆ ਹੋਵੇ (ਆਪਸ਼ਨਲ)</div>
                    </label>
                  </div>
                  {enableSukhiKiti && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-gray-600">₹</span>
                      <input
                        type="number"
                        value={sukhiKitiRate}
                        onChange={(e) => setSukhiKitiRate(Number(e.target.value))}
                        className="w-14 p-1 bg-emerald-50 border border-emerald-300 rounded font-mono font-bold text-center"
                      />
                      <span className="font-mono font-bold text-red-800 text-xs">
                        = ₹{sukhiKitiTotal}
                      </span>
                    </div>
                  )}
                </div>

                {/* Box 3: Double Pakha */}
                <div className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="arr-double-pakha"
                      checked={enableDoublePakha}
                      onChange={(e) => setEnableDoublePakha(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="arr-double-pakha" className="cursor-pointer">
                      <div className="font-bold text-gray-900">ਬਾਕਸ 3: ਡਬਲ ਪੱਖਾ / ਛਣਾਈ (Double Pakha)</div>
                      <div className="text-[10px] text-gray-500">ਵੱਖਰਾ ਬਾਕਸ ਤੇ ਵੱਖਰੀ ਗਣਨਾ</div>
                    </label>
                  </div>
                  {enableDoublePakha && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-gray-600">₹</span>
                      <input
                        type="number"
                        value={doublePakhaRate}
                        onChange={(e) => setDoublePakhaRate(Number(e.target.value))}
                        className="w-14 p-1 bg-amber-50 border border-amber-300 rounded font-mono font-bold text-center"
                      />
                      <span className="font-mono font-bold text-red-800 text-xs">
                        = ₹{doublePakhaTotal}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 7: Moisture & Parchi Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਨਮੀ (Moisture %):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={moisture}
                    onChange={(e) => setMoisture(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-bold mb-1 text-emerald-950">
                    ਪਰਚੀ ਨੰਬਰ (Parchi Number):
                  </label>
                  <input
                    type="text"
                    value={parchiNo}
                    onChange={(e) => setParchiNo(e.target.value)}
                    placeholder="PR-2026-1234"
                    className="w-full p-2.5 bg-emerald-50/70 border border-emerald-400 rounded-xl font-mono font-bold text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                >
                  ਪਰਚੀ ਸੇਵ ਕਰੋ (Save Entry)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 100% FULL EDIT MODAL (With Parchi Number)                      */}
      {/* ============================================================== */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-900/10 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    ਆਵਕ ਐਂਟਰੀ ਸੋਧੋ (Edit Crop Arrival)
                  </h3>
                  <p className="text-xs text-gray-500">
                    ਪਰਚੀ ਨੰਬਰ: {editingEntry.parchi_no || editingEntry.gate_pass_no}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਮਿਤੀ (Date):</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold font-mono text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਦਾਣਾ ਮੰਡੀ (Dana Mandi):</label>
                  <select
                    value={editingEntry.mandi_name || MANDI_LOCATIONS[0]}
                    onChange={(e) => setEditingEntry({ ...editingEntry, mandi_name: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold text-gray-900"
                  >
                    {MANDI_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name):</label>
                  <input
                    type="text"
                    value={editingEntry.farmer_name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, farmer_name: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ (Father Name):</label>
                  <input
                    type="text"
                    value={editingEntry.father_husband_name || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, father_husband_name: e.target.value })}
                    placeholder="ਸ/ਓ ਪਿਤਾ ਦਾ ਨਾਮ"
                    className="w-full p-2.5 bg-gray-50 border border-amber-300 rounded-xl text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1 flex items-center justify-between">
                    <span>ਪਿੰਡ (Village):</span>
                    <span className="text-[10px] text-emerald-700">ਸੁਝਾਅ ਲਿਸਟ</span>
                  </label>
                  <input
                    type="text"
                    value={editingEntry.village}
                    onChange={(e) => setEditingEntry({ ...editingEntry, village: e.target.value })}
                    list="single-arrival-villages-datalist"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਮੋਬਾਈਲ:</label>
                  <input
                    type="tel"
                    value={editingEntry.mobile || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, mobile: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਟਰਾਲੀ / ਵਾਹਨ:</label>
                  <input
                    type="text"
                    value={editingEntry.vehicle_trolley_no}
                    onChange={(e) => setEditingEntry({ ...editingEntry, vehicle_trolley_no: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono uppercase text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-bold mb-1 text-emerald-950">ਪਰਚੀ ਨੰਬਰ (Parchi No):</label>
                  <input
                    type="text"
                    value={editingEntry.parchi_no || editingEntry.gate_pass_no}
                    onChange={(e) => setEditingEntry({ 
                      ...editingEntry, 
                      parchi_no: e.target.value,
                      gate_pass_no: e.target.value 
                    })}
                    className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-bold text-gray-900"
                  />
                </div>
              </div>

              {/* Edit Bags & Tota */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">ਨਵਾਂ ਤੇ ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ + 37.5 kg ਭਰਤੀ + ਤੋਟਾ (Loose kg)</span>
                  <span className="text-[11px] font-bold text-amber-800">
                    ਕੁੱਲ: {Number(editingEntry.new_jute_bags || 0) + Number(editingEntry.old_jute_bags || 0) || editingEntry.total_bags_arrived} Bags
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਨਵਾਂ ਜੂਟ (New):</label>
                    <input
                      type="number"
                      value={editingEntry.new_jute_bags !== undefined ? editingEntry.new_jute_bags : Math.round(editingEntry.total_bags_arrived / 2)}
                      onChange={(e) => {
                        const newJ = Number(e.target.value) || 0;
                        const oldJ = editingEntry.old_jute_bags !== undefined ? editingEntry.old_jute_bags : (editingEntry.total_bags_arrived - newJ);
                        const tot = newJ + oldJ;
                        const pack = editingEntry.bag_packing_kg || 37.5;
                        const loose = editingEntry.loose_weight_kg || 0;
                        const w = Number((((tot * pack) + loose) / 100).toFixed(2));
                        setEditingEntry({ ...editingEntry, new_jute_bags: newJ, old_jute_bags: oldJ, total_bags_arrived: tot, weight_quintals: w });
                      }}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣਾ ਜੂਟ (Old):</label>
                    <input
                      type="number"
                      value={editingEntry.old_jute_bags !== undefined ? editingEntry.old_jute_bags : Math.floor(editingEntry.total_bags_arrived / 2)}
                      onChange={(e) => {
                        const oldJ = Number(e.target.value) || 0;
                        const newJ = editingEntry.new_jute_bags !== undefined ? editingEntry.new_jute_bags : (editingEntry.total_bags_arrived - oldJ);
                        const tot = newJ + oldJ;
                        const pack = editingEntry.bag_packing_kg || 37.5;
                        const loose = editingEntry.loose_weight_kg || 0;
                        const w = Number((((tot * pack) + loose) / 100).toFixed(2));
                        setEditingEntry({ ...editingEntry, new_jute_bags: newJ, old_jute_bags: oldJ, total_bags_arrived: tot, weight_quintals: w });
                      }}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਤੋਟਾ / Loose (Kg):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingEntry.loose_weight_kg || 0}
                      onChange={(e) => {
                        const loose = Number(e.target.value) || 0;
                        const tot = editingEntry.total_bags_arrived || 0;
                        const pack = editingEntry.bag_packing_kg || 37.5;
                        const w = Number((((tot * pack) + loose) / 100).toFixed(2));
                        setEditingEntry({ ...editingEntry, loose_weight_kg: loose, weight_quintals: w });
                      }}
                      className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-900"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਪੈਕਿੰਗ (Kg):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingEntry.bag_packing_kg || 37.5}
                      onChange={(e) => {
                        const pack = Number(e.target.value) || 37.5;
                        const tot = editingEntry.total_bags_arrived || 0;
                        const loose = editingEntry.loose_weight_kg || 0;
                        const w = Number((((tot * pack) + loose) / 100).toFixed(2));
                        setEditingEntry({ ...editingEntry, bag_packing_kg: pack, weight_quintals: w });
                      }}
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-gray-600 font-semibold mb-1">ਵਜ਼ਨ (Quintals):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingEntry.weight_quintals}
                      onChange={(e) => setEditingEntry({ ...editingEntry, weight_quintals: Number(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-black text-emerald-900"
                    />
                  </div>
                </div>
              </div>

              {/* Edit 3 Labor Boxes */}
              <div className="border border-gray-300 rounded-xl p-3 bg-gray-50 space-y-2.5">
                <div className="text-xs font-bold text-gray-900 border-b pb-1.5 border-gray-200">
                  3 ਲੇਬਰ ਤੇ ਕਟੌਤੀ ਬਾਕਸ (3 Labor & Cleaning Boxes)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2 bg-white border border-gray-200 rounded-lg">
                    <label className="block text-gray-700 font-bold mb-1">1. ਜੇ-ਫਾਰਮ ਲੇਬਰ (₹/bag):</label>
                    <input
                      type="number"
                      value={editingEntry.labor_rate !== undefined ? editingEntry.labor_rate : 8}
                      onChange={(e) => setEditingEntry({ ...editingEntry, labor_rate: Number(e.target.value) })}
                      className="w-full p-1.5 bg-gray-50 border border-gray-300 rounded font-mono font-bold"
                    />
                  </div>

                  <div className="p-2 bg-white border border-gray-200 rounded-lg">
                    <label className="block text-gray-700 font-bold mb-1">2. ਸੁਕਾਈ ਖਰਚਾ (₹/bag):</label>
                    <input
                      type="number"
                      value={editingEntry.sukhi_kiti_rate || 0}
                      onChange={(e) => setEditingEntry({ ...editingEntry, sukhi_kiti_rate: Number(e.target.value) })}
                      className="w-full p-1.5 bg-emerald-50 border border-emerald-300 rounded font-mono font-bold"
                    />
                  </div>

                  <div className="p-2 bg-white border border-gray-200 rounded-lg">
                    <label className="block text-gray-700 font-bold mb-1">3. ਡਬਲ ਪੱਖਾ (₹/bag):</label>
                    <input
                      type="number"
                      value={editingEntry.double_pakha_rate || 0}
                      onChange={(e) => setEditingEntry({ ...editingEntry, double_pakha_rate: Number(e.target.value) })}
                      className="w-full p-1.5 bg-amber-50 border border-amber-300 rounded font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                >
                  ਸੋਧ ਸੇਵ ਕਰੋ (Update 100%)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
