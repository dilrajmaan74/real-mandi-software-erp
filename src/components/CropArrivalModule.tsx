import React, { useState, useMemo } from 'react';
import { 
  CropArrivalEntry, 
  FarmerMaster, 
  GoogleSheetConfig, 
  MANDI_LOCATIONS, 
  AgencyPurchaseEntry 
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
  ListPlus
} from 'lucide-react';
import { appendCropArrivalToSheets } from '../lib/sheets';

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

  // Form states for Single Entry
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
  const [newJuteBags, setNewJuteBags] = useState<number>(200);
  const [oldJuteBags, setOldJuteBags] = useState<number>(200);
  const totalBags = Number(newJuteBags || 0) + Number(oldJuteBags || 0);
  const [looseWeightKg, setLooseWeightKg] = useState<number>(15);
  const [weightQtl, setWeightQtl] = useState<number>(150.15);
  const [moisture, setMoisture] = useState<number>(16.5);
  const [parchiNo, setParchiNo] = useState(`PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // 3 Dedicated Labor / Deduction Boxes
  const [laborRate, setLaborRate] = useState<number>(8);
  const [enableSukhiKiti, setEnableSukhiKiti] = useState<boolean>(false);
  const [sukhiKitiRate, setSukhiKitiRate] = useState<number>(5);
  const [enableDoublePakha, setEnableDoublePakha] = useState<boolean>(false);
  const [doublePakhaRate, setDoublePakhaRate] = useState<number>(4);

  // --- BATCH ENTRY MODE STATES ---
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchEntryDate, setBatchEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchMandi, setBatchMandi] = useState('Mandi Kamalpur (ਕਮਾਲਪੁਰ)');
  const [stagedEntries, setStagedEntries] = useState<CropArrivalEntry[]>([]);
  
  // Staging Row Form states
  const [batchFarmerId, setBatchFarmerId] = useState('');
  const [batchFarmerName, setBatchFarmerName] = useState('');
  const [batchFarmerNamePa, setBatchFarmerNamePa] = useState('');
  const [batchFatherName, setBatchFatherName] = useState('');
  const [batchVillage, setBatchVillage] = useState('');
  const [batchVillagePa, setBatchVillagePa] = useState('');
  const [batchMobile, setBatchMobile] = useState('');
  const [batchCropType, setBatchCropType] = useState('Paddy Grade A');
  const [batchCropVariety, setBatchCropVariety] = useState('PR-126');
  const [batchVehicleNo, setBatchVehicleNo] = useState('');
  const [batchNewBags, setBatchNewBags] = useState<number>(200);
  const [batchOldBags, setBatchOldBags] = useState<number>(200);
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
  const [compStatusFilter, setCompStatusFilter] = useState<'All' | 'Pending' | 'Completed'>('All');

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
    setNewJuteBags(200);
    setOldJuteBags(200);
    setLooseWeightKg(15);
    setBagPackingKg(37.5);
    setWeightQtl(150.15);
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

    setStagedEntries((prev) => [...prev, stagedItem]);

    // Reset input row for next farmer (keep batchEntryDate for rapid entry)
    setBatchFarmerId('');
    setBatchFarmerName('');
    setBatchFarmerNamePa('');
    setBatchFatherName('');
    setBatchVillage('');
    setBatchVillagePa('');
    setBatchMobile('');
    setBatchVehicleNo('');
    setBatchNewBags(200);
    setBatchOldBags(200);
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
  const comparisonData = useMemo(() => {
    // Unique list of farmers from registered farmers plus any unique names in arrival
    const farmerMap = new Map<string, {
      farmer_id?: string;
      name_en: string;
      name_pa: string;
      village: string;
      mobile: string;
      linked_farmers: { id: string; name_en: string; name_pa: string; relation: string; bags: number }[];
      arrived_bags: number;
      arrived_quintals: number;
      own_purchased_bags: number;
      total_purchased_bags: number;
      balance_bags: number;
    }>();

    // 1. Seed from registered farmers
    registeredFarmers.forEach((rf) => {
      farmerMap.set(rf.name_en.toLowerCase().trim(), {
        farmer_id: rf.id,
        name_en: rf.name_en,
        name_pa: rf.name_pa,
        village: rf.village_en,
        mobile: rf.mobile_number,
        linked_farmers: (rf.linked_farmers || []).map((lf) => ({
          id: lf.id,
          name_en: lf.name_en,
          name_pa: lf.name_pa,
          relation: lf.relation,
          bags: 0,
        })),
        arrived_bags: 0,
        arrived_quintals: 0,
        own_purchased_bags: 0,
        total_purchased_bags: 0,
        balance_bags: 0,
      });
    });

    // 2. Add Arrival totals
    entries.forEach((arr) => {
      const key = arr.farmer_name.toLowerCase().trim();
      let record = farmerMap.get(key);
      if (!record) {
        record = {
          farmer_id: arr.farmer_id,
          name_en: arr.farmer_name,
          name_pa: arr.farmer_name_pa || arr.farmer_name,
          village: arr.village,
          mobile: arr.mobile,
          linked_farmers: [],
          arrived_bags: 0,
          arrived_quintals: 0,
          own_purchased_bags: 0,
          total_purchased_bags: 0,
          balance_bags: 0,
        };
        farmerMap.set(key, record);
      }
      record.arrived_bags += Number(arr.total_bags_arrived || 0);
      record.arrived_quintals += Number(arr.weight_quintals || 0);
    });

    // 3. Match purchases (Own name vs Linked members)
    agencyPurchases.forEach((pur) => {
      const mainFarmerKey = pur.farmer_name.toLowerCase().trim();
      const record = farmerMap.get(mainFarmerKey);
      const billedToKey = (pur.billed_to_name || '').toLowerCase().trim();
      const purBags = Number(pur.total_bags || 0);

      if (record) {
        // Is it billed to the farmer himself?
        const isSelf = billedToKey === mainFarmerKey || 
                       billedToKey === (record.name_pa || '').toLowerCase().trim() ||
                       billedToKey === 'self' || 
                       billedToKey === '';

        if (isSelf) {
          record.own_purchased_bags += purBags;
        } else {
          // Check if matches one of the linked family members
          const linkedMatch = record.linked_farmers.find((lf) => 
            lf.name_en.toLowerCase().trim() === billedToKey || 
            lf.name_pa.toLowerCase().trim() === billedToKey
          );

          if (linkedMatch) {
            linkedMatch.bags += purBags;
          } else {
            // Unregistered linked person or alternate family name
            record.linked_farmers.push({
              id: `LF-AUTO-${Date.now().toString().slice(-4)}`,
              name_en: pur.billed_to_name,
              name_pa: pur.billed_to_name,
              relation: pur.relation_with_main || 'Family Member',
              bags: purBags,
            });
          }
        }
      }
    });

    // 4. Compute totals and balances
    const list = Array.from(farmerMap.values()).map((rec) => {
      const linkedTotal = rec.linked_farmers.reduce((sum, lf) => sum + lf.bags, 0);
      const totalPurchased = rec.own_purchased_bags + linkedTotal;
      const balance = rec.arrived_bags - totalPurchased;

      return {
        ...rec,
        total_purchased_bags: totalPurchased,
        balance_bags: balance,
      };
    });

    // Filter to only those with arrival or purchases
    return list.filter((r) => r.arrived_bags > 0 || r.total_purchased_bags > 0);
  }, [registeredFarmers, entries, agencyPurchases]);

  const filteredComparison = useMemo(() => {
    const q = compSearch.toLowerCase();
    return comparisonData.filter((r) => {
      const matchSearch =
        r.name_en.toLowerCase().includes(q) ||
        r.name_pa.toLowerCase().includes(q) ||
        r.village.toLowerCase().includes(q) ||
        r.mobile.includes(q);

      if (!matchSearch) return false;

      if (compStatusFilter === 'Pending') {
        return r.balance_bags > 0;
      }
      if (compStatusFilter === 'Completed') {
        return r.balance_bags <= 0;
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
                <input
                  type="text"
                  value={batchCropVariety}
                  onChange={(e) => setBatchCropVariety(e.target.value)}
                  list="master-batch-variety-options"
                  placeholder="e.g. PR-126 / PR-131 / 1509"
                  className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 text-xs"
                />
                <datalist id="master-batch-variety-options">
                  <option value="PR-126" />
                  <option value="PR-131" />
                  <option value="PR-130" />
                  <option value="PR-128" />
                  <option value="Pusa 44" />
                  <option value="1509 Basmati" />
                  <option value="1121 Basmati" />
                  <option value="1718 Basmati" />
                  <option value="Hybrid" />
                  <option value="PB-1" />
                  <option value="HD-3086" />
                  <option value="HD-2967" />
                </datalist>
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

              <div>
                <label className="block text-gray-700 font-bold mb-1">ਰਜਿਸਟਰਡ ਕਿਸਾਨ ਚੁਣੋ:</label>
                <select
                  value={batchFarmerId}
                  onChange={(e) => handleBatchFarmerSelect(e.target.value)}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-gray-900 font-bold shadow-sm"
                >
                  <option value="">-- ਕਿਸਾਨ ਚੁਣੋ ਜਾਂ ਹੱਥੀਂ ਭਰੋ --</option>
                  {registeredFarmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name_en} {f.father_husband_name_en ? `(ਸ/ਓ ${f.father_husband_name_en})` : ''} - ਪਿੰਡ: {f.village_en}
                    </option>
                  ))}
                </select>
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
                <label className="block text-gray-700 font-bold mb-1">ਪਿੰਡ (Village):</label>
                <input
                  type="text"
                  value={batchVillage}
                  onChange={(e) => setBatchVillage(e.target.value)}
                  placeholder="e.g. Bhadaur"
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium shadow-sm"
                  required
                />
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
                <input
                  type="text"
                  value={batchCropVariety}
                  onChange={(e) => setBatchCropVariety(e.target.value)}
                  list="row-variety-options"
                  placeholder="PR-126 / PR-131 / 1509"
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-bold text-gray-900"
                />
                <datalist id="row-variety-options">
                  <option value="PR-126" />
                  <option value="PR-131" />
                  <option value="PR-130" />
                  <option value="PR-128" />
                  <option value="Pusa 44" />
                  <option value="1509 Basmati" />
                  <option value="1121 Basmati" />
                  <option value="1718 Basmati" />
                  <option value="Hybrid" />
                  <option value="PB-1" />
                  <option value="HD-3086" />
                  <option value="HD-2967" />
                </datalist>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਮੋਬਾਈਲ (Mobile):</label>
                <input
                  type="tel"
                  value={batchMobile}
                  onChange={(e) => setBatchMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਵਾਹਨ / ਟਰਾਲੀ (Vehicle):</label>
                <input
                  type="text"
                  value={batchVehicleNo}
                  onChange={(e) => setBatchVehicleNo(e.target.value)}
                  placeholder="PB-19-TR-4021"
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono uppercase text-gray-900"
                />
              </div>
            </div>

            {/* Row 3: Bags, Loose & Parchi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਨਵਾਂ ਜੂਟ (New Bags):</label>
                <input
                  type="number"
                  value={batchNewBags}
                  onChange={(e) => setBatchNewBags(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣਾ ਜੂਟ (Old Bags):</label>
                <input
                  type="number"
                  value={batchOldBags}
                  onChange={(e) => setBatchOldBags(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਤੋਟਾ (Loose kg):</label>
                <input
                  type="number"
                  value={batchLooseKg}
                  onChange={(e) => setBatchLooseKg(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-900"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਪਰਚੀ ਨੰਬਰ (Parchi No):</label>
                <input
                  type="text"
                  value={batchParchiNo}
                  onChange={(e) => setBatchParchiNo(e.target.value)}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-bold text-gray-900"
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
        <div className="p-5 space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4">
            <h3 className="font-bold text-blue-950 flex items-center gap-2 text-sm">
              <BarChart3 className="w-5 h-5 text-blue-700" />
              <span>ਕਿਸਾਨ ਆਵਕ ਬਨਾਮ ਖਰੀਦ ਚਾਰਟ ਤੇ ਲਿੰਕ ਕਿਸਾਨ ਹਿਸਾਬ (Farmer Arrival vs Purchase Breakdown)</span>
            </h3>
            <p className="text-xs text-blue-900 mt-1">
              ਇਹ ਚਾਰਟ ਦਿਖਾਉਂਦਾ ਹੈ ਕਿ ਕਿਸਾਨ ਮੰਡੀ ਵਿੱਚ ਕਿੰਨੇ ਗੱਟੇ ਲੈ ਕੇ ਆਇਆ, ਕਿੰਨੇ ਗੱਟਿਆਂ ਦੀ ਖਰੀਦ ਉਸਨੇ ਆਪਣੇ ਨਾਮ ਕਰਵਾਈ ਅਤੇ ਕਿੰਨੇ ਗੱਟੇ ਉਸਦੇ ਨਾਲ ਲਿੰਕ ਪਰਿਵਾਰਕ ਮੈਂਬਰਾਂ ਦੇ ਨਾਮ 'ਤੇ ਪਾਸ ਹੋਏ ਅਤੇ ਮੰਡੀ ਯਾਰਡ ਵਿੱਚ ਕਿੰਨੇ ਬੈਗ ਬਕਾਇਆ ਹਨ।
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={compSearch}
                onChange={(e) => setCompSearch(e.target.value)}
                placeholder="ਕਿਸਾਨ ਜਾਂ ਪਿੰਡ ਖੋਜੋ..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCompStatusFilter('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  compStatusFilter === 'All' ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                ਸਾਰੇ ({comparisonData.length})
              </button>
              <button
                type="button"
                onClick={() => setCompStatusFilter('Pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  compStatusFilter === 'Pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}
              >
                ਬਾਕੀ ਬੈਗ (Pending Balance)
              </button>
              <button
                type="button"
                onClick={() => setCompStatusFilter('Completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  compStatusFilter === 'Completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                }`}
              >
                ਮੁਕੰਮਲ (Fully Purchased)
              </button>
            </div>
          </div>

          {/* Comparison Cards / Table */}
          <div className="space-y-3">
            {filteredComparison.length === 0 ? (
              <div className="p-12 text-center text-gray-400 border border-gray-200 rounded-2xl bg-white">
                ਕੋਈ ਕਿਸਾਨ ਹਿਸਾਬ ਨਹੀਂ ਮਿਲਿਆ।
              </div>
            ) : (
              filteredComparison.map((rec) => {
                const isCleared = rec.balance_bags === 0;
                const isOver = rec.balance_bags < 0;

                return (
                  <div 
                    key={rec.name_en}
                    className="border border-gray-200 hover:border-blue-300 rounded-2xl p-4 bg-white shadow-xs transition-all space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                          {rec.name_en.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>{rec.name_en}</span>
                            <span className="text-gray-500 font-normal">({rec.name_pa})</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            ਪਿੰਡ: {rec.village} {rec.mobile && `• 📞 ${rec.mobile}`}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isCleared ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ਸਾਰੀ ਫਸਲ ਪਾਸ (Fully Purchased)
                          </span>
                        ) : isOver ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-900 px-3 py-1 rounded-full">
                            ਵਾਧੂ ਖਰੀਦ (+{Math.abs(rec.balance_bags)} ਬੈਗ ਵੱਧ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-950 px-3 py-1 rounded-full border border-amber-300 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            {rec.balance_bags} ਬੈਗ ਮੰਡੀ ਵਿੱਚ ਬਾਕੀ (Pending)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Numeric Metric Bars */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {/* Box 1: Arrived */}
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                        <span className="text-gray-500 block text-[11px]">1. ਕੁੱਲ ਆਏ ਗੱਟੇ (Arrival):</span>
                        <div className="text-base font-bold font-mono text-gray-900 mt-0.5">
                          {rec.arrived_bags} Bags
                        </div>
                        <div className="text-[10px] text-gray-500">{rec.arrived_quintals.toFixed(2)} Qtl</div>
                      </div>

                      {/* Box 2: Own Name Purchase */}
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="text-emerald-800 block text-[11px]">2. ਆਪਣੇ ਨਾਮ ਖਰੀਦ (Own):</span>
                        <div className="text-base font-bold font-mono text-emerald-950 mt-0.5">
                          {rec.own_purchased_bags} Bags
                        </div>
                        <div className="text-[10px] text-emerald-700">ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਨਾਮ</div>
                      </div>

                      {/* Box 3: Linked Farmers Total */}
                      <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                        <span className="text-blue-800 block text-[11px]">3. ਲਿੰਕ ਕਿਸਾਨ ਖਰੀਦ (Linked):</span>
                        <div className="text-base font-bold font-mono text-blue-950 mt-0.5">
                          {rec.total_purchased_bags - rec.own_purchased_bags} Bags
                        </div>
                        <div className="text-[10px] text-blue-700">{rec.linked_farmers.length} ਲਿੰਕ ਮੈਂਬਰ</div>
                      </div>

                      {/* Box 4: Balance Remaining */}
                      <div className={`p-2.5 rounded-xl border ${
                        rec.balance_bags > 0 ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <span className="text-gray-600 block text-[11px]">4. ਮੰਡੀ ਵਿੱਚ ਬਕਾਇਆ (Balance):</span>
                        <div className={`text-base font-bold font-mono mt-0.5 ${
                          rec.balance_bags > 0 ? 'text-amber-950 font-black' : 'text-gray-800'
                        }`}>
                          {rec.balance_bags} Bags
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {rec.balance_bags > 0 ? 'ਯਾਰਡ ਵਿੱਚ ਪਏ ਹਨ' : 'ਸਾਰੇ ਪਾਸ'}
                        </div>
                      </div>
                    </div>

                    {/* Linked Family Members Breakdown Drawer */}
                    {rec.linked_farmers && rec.linked_farmers.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>ਲਿੰਕ ਕੀਤੇ ਪਰਿਵਾਰਕ ਮੈਂਬਰਾਂ ਦੇ ਨਾਮ 'ਤੇ ਖਰੀਦ ਵੇਰਵਾ (Linked Breakdown):</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rec.linked_farmers.map((lf) => (
                            <div 
                              key={lf.id || lf.name_en}
                              className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs flex items-center gap-2"
                            >
                              <span className="font-semibold text-gray-800">{lf.name_en} ({lf.name_pa || lf.relation}):</span>
                              <span className="font-bold font-mono text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">
                                {lf.bags} ਬੈਗ
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                  <label className="block text-gray-600 font-semibold mb-1">ਪਿੰਡ (Village):</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="Bhadaur / Barnala"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                    required
                  />
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
                  <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਮ (Variety):</label>
                  <input
                    type="text"
                    value={cropVariety}
                    onChange={(e) => setCropVariety(e.target.value)}
                    placeholder="PR-126 / Grade A"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-semibold"
                  />
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
                    <label className="block text-gray-600 font-semibold mb-1">ਨਵਾਂ ਜੂਟ (New):</label>
                    <input
                      type="number"
                      value={newJuteBags}
                      onChange={(e) => handleBagsChange(Number(e.target.value), oldJuteBags)}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣਾ ਜੂਟ (Old):</label>
                    <input
                      type="number"
                      value={oldJuteBags}
                      onChange={(e) => handleBagsChange(newJuteBags, Number(e.target.value))}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਤੋਟਾ / Loose (Kg):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={looseWeightKg}
                      onChange={(e) => handleLooseWeightChange(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-900"
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
                  <label className="block text-gray-600 font-semibold mb-1">ਪਿੰਡ (Village):</label>
                  <input
                    type="text"
                    value={editingEntry.village}
                    onChange={(e) => setEditingEntry({ ...editingEntry, village: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
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
