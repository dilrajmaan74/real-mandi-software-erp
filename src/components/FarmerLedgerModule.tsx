import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FarmerMaster, 
  CropArrivalEntry, 
  BardanaEntry, 
  AgencyPurchaseEntry, 
  FarmerLedgerEntry,
  ARHTIA_FIRMS,
  MANDI_LOCATIONS
} from '../types/mandi';
import { 
  Users, 
  Search, 
  Printer, 
  Share2, 
  PlusCircle, 
  Wheat, 
  Building2, 
  Package, 
  Wallet, 
  CreditCard, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Calendar, 
  Trash2, 
  FileText, 
  X,
  ExternalLink,
  ChevronRight,
  Edit2,
  RotateCcw,
  Check,
  Download,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface FarmerLedgerModuleProps {
  farmers: FarmerMaster[];
  cropArrivals: CropArrivalEntry[];
  bardanaEntries: BardanaEntry[];
  agencyPurchases: AgencyPurchaseEntry[];
  ledgerEntries: FarmerLedgerEntry[];
  onAddLedgerEntry: (entry: FarmerLedgerEntry) => void;
  onDeleteLedgerEntry: (id: string) => void;
  onNavigateModule: (module: 'farmers' | 'arrivals' | 'bardana' | 'agency' | 'lifting' | 'letterpad' | 'ai_assistant' | 'dashboard' | 'farmer_ledger') => void;
  currentMandi: string;
  selectedFarmerIdProp?: string | null;
  onSelectFarmer?: (farmerId: string) => void;
}

interface FarmerAdjustments {
  palledariRate: number; // default 8
  customPalledariAmount?: number;
  enableSukhiKiti: boolean;
  sukhiKitiRate: number; // default 5
  customSukhiKitiAmount?: number;
  enableDoublePakha: boolean;
  doublePakhaRate: number; // default 4
  customDoublePakhaAmount?: number;
  directAdvance: number;
  directPreviousKhata: number;
}

export const FarmerLedgerModule: React.FC<FarmerLedgerModuleProps> = ({
  farmers,
  cropArrivals,
  bardanaEntries,
  agencyPurchases,
  ledgerEntries,
  onAddLedgerEntry,
  onDeleteLedgerEntry,
  onNavigateModule,
  currentMandi,
  selectedFarmerIdProp,
  onSelectFarmer,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
    selectedFarmerIdProp || (farmers.length > 0 ? farmers[0].id : '')
  );
  const [activeTab, setActiveTab] = useState<'purchases' | 'arrivals' | 'advances' | 'bardana'>('purchases');
  
  // Track previous external selectedFarmerIdProp so internal selections are never wiped or reverted
  const lastPropFarmerIdRef = useRef<string | null | undefined>(selectedFarmerIdProp);
  useEffect(() => {
    if (selectedFarmerIdProp && selectedFarmerIdProp !== lastPropFarmerIdRef.current) {
      lastPropFarmerIdRef.current = selectedFarmerIdProp;
      setSelectedFarmerId(selectedFarmerIdProp);
    }
  }, [selectedFarmerIdProp]);

  // Handle active farmer change with immediate state update and parent sync
  const handleFarmerChange = (newFarmerIdOrName: string) => {
    if (!newFarmerIdOrName) return;
    // Find matched farmer if passed an ID, English Name, or Punjabi Name
    const cleanTarget = normalizeCleanStr(newFarmerIdOrName);
    const matched = allMasterFarmers.find((f) => 
      f.id === newFarmerIdOrName || 
      normalizeCleanStr(f.name_en) === cleanTarget ||
      (f.name_pa && normalizeCleanStr(f.name_pa) === cleanTarget) ||
      (f.name_pa && f.name_pa.trim() === newFarmerIdOrName.trim())
    );
    const targetId = matched ? matched.id : newFarmerIdOrName;
    setSelectedFarmerId(targetId);
    lastPropFarmerIdRef.current = targetId;
    onSelectFarmer?.(targetId);
  };

  // Advance/Cash Transaction Modal
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEntryType, setNewEntryType] = useState<FarmerLedgerEntry['transaction_type']>('Advance (ਪੇਸ਼ਗੀ)');
  const [newEntryAmount, setNewEntryAmount] = useState<number | ''>('');
  const [newEntryDirection, setNewEntryDirection] = useState<'debit' | 'credit'>('debit');
  const [newEntryMode, setNewEntryMode] = useState<FarmerLedgerEntry['payment_mode']>('Cash (ਨਕਦ)');
  const [newEntryNotes, setNewEntryNotes] = useState('');

  // Comprehensive Phone Number Cleaning (extracts last 10 digits)
  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  // Normalized clean string for matching
  const normalizeCleanStr = (s?: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  // Format date in Day/Month/Year (DD/MM/YYYY) format
  const formatDmy = (rawDate?: string): string => {
    if (!rawDate) return '—';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return rawDate;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return rawDate;
    }
  };

  // 1. Comprehensive list of all farmers across Directory + Arrivals + Purchases + Ledger
  // Never drops farmers due to phone numbers (shared phones or shop phones)
  const allMasterFarmers = useMemo(() => {
    const list: FarmerMaster[] = [...farmers];
    const seenIds = new Set(farmers.map((f) => f.id));
    const seenKeys = new Set(
      farmers.map((f) => `${normalizeCleanStr(f.name_en)}|${normalizeCleanStr(f.village_en)}`)
    );

    // Discover any farmers from Crop Arrivals
    cropArrivals.forEach((a) => {
      const aName = (a.farmer_name || '').trim();
      if (!aName) return;
      const aNorm = normalizeCleanStr(aName);
      const aVillage = normalizeCleanStr(a.village);
      const aKey = `${aNorm}|${aVillage}`;

      // Check if this farmer is already present in list by exact name & village or linked member
      const existing = list.find((f) => {
        const fNorm = normalizeCleanStr(f.name_en);
        const fPa = (f.name_pa || '').trim();
        const fVil = normalizeCleanStr(f.village_en);
        const nameMatch = fNorm === aNorm || (fPa && fPa === aName) || (a.farmer_name_pa && fPa === a.farmer_name_pa);
        const linkedMatch = (f.linked_farmers || []).some((lf) => {
          const lfNorm = normalizeCleanStr(lf.name_en);
          const lfPa = (lf.name_pa || '').trim();
          return lfNorm === aNorm || (lfPa && lfPa === aName);
        });
        if (!nameMatch && !linkedMatch) return false;
        if (aVillage && fVil && aVillage !== fVil && !aVillage.includes(fVil) && !fVil.includes(aVillage)) return false;
        return true;
      });
      if (existing) return;

      if (seenKeys.has(aKey)) return;

      const safeFarmerSlug = (aNorm.replace(/\s+/g, '_') || 'f').slice(0, 30);
      const safeVillageSlug = (aVillage.replace(/\s+/g, '_') || 'v').slice(0, 20);
      // Only reuse a.farmer_id if not already owned by another farmer in seenIds
      const genId = (a.farmer_id && !seenIds.has(a.farmer_id))
        ? a.farmer_id
        : `ARR-FARMER-${safeFarmerSlug}-${safeVillageSlug}`;

      if (seenIds.has(genId)) return;

      seenKeys.add(aKey);
      seenIds.add(genId);

      list.push({
        id: genId,
        name_en: a.farmer_name,
        name_pa: a.farmer_name_pa || '',
        father_husband_name_en: a.father_husband_name || '',
        father_husband_name_pa: a.father_husband_name_pa || '',
        village_en: a.village || '',
        village_pa: a.village_pa || '',
        mobile_number: a.mobile || '',
        aadhaar_number: '',
        linked_farmers: [],
        created_at: a.date || new Date().toISOString(),
      });
    });

    // Discover any farmers from Agency Purchases (J-Forms)
    agencyPurchases.forEach((p) => {
      const pName = (p.farmer_name || '').trim();
      if (!pName) return;
      const pNorm = normalizeCleanStr(pName);
      const pVillage = normalizeCleanStr(p.address_village || p.village);
      const pKey = `${pNorm}|${pVillage}`;

      const existing = list.find((f) => {
        const fNorm = normalizeCleanStr(f.name_en);
        const fPa = (f.name_pa || '').trim();
        const fVil = normalizeCleanStr(f.village_en);
        const nameMatch = fNorm === pNorm || (fPa && fPa === pName);
        const linkedMatch = (f.linked_farmers || []).some((lf) => {
          const lfNorm = normalizeCleanStr(lf.name_en);
          const lfPa = (lf.name_pa || '').trim();
          return lfNorm === pNorm || (lfPa && lfPa === pName);
        });
        if (!nameMatch && !linkedMatch) return false;
        if (pVillage && fVil && pVillage !== fVil && !pVillage.includes(fVil) && !fVil.includes(pVillage)) return false;
        return true;
      });
      if (existing) return;

      if (seenKeys.has(pKey)) return;

      const safeFarmerSlug = (pNorm.replace(/\s+/g, '_') || 'f').slice(0, 30);
      const safeVillageSlug = (pVillage.replace(/\s+/g, '_') || 'v').slice(0, 20);
      const genId = (p.farmer_id && !seenIds.has(p.farmer_id))
        ? p.farmer_id
        : `PUR-FARMER-${safeFarmerSlug}-${safeVillageSlug}`;

      if (seenIds.has(genId)) return;

      seenKeys.add(pKey);
      seenIds.add(genId);

      list.push({
        id: genId,
        name_en: p.farmer_name,
        name_pa: '',
        father_husband_name_en: p.father_husband_name || '',
        father_husband_name_pa: '',
        village_en: p.address_village || p.village || '',
        village_pa: '',
        mobile_number: p.mobile || '',
        aadhaar_number: '',
        linked_farmers: [],
        created_at: p.date || new Date().toISOString(),
      });
    });

    return list;
  }, [farmers, cropArrivals, agencyPurchases]);

  // Ensure selectedFarmerId is initialized if empty
  useEffect(() => {
    if (allMasterFarmers.length > 0 && !selectedFarmerId) {
      setSelectedFarmerId(allMasterFarmers[0].id);
    }
  }, [allMasterFarmers, selectedFarmerId]);

  // Selected Farmer (from all discovered farmers - resilient to IDs, Names, and Slugs)
  const currentFarmer = useMemo(() => {
    if (!allMasterFarmers || allMasterFarmers.length === 0) return null;
    if (selectedFarmerId) {
      // 1. Exact ID Match
      const foundById = allMasterFarmers.find((f) => f.id === selectedFarmerId);
      if (foundById) return foundById;

      // 2. Exact Name Match (English or Punjabi)
      const selNorm = normalizeCleanStr(selectedFarmerId);
      const foundByName = allMasterFarmers.find((f) => 
        normalizeCleanStr(f.name_en) === selNorm ||
        (f.name_pa && normalizeCleanStr(f.name_pa) === selNorm) ||
        (f.name_pa && f.name_pa.trim() === selectedFarmerId.trim())
      );
      if (foundByName) return foundByName;

      // 3. Partial / Slug Match
      const foundByFuzzy = allMasterFarmers.find((f) => {
        const fNorm = normalizeCleanStr(f.name_en);
        return f.id.toLowerCase().includes(selectedFarmerId.toLowerCase()) ||
          selectedFarmerId.toLowerCase().includes(f.id.toLowerCase()) ||
          (fNorm && selNorm && (selNorm.includes(fNorm) || fNorm.includes(selNorm)));
      });
      if (foundByFuzzy) return foundByFuzzy;
    }
    return allMasterFarmers[0] || null;
  }, [allMasterFarmers, selectedFarmerId]);

  // Filtered farmers list for search
  const filteredFarmers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allMasterFarmers;
    return allMasterFarmers.filter((f) => 
      f.name_en.toLowerCase().includes(q) ||
      (f.name_pa && f.name_pa.toLowerCase().includes(q)) ||
      (f.village_en && f.village_en.toLowerCase().includes(q)) ||
      (f.village_pa && f.village_pa.toLowerCase().includes(q)) ||
      (f.mobile_number && f.mobile_number.includes(q)) ||
      (f.aadhaar_number && f.aadhaar_number.includes(q))
    );
  }, [allMasterFarmers, search]);

  // Robust Farmer Identification Metadata
  const currentFarmerIdentifiers = useMemo(() => {
    if (!currentFarmer) return { names: [], normalizedNames: [], phones: [], aadhaars: [], ids: [] };
    const names = [currentFarmer.name_en.toLowerCase().trim()];
    if (currentFarmer.name_pa) names.push(currentFarmer.name_pa.trim());
    const phones = [cleanPhone(currentFarmer.mobile_number)].filter(Boolean);
    const aadhaars = [currentFarmer.aadhaar_number ? currentFarmer.aadhaar_number.replace(/\D/g, '') : ''].filter(Boolean);
    const ids = [currentFarmer.id];

    (currentFarmer.linked_farmers || []).forEach((lf) => {
      if (lf.name_en) names.push(lf.name_en.toLowerCase().trim());
      if (lf.name_pa) names.push(lf.name_pa.trim());
      if (lf.aadhaar_number) aadhaars.push(lf.aadhaar_number.replace(/\D/g, ''));
      if (lf.id) ids.push(lf.id);
    });

    const normalizedNames = names.map((n) => normalizeCleanStr(n)).filter(Boolean);

    return { names, normalizedNames, phones, aadhaars, ids };
  }, [currentFarmer]);

  // Phonetic & clean normalization for robust Punjabi and English name matching
  const normalizeCleanName = (s?: string) => {
    if (!s) return '';
    return s
      .toLowerCase()
      .trim()
      .replace(/[\s\-_.,()]+/g, '')
      .replace(/ee/g, 'i')
      .replace(/oo/g, 'u')
      .replace(/w/g, 'v')
      .replace(/kh/g, 'k')
      .replace(/gh/g, 'g')
      .replace(/bh/g, 'b')
      .replace(/dh/g, 'd');
  };

  const getFarmerNameVariants = (f: FarmerMaster): string[] => {
    const list: string[] = [];
    if (f.name_en) list.push(f.name_en);
    if (f.name_pa) list.push(f.name_pa);
    if (f.linked_farmers && Array.isArray(f.linked_farmers)) {
      for (const lf of f.linked_farmers) {
        if (lf.name_en) list.push(lf.name_en);
        if (lf.name_pa) list.push(lf.name_pa);
      }
    }
    return list;
  };

  const doesNameMatchFarmer = (rawName: string | undefined, f: FarmerMaster): boolean => {
    if (!rawName) return false;
    const cleanRaw = normalizeCleanName(rawName);
    if (!cleanRaw) return false;

    const variants = getFarmerNameVariants(f);
    return variants.some((v) => {
      const cleanV = normalizeCleanName(v);
      if (!cleanV) return false;
      if (cleanRaw === cleanV) return true;
      if (cleanRaw.length >= 5 && cleanV.length >= 5) {
        if (cleanRaw.includes(cleanV) || cleanV.includes(cleanRaw)) return true;
      }
      return false;
    });
  };

  const doesNameMatchAnotherRegisteredFarmer = (rawName: string | undefined, currentFId: string): boolean => {
    if (!rawName) return false;
    const cleanRaw = normalizeCleanName(rawName);
    if (!cleanRaw) return false;

    return allMasterFarmers.some((other) => {
      if (other.id === currentFId) return false;
      return doesNameMatchFarmer(rawName, other);
    });
  };

  // 100% Strict, Collision-Free Matching for Crop Inward Arrivals
  const isArrivalForFarmer = (a: CropArrivalEntry, f: FarmerMaster): boolean => {
    const linkedIds = (f.linked_farmers || []).map((l) => l.id).filter(Boolean);
    const idMatches = Boolean(a.farmer_id && (a.farmer_id === f.id || linkedIds.includes(a.farmer_id)));

    const nameMatches = doesNameMatchFarmer(a.farmer_name, f) || doesNameMatchFarmer(a.farmer_name_pa, f);
    const nameMatchesOther = doesNameMatchAnotherRegisteredFarmer(a.farmer_name, f.id) || doesNameMatchAnotherRegisteredFarmer(a.farmer_name_pa, f.id);

    // If the arrival clearly specifies the name of ANOTHER registered farmer, never match this farmer!
    if (nameMatchesOther && !nameMatches) {
      return false;
    }

    if (nameMatches) {
      const aVillage = normalizeCleanName(a.village);
      const fVillage = normalizeCleanName(f.village_en);
      if (aVillage && fVillage && aVillage !== fVillage && !aVillage.includes(fVillage) && !fVillage.includes(aVillage)) {
        if (!idMatches) return false;
      }
      return true;
    }

    const hasName = Boolean(a.farmer_name?.trim() || a.farmer_name_pa?.trim());
    if (!hasName && idMatches) {
      return true;
    }

    return false;
  };

  // 100% Strict, Collision-Free Matching for Agency Purchases / J-Forms
  const isPurchaseForFarmer = (p: AgencyPurchaseEntry, f: FarmerMaster): boolean => {
    const linkedIds = (f.linked_farmers || []).map((l) => l.id).filter(Boolean);
    const idMatches = Boolean(p.farmer_id && (p.farmer_id === f.id || linkedIds.includes(p.farmer_id)));

    const nameMatches = doesNameMatchFarmer(p.farmer_name, f) || doesNameMatchFarmer(p.billed_to_name, f);
    const nameMatchesOther = doesNameMatchAnotherRegisteredFarmer(p.farmer_name, f.id) || doesNameMatchAnotherRegisteredFarmer(p.billed_to_name, f.id);

    // If the purchase clearly specifies the name of ANOTHER registered farmer, never match this farmer!
    if (nameMatchesOther && !nameMatches) {
      return false;
    }

    if (nameMatches) {
      const pVillage = normalizeCleanName(p.address_village || p.village);
      const fVillage = normalizeCleanName(f.village_en);
      if (pVillage && fVillage && pVillage !== fVillage && !pVillage.includes(fVillage) && !fVillage.includes(pVillage)) {
        if (!idMatches) return false;
      }
      return true;
    }

    const hasName = Boolean(p.farmer_name?.trim() || p.billed_to_name?.trim());
    if (!hasName && idMatches) {
      return true;
    }

    return false;
  };

  // 1. Farmer's Crop Arrivals (Strictly verified and sorted Date-Wise)
  const farmerArrivals = useMemo(() => {
    if (!currentFarmer) return [];
    return cropArrivals
      .filter((a) => isArrivalForFarmer(a, currentFarmer))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  }, [cropArrivals, currentFarmer, allMasterFarmers]);

  // 2. Farmer's Agency Purchases / J-Forms (Strictly verified and sorted Date-Wise)
  const farmerPurchases = useMemo(() => {
    if (!currentFarmer) return [];
    return agencyPurchases
      .filter((p) => isPurchaseForFarmer(p, currentFarmer))
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  }, [agencyPurchases, currentFarmer, allMasterFarmers]);

  // 1. Farmer Arrival bags, quintals & labor (ਮੰਡੀ ਆਵਕ - ਜੋ ਕਿਸਾਨ ਮੰਡੀ ਵਿੱਚ ਲੈ ਕੇ ਆਇਆ)
  const farmerArrivalBags = useMemo(() => {
    return farmerArrivals.reduce((s, a) => {
      const bags = Number(a.total_bags_arrived) || (Number(a.new_jute_bags || 0) + Number(a.old_jute_bags || 0));
      return s + bags;
    }, 0);
  }, [farmerArrivals]);

  const farmerArrivalQuintals = useMemo(() => {
    return farmerArrivals.reduce((s, a) => {
      const bags = Number(a.total_bags_arrived) || (Number(a.new_jute_bags || 0) + Number(a.old_jute_bags || 0));
      const packing = Number(a.bag_packing_kg) || 37.5;
      const loose = Number(a.loose_weight_kg) || 0;
      const weight = Number(a.weight_quintals) || (((bags * packing) + loose) / 100);
      return s + weight;
    }, 0);
  }, [farmerArrivals]);

  // 2. Farmer's Agency Purchases / J-Forms (ਸਰਕਾਰੀ ਖਰੀਦ)
  const farmerPurchasedBags = useMemo(() => {
    return farmerPurchases.reduce((s, p) => {
      const bags = Number(p.total_bags) || (Number(p.new_jute_bags || 0) + Number(p.old_jute_bags || 0));
      return s + bags;
    }, 0);
  }, [farmerPurchases]);

  const farmerPurchasedQuintals = useMemo(() => {
    return farmerPurchases.reduce((s, p) => {
      const bags = Number(p.total_bags) || (Number(p.new_jute_bags || 0) + Number(p.old_jute_bags || 0));
      const packing = Number(p.bag_packing_kg) || 37.5;
      const weight = Number(p.weight_quintals) || ((bags * packing) / 100);
      return s + weight;
    }, 0);
  }, [farmerPurchases]);

  const jFormPurchaseTotal = useMemo(() => {
    return farmerPurchases.reduce((s, p) => {
      const bags = Number(p.total_bags) || (Number(p.new_jute_bags || 0) + Number(p.old_jute_bags || 0));
      const packing = Number(p.bag_packing_kg) || 37.5;
      const weight = Number(p.weight_quintals) || ((bags * packing) / 100);
      const rate = Number(p.rate_per_quintal) || 2461;
      const amount = Number(p.total_amount) || (weight * rate);
      return s + amount;
    }, 0);
  }, [farmerPurchases]);

  // Total Bags & Quintals that the farmer brought to the mandi (ਮੰਡੀ ਆਵਕ ਕੁੱਲ)
  const totalFarmerBags = useMemo(() => {
    if (farmerArrivalBags > 0) return farmerArrivalBags;
    if (farmerPurchasedBags > 0) return farmerPurchasedBags;
    if (farmerPurchasedQuintals > 0) return Math.round(farmerPurchasedQuintals / 0.375);
    return 0;
  }, [farmerArrivalBags, farmerPurchasedBags, farmerPurchasedQuintals]);

  const totalFarmerQuintals = useMemo(() => {
    if (farmerArrivalQuintals > 0) return farmerArrivalQuintals;
    if (farmerPurchasedQuintals > 0) return farmerPurchasedQuintals;
    if (totalFarmerBags > 0) return totalFarmerBags * 0.375;
    return 0;
  }, [farmerArrivalQuintals, farmerPurchasedQuintals, totalFarmerBags]);

  // 3. Farmer's Manual Cash / Advance Ledger Transactions (Sorted Date-Wise)
  const farmerCustomEntries = useMemo(() => {
    if (!currentFarmer) return [];
    const fNameEn = normalizeCleanStr(currentFarmer.name_en);
    const fNamePa = (currentFarmer.name_pa || '').trim();
    return ledgerEntries
      .filter((l) => {
        if (l.farmer_id && (l.farmer_id === currentFarmer.id || (currentFarmer.linked_farmers || []).some((lf) => lf.id === l.farmer_id))) return true;
        const lName = normalizeCleanStr(l.farmer_name);
        return lName && (lName === fNameEn || lName === fNamePa.toLowerCase());
      })
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  }, [ledgerEntries, currentFarmer]);

  // 4. Farmer's Bardana
  const farmerBardanaIssued = useMemo(() => {
    if (!currentFarmer) return 0;
    const fNameEn = normalizeCleanStr(currentFarmer.name_en);
    return bardanaEntries
      .filter((b) => b.transaction_type === 'Issued to Farmer' && (
        b.farmer_name && (
          normalizeCleanStr(b.farmer_name) === fNameEn ||
          (currentFarmer.linked_farmers || []).some((lf) => normalizeCleanStr(lf.name_en) === normalizeCleanStr(b.farmer_name))
        )
      ))
      .reduce((s, b) => s + (Number(b.quantity_bags) || 0), 0);
  }, [bardanaEntries, currentFarmer]);

  const farmerBardanaReturned = useMemo(() => {
    return farmerArrivals.reduce((s, a) => s + (Number(a.total_bags_arrived) || 0), 0);
  }, [farmerArrivals]);

  const farmerBardanaPending = Math.max(0, farmerBardanaIssued - farmerBardanaReturned);

  // Pre-recorded purchase values
  const defaultPurchaseAdvances = useMemo(() => {
    return farmerPurchases.reduce((s, p) => s + (Number(p.advance_paid) || 0), 0);
  }, [farmerPurchases]);

  const defaultPurchasePreviousKhata = useMemo(() => {
    return farmerPurchases.reduce((s, p) => Math.max(s, Number(p.previous_khata) || 0), 0);
  }, [farmerPurchases]);

  // Per-Farmer Settlement Adjustments State
  const [adjustments, setAdjustments] = useState<FarmerAdjustments>({
    palledariRate: 8,
    enableSukhiKiti: false,
    sukhiKitiRate: 5,
    enableDoublePakha: false,
    doublePakhaRate: 4,
    directAdvance: 0,
    directPreviousKhata: 0,
  });

  const farmerArrivalLaborTotal = useMemo(() => {
    return farmerArrivals.reduce((s, a) => {
      const bags = Number(a.total_bags_arrived) || (Number(a.new_jute_bags || 0) + Number(a.old_jute_bags || 0));
      return s + (Number(a.labor_total) || (bags * (adjustments.palledariRate || 8)));
    }, 0);
  }, [farmerArrivals, adjustments.palledariRate]);

  // Financial Calculations: ਕੁੱਲ ਫਸਲ ਰਕਮ (MSP @ ₹2461)
  // This is the total value of what the farmer brought to the mandi (ਜੋ ਕਿਸਾਨ ਮੰਡੀ ਵਿੱਚ ਲੈ ਕੇ ਆਇਆ ਉਹਦਾ ਟੋਟਲ)
  const grossCropValue = useMemo(() => {
    if (farmerArrivalQuintals > 0) {
      if (jFormPurchaseTotal > 0 && Math.abs(farmerArrivalQuintals - farmerPurchasedQuintals) < 0.1) {
        return jFormPurchaseTotal;
      }
      return Math.round(farmerArrivalQuintals * 2461 * 100) / 100;
    }
    if (jFormPurchaseTotal > 0) {
      return jFormPurchaseTotal;
    }
    if (totalFarmerQuintals > 0) {
      return Math.round(totalFarmerQuintals * 2461 * 100) / 100;
    }
    return 0;
  }, [farmerArrivalQuintals, farmerPurchasedQuintals, jFormPurchaseTotal, totalFarmerQuintals]);

  // Load saved adjustments when active farmer changes
  useEffect(() => {
    if (!currentFarmer) return;
    const defaultAdvanceToFill = jFormPurchaseTotal > 0 ? jFormPurchaseTotal : (grossCropValue > 0 ? grossCropValue : defaultPurchaseAdvances);
    try {
      const savedStr = localStorage.getItem(`kisanmitra_adjustments_${currentFarmer.id}`);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        // Automatically ensure J-Form amount is filled if directAdvance is not set or 0
        if ((saved.directAdvance === undefined || saved.directAdvance === null || saved.directAdvance === 0) && defaultAdvanceToFill > 0) {
          saved.directAdvance = defaultAdvanceToFill;
        }
        setAdjustments(saved);
        return;
      }
    } catch (e) {
      console.warn(e);
    }

    // Default initialization: Automatically fill ਸਰਕਾਰੀ ਖਰੀਦ / J-Form total amount!
    const recordedArrivalSukhi = farmerArrivals.reduce((s, a) => s + (Number(a.sukhi_kiti_total) || 0), 0);
    const recordedArrivalPakha = farmerArrivals.reduce((s, a) => s + (Number(a.double_pakha_total) || 0), 0);

    setAdjustments({
      palledariRate: 8,
      enableSukhiKiti: recordedArrivalSukhi > 0,
      sukhiKitiRate: 5,
      customSukhiKitiAmount: recordedArrivalSukhi > 0 ? recordedArrivalSukhi : undefined,
      enableDoublePakha: recordedArrivalPakha > 0,
      doublePakhaRate: 4,
      customDoublePakhaAmount: recordedArrivalPakha > 0 ? recordedArrivalPakha : undefined,
      directAdvance: defaultAdvanceToFill,
      directPreviousKhata: defaultPurchasePreviousKhata,
    });
  }, [currentFarmer?.id, grossCropValue, jFormPurchaseTotal, defaultPurchaseAdvances, defaultPurchasePreviousKhata]);

  // Auto-save adjustments to localStorage
  const updateAdjustment = (patch: Partial<FarmerAdjustments>) => {
    if (!currentFarmer) return;
    setAdjustments((prev) => {
      const updated = { ...prev, ...patch };
      try {
        localStorage.setItem(`kisanmitra_adjustments_${currentFarmer.id}`, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  // Effective J-Form Advance: Automatically filled with government purchase / J-Form total amount
  const effectiveJFormAdvance = useMemo(() => {
    if (adjustments.directAdvance !== undefined && adjustments.directAdvance !== null && adjustments.directAdvance > 0) {
      return Number(adjustments.directAdvance);
    }
    if (jFormPurchaseTotal > 0) return jFormPurchaseTotal;
    return defaultPurchaseAdvances > 0 ? defaultPurchaseAdvances : 0;
  }, [adjustments.directAdvance, jFormPurchaseTotal, defaultPurchaseAdvances]);

  const defaultJFormTotal = jFormPurchaseTotal;

  // 1. Palledari Labor: Auto bags × ₹8 (or rate), or custom
  const totalPalledariLabor = useMemo(() => {
    if (adjustments.customPalledariAmount !== undefined) {
      return Number(adjustments.customPalledariAmount) || 0;
    }
    // Check if arrivals or purchases had an explicit total
    const fromArrivals = farmerArrivals.reduce((s, a) => s + (Number(a.labor_total) || 0), 0);
    const fromPurchases = farmerPurchases.reduce((s, p) => s + (Number(p.j_form_labor_total) || 0), 0);
    if (fromArrivals > 0) return fromArrivals;
    if (fromPurchases > 0) return fromPurchases;
    // Standard Mandi Labor: total bags × rate (default ₹8)
    return totalFarmerBags * (Number(adjustments.palledariRate) || 8);
  }, [adjustments.customPalledariAmount, adjustments.palledariRate, farmerArrivals, farmerPurchases, totalFarmerBags]);

  // 2. Sukhi Kiti: If enabled, bags × ₹5 or custom
  const totalSukhiKiti = useMemo(() => {
    if (!adjustments.enableSukhiKiti) return 0;
    if (adjustments.customSukhiKitiAmount !== undefined) {
      return Number(adjustments.customSukhiKitiAmount) || 0;
    }
    const fromArrivals = farmerArrivals.reduce((s, a) => s + (Number(a.sukhi_kiti_total) || 0), 0);
    if (fromArrivals > 0) return fromArrivals;
    return totalFarmerBags * (Number(adjustments.sukhiKitiRate) || 5);
  }, [adjustments.enableSukhiKiti, adjustments.customSukhiKitiAmount, adjustments.sukhiKitiRate, farmerArrivals, totalFarmerBags]);

  // 3. Double Pakha: If enabled, bags × ₹4 or custom
  const totalDoublePakha = useMemo(() => {
    if (!adjustments.enableDoublePakha) return 0;
    if (adjustments.customDoublePakhaAmount !== undefined) {
      return Number(adjustments.customDoublePakhaAmount) || 0;
    }
    const fromArrivals = farmerArrivals.reduce((s, a) => s + (Number(a.double_pakha_total) || 0), 0);
    if (fromArrivals > 0) return fromArrivals;
    return totalFarmerBags * (Number(adjustments.doublePakhaRate) || 4);
  }, [adjustments.enableDoublePakha, adjustments.customDoublePakhaAmount, adjustments.doublePakhaRate, farmerArrivals, totalFarmerBags]);

  // Total Labor Deductions
  const totalLaborDeductions = totalPalledariLabor + totalSukhiKiti + totalDoublePakha;

  // Net Crop Value (ਕਿਸਾਨ ਦੀ ਕੁੱਲ ਨੈੱਟ ਫਸਲ ਰਕਮ)
  const netCropValue = Math.max(0, grossCropValue - totalLaborDeductions);

  // Custom Debits and Credits
  const customDebits = useMemo(() => {
    return farmerCustomEntries
      .filter((e) => e.entry_type === 'debit')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [farmerCustomEntries]);

  const customCredits = useMemo(() => {
    return farmerCustomEntries
      .filter((e) => e.entry_type === 'credit')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [farmerCustomEntries]);

  // Total Advance Paid: Direct Advance / J-Form Payment deduction + custom ledger debits
  const totalAdvancesPaid = effectiveJFormAdvance + customDebits;

  // Previous Khata
  const totalPreviousKhata = Number(adjustments.directPreviousKhata) || 0;

  // Total Debits from Farmer (J-Form Advance + custom debits + previous khata)
  const totalFarmerDebits = totalAdvancesPaid + totalPreviousKhata;

  // Total Credits to Farmer (Net crop value + any farmer deposits)
  const totalFarmerCredits = netCropValue + customCredits;

  // Final Settlement Balance
  // Positive = Arhtia must PAY the farmer
  // Negative = Farmer OWES money to Arhtia (e.g. mandi labor / old khata when government paid full J-Form DBT to farmer)
  const finalSettlementBalance = totalFarmerCredits - totalFarmerDebits;

  // Handle Add New Cash / Advance Entry
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFarmer) return;
    if (!newEntryAmount || Number(newEntryAmount) <= 0) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਰਕਮ ਭਰੋ।');
      return;
    }

    const entry: FarmerLedgerEntry = {
      id: `LEDGER-${Date.now()}`,
      farmer_id: currentFarmer.id,
      farmer_name: currentFarmer.name_en,
      date: newEntryDate,
      transaction_type: newEntryType,
      amount: Number(newEntryAmount),
      entry_type: newEntryDirection,
      notes: newEntryNotes.trim(),
      payment_mode: newEntryMode,
      created_at: new Date().toISOString(),
    };

    onAddLedgerEntry(entry);
    setIsAddEntryModalOpen(false);
    setNewEntryAmount('');
    setNewEntryNotes('');
  };

  // WhatsApp Share Message
  const handleShareWhatsApp = () => {
    if (!currentFarmer) return;
    const balanceText = finalSettlementBalance >= 0 
      ? `ਆੜ੍ਹਤੀਏ ਵੱਲੋਂ ਦੇਣਯੋਗ ਰਕਮ: ₹${finalSettlementBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ (Due from Farmer): ₹${Math.abs(finalSettlementBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const text = `🌾 *ਕਿਸਾਨ ਖਾਤਾ ਹਿਸਾਬ-ਕਿਤਾਬ (Kisan Hisab Statement)*
*ਫਰਮ:* JAMMU TRADING CO. & NEW JAMMU TRADING CO.
*ਮੰਡੀ:* ${currentMandi}
-----------------------------
*ਕਿਸਾਨ:* ${currentFarmer.name_en} (${currentFarmer.name_pa || ''})
*ਪਿਤਾ ਦਾ ਨਾਮ:* ${currentFarmer.father_husband_name_en}
*ਪਿੰਡ:* ${currentFarmer.village_en} (${currentFarmer.village_pa || ''})
*ਮੋਬਾਈਲ:* ${currentFarmer.mobile_number}
*ਬੈਂਕ ਖਾਤਾ:* ${currentFarmer.bank_account || 'N/A'} (${currentFarmer.ifsc_code || ''})
-----------------------------
*ਕੁੱਲ ਫਸਲ ਮੰਡੀ ਆਵਕ:* ${totalFarmerQuintals > 0 ? `${totalFarmerQuintals.toFixed(2)} ਕੁਇੰਟਲ` : ''} (${totalFarmerBags.toLocaleString()} ਗੱਟੇ)
*ਕੁੱਲ ਫਸਲ ਰਕਮ (MSP @ ₹2461 - ਜੋ ਕਿਸਾਨ ਮੰਡੀ ਲੈ ਕੇ ਆਇਆ):* ₹${grossCropValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
*ਘਟਾਓ ਪੱਲੇਦਾਰੀ ਲੇਬਰ (@ ₹${adjustments.palledariRate}):* -₹${totalPalledariLabor.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${totalSukhiKiti > 0 ? `*ਘਟਾਓ ਸੁੱਕੀ ਕੀਤੀ ਲੇਬਰ:* -₹${totalSukhiKiti.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}${totalDoublePakha > 0 ? `*ਘਟਾਓ ਡਬਲ ਪੱਖਾ ਖਰਚਾ:* -₹${totalDoublePakha.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}*ਕੁੱਲ ਲੇਬਰ ਕਟੌਤੀ:* -₹${totalLaborDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
*ਕਿਸਾਨ ਦੀ ਕੁੱਲ ਨੈੱਟ ਫਸਲ ਰਕਮ:* ₹${netCropValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
-----------------------------
*ਸੀਜ਼ਨ ਦੌਰਾਨ J-Form ਪੇਸ਼ਗੀ ਕਟੌਤੀ (ਸਰਕਾਰੀ ਖਰੀਦ):* -₹${effectiveJFormAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
*ਨੈੱਟ ਫਸਲ ਰਕਮ ਵਿੱਚੋਂ J-Form ਕਟੌਤੀ ਤੋਂ ਬਾਅਦ:* ₹${(netCropValue - effectiveJFormAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${totalPreviousKhata > 0 ? `*ਪੁਰਾਣਾ ਖਾਤਾ:* -₹${totalPreviousKhata.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}${customDebits > 0 ? `*ਹੋਰ ਨਕਦ ਪੇਸ਼ਗੀ:* -₹${customDebits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}${customCredits > 0 ? `*ਕਿਸਾਨ ਜਮ੍ਹਾਂ ਰਕਮ:* +₹${customCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` : ''}-----------------------------
*ਅੰਤਿਮ ਨੈੱਟ ਨਿਬੇੜਾ:*
👉 *${balanceText}*
-----------------------------
ਜੈ ਜਵਾਨ ਜੈ ਕਿਸਾਨ | Jammu Trading Co.`;

    const encoded = encodeURIComponent(text);
    const url = currentFarmer.mobile_number 
      ? `https://wa.me/91${currentFarmer.mobile_number.replace(/\D/g, '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const statementCardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'jpg' | 'pdf' | 'share' | null>(null);

  // 1. Download High-Resolution Clear Punjabi JPG Image
  const handleDownloadJPG = async () => {
    if (!statementCardRef.current || !currentFarmer) return;
    setIsExporting('jpg');
    try {
      const element = statementCardRef.current;
      const dataUrl = await toJpeg(element, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const cleanName = (currentFarmer.name_en || 'Farmer').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Kisan_Hisab_${cleanName}_${new Date().toISOString().slice(0, 10)}.jpg`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating JPG:', err);
      alert('JPG ਫੋਟੋ ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਿੰਟ ਰਾਹੀਂ ਸੇਵ ਕਰੋ।');
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Download High-Resolution Clear Punjabi A4 PDF File
  const handleDownloadPDF = async () => {
    if (!statementCardRef.current || !currentFarmer) return;
    setIsExporting('pdf');
    try {
      const element = statementCardRef.current;
      let imgData: string;
      try {
        imgData = await toJpeg(element, {
          quality: 0.98,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
      } catch (e) {
        imgData = await toPng(element, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // A4 dimensions: 210 x 297 mm
      const imgWidth = 210;
      const pageHeight = 297;
      const elementHeight = element.offsetHeight || 1;
      const elementWidth = element.offsetWidth || 1;
      const imgHeight = (elementHeight * imgWidth) / elementWidth;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
        // Fit single page if height is within reasonable bounds (up to 330mm)
        if (imgHeight <= 330) {
          const scaledWidth = (pageHeight * elementWidth) / elementHeight;
          const offsetX = (210 - scaledWidth) / 2;
          pdf.addImage(imgData, 'JPEG', offsetX, 0, scaledWidth, pageHeight);
        } else {
          // Multi-page A4
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
        }
      }

      const cleanName = (currentFarmer.name_en || 'Farmer').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Kisan_Hisab_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('PDF ਫਾਈਲ ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਪ੍ਰਿੰਟ ਵਿੰਡੋ ਵਿੱਚੋਂ "Save as PDF" ਚੁਣੋ।');
    } finally {
      setIsExporting(null);
    }
  };

  // 3. Smart WhatsApp Share with Image (Web Share API) or Text fallback
  const handleShareWhatsAppSmart = async () => {
    if (!currentFarmer) return;
    setIsExporting('share');
    try {
      if (statementCardRef.current && typeof navigator !== 'undefined' && 'canShare' in navigator) {
        try {
          const dataUrl = await toJpeg(statementCardRef.current, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
          });
          const blob = await (await fetch(dataUrl)).blob();
          const cleanName = (currentFarmer.name_en || 'Farmer').replace(/[^a-zA-Z0-9]/g, '_');
          const file = new File([blob], `Kisan_Hisab_${cleanName}.jpg`, { type: 'image/jpeg' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `ਕਿਸਾਨ ਖਾਤਾ ਹਿਸਾਬ - ${currentFarmer.name_en}`,
              text: `🌾 ਕਿਸਾਨ ਖਾਤਾ ਹਿਸਾਬ-ਕਿਤਾਬ (${currentFarmer.name_en}) - Jammu Trading Co.`,
              files: [file],
            });
            setIsExporting(null);
            return;
          }
        } catch (shareErr) {
          console.warn('Web Share API dismissed or failed:', shareErr);
        }
      }
      // Direct WhatsApp text fallback
      handleShareWhatsApp();
    } catch (e) {
      console.error(e);
      handleShareWhatsApp();
    } finally {
      setIsExporting(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Controls */}
      <div className="print:hidden bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-emerald-700/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-emerald-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <Users className="w-3.5 h-3.5" />
              <span>ਕਿਸਾਨ ਬਹੀ-ਖਾਤਾ (Farmer Account & Ledger)</span>
            </span>
            <span className="text-xs text-emerald-300 font-medium">
              ਸੀਜ਼ਨ ਦੇ ਅੰਤ ਵਿੱਚ ਪਾਈ-ਪਾਈ ਦਾ ਹਿਸਾਬ
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            ਕਿਸਾਨ ਪਾਸਬੁੱਕ ਤੇ ਫਸਲ ਨਿਬੇੜਾ ਸਟੇਟਮੈਂਟ (Settlement Statement)
          </h1>
          <p className="text-xs text-emerald-200 mt-0.5">
            ਆਵਕ, ਸਰਕਾਰੀ ਖਰੀਦ, J-Form, ਲੇਬਰ ਕਟੌਤੀਆਂ, ਬਾਰਦਾਨਾ ਅਤੇ ਨਕਦ ਪੇਸ਼ਗੀ ਦਾ ਸੰਪੂਰਨ ਲੇਖਾ-ਜੋਖਾ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddEntryModalOpen(true)}
            disabled={!currentFarmer}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-emerald-950 font-black rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ ਨਵੀਂ ਐਂਟਰੀ</span>
          </button>

          {/* Download JPG button */}
          <button
            type="button"
            onClick={handleDownloadJPG}
            disabled={!currentFarmer || isExporting !== null}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="ਸਾਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਹਿਸਾਬ ਪਰਚੀ ਦੀ JPG ਫੋਟੋ ਡਾਊਨਲੋਡ ਕਰੋ"
          >
            {isExporting === 'jpg' ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <ImageIcon className="w-4 h-4 text-amber-300" />}
            <span>📸 JPG ਫੋਟੋ</span>
          </button>

          {/* Download PDF button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={!currentFarmer || isExporting !== null}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="ਸਾਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਪੂਰਾ A4 PDF ਖਾਤਾ ਡਾਊਨਲੋਡ ਕਰੋ"
          >
            {isExporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <Download className="w-4 h-4 text-amber-300" />}
            <span>📄 PDF ਫਾਈਲ</span>
          </button>

          {/* Smart WhatsApp Share */}
          <button
            type="button"
            onClick={handleShareWhatsAppSmart}
            disabled={!currentFarmer || isExporting !== null}
            className="px-3.5 py-2 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="ਕਿਸਾਨ ਨੂੰ WhatsApp 'ਤੇ ਹਿਸਾਬ ਭੇਜੋ"
          >
            {isExporting === 'share' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Share2 className="w-4 h-4 text-amber-300" />}
            <span>💬 WhatsApp</span>
          </button>

          {/* Print Slip */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={!currentFarmer}
            className="px-3.5 py-2 bg-white hover:bg-gray-100 active:scale-95 text-gray-900 font-bold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="ਹਿਸਾਬ ਪਰਚੀ ਪ੍ਰਿੰਟ ਕਰੋ"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>🖨️ ਪ੍ਰਿੰਟ</span>
          </button>
        </div>
      </div>

      {/* Prominent Farmer Selection Bar with Dropdown */}
      <div className="print:hidden bg-white rounded-2xl border-2 border-emerald-700/60 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold shadow-xs shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <label htmlFor="top-farmer-select" className="text-xs font-black text-gray-900 uppercase tracking-wide block">
              ਕਿਸਾਨ ਖਾਤਾ ਚੁਣੋ (Select Farmer Account):
            </label>
            <span className="text-[11px] text-gray-500">
              ਇਸ ਡ੍ਰੌਪਡਾਊਨ ਜਾਂ ਖੱਬੇ ਪਾਸੇ ਸੂਚੀ ਵਿੱਚੋਂ ਕਿਸੇ ਵੀ ਕਿਸਾਨ ਨੂੰ ਚੁਣੋ — ਖਾਤਾ ਤੇ ਸਟੇਟਮੈਂਟ ਤੁਰੰਤ ਬਦਲ ਜਾਵੇਗੀ
            </span>
          </div>
        </div>

        <div className="w-full md:w-96">
          <select
            id="top-farmer-select"
            value={currentFarmer?.id || selectedFarmerId || ''}
            onChange={(e) => {
              handleFarmerChange(e.target.value);
            }}
            className="w-full px-3.5 py-2.5 bg-emerald-50 border-2 border-emerald-600 rounded-xl text-xs font-black text-gray-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-inner"
          >
            {allMasterFarmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name_en} {f.name_pa ? `(${f.name_pa})` : ''} — {f.village_en || f.village_pa || 'ਪਿੰਡ N/A'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Layout: Left Farmer Picker & Right Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Searchable Farmer Picker (Hidden in print) */}
        <div className="print:hidden lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">ਕਿਸਾਨ ਚੁਣੋ (Select Farmer)</span>
              <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {allMasterFarmers.length} ਕੁੱਲ
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ਨਾਮ, ਪਿੰਡ, ਮੋਬਾਈਲ..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* Farmer List */}
            <div className="max-h-[550px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-100">
              {filteredFarmers.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ।</div>
              ) : (
                filteredFarmers.map((f) => {
                  const isSelected = f.id === currentFarmer?.id || 
                    (currentFarmer && normalizeCleanStr(f.name_en) === normalizeCleanStr(currentFarmer.name_en));

                  const fPurchases = agencyPurchases.filter((p) => isPurchaseForFarmer(p, f));
                  const fArrivals = cropArrivals.filter((a) => isArrivalForFarmer(a, f));

                  const fGross = fPurchases.reduce((s, p) => {
                    const bags = Number(p.total_bags) || (Number(p.new_jute_bags || 0) + Number(p.old_jute_bags || 0));
                    const packing = Number(p.bag_packing_kg) || 37.5;
                    const weight = Number(p.weight_quintals) || ((bags * packing) / 100);
                    const rate = Number(p.rate_per_quintal) || 2461;
                    return s + (Number(p.total_amount) || (weight * rate));
                  }, 0);
                  const fArrivalBags = fArrivals.reduce((s, a) => s + (Number(a.total_bags_arrived) || (Number(a.new_jute_bags || 0) + Number(a.old_jute_bags || 0))), 0);

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFarmerChange(f.id)}
                      className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-emerald-900 text-white shadow-md ring-2 ring-amber-400' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">
                          {f.name_en} {f.name_pa && `(${f.name_pa})`}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 opacity-85">
                        <span className="truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{f.village_en || 'ਪਿੰਡ N/A'}</span>
                        </span>
                        <span className="font-mono font-bold shrink-0">
                          {fGross > 0 ? `₹${(fGross / 100000).toFixed(1)}L` : (fArrivalBags > 0 ? `${fArrivalBags} ਗੱਟੇ` : '—')}
                        </span>
                      </div>
                      {(fArrivals.length > 0 || fPurchases.length > 0) && (
                        <div className="flex items-center gap-1.5 mt-1 text-[9.5px] font-mono">
                          {fArrivals.length > 0 && (
                            <span className={`px-1.5 py-0.2 rounded ${isSelected ? 'bg-emerald-800 text-amber-200' : 'bg-amber-100 text-amber-900'}`}>
                              {fArrivals.length} ਆਵਕ ({fArrivalBags} ਬੋਰੇ)
                            </span>
                          )}
                          {fPurchases.length > 0 && (
                            <span className={`px-1.5 py-0.2 rounded ${isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-blue-100 text-blue-900'}`}>
                              {fPurchases.length} J-Form
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Farmer Statement (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {currentFarmer ? (
            <>
              {/* Quick Export Bar */}
              <div className="print:hidden bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-emerald-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                    📲
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <span>ਕਿਸਾਨ ਨੂੰ ਹਿਸਾਬ ਭੇਜੋ (Share Hisab with Farmer)</span>
                    </h3>
                    <p className="text-[11px] text-emerald-200">
                      ਸਾਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ JPG ਫੋਟੋ ਜਾਂ PDF ਡਾਊਨਲੋਡ ਕਰੋ ਅਤੇ WhatsApp ਰਾਹੀਂ ਭੇਜੋ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadJPG}
                    disabled={isExporting !== null}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="ਸਾਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਹਿਸਾਬ ਪਰਚੀ ਦੀ JPG ਫੋਟੋ ਡਾਊਨਲੋਡ ਕਰੋ"
                  >
                    {isExporting === 'jpg' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" /> : <ImageIcon className="w-3.5 h-3.5 text-amber-300" />}
                    <span>📸 JPG ਫੋਟੋ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isExporting !== null}
                    className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="ਸਾਫ਼ ਪੰਜਾਬੀ ਵਿੱਚ ਪੂਰਾ A4 PDF ਖਾਤਾ ਡਾਊਨਲੋਡ ਕਰੋ"
                  >
                    {isExporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" /> : <Download className="w-3.5 h-3.5 text-amber-300" />}
                    <span>📄 PDF ਫਾਈਲ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsAppSmart}
                    disabled={isExporting !== null}
                    className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="ਕਿਸਾਨ ਨੂੰ WhatsApp 'ਤੇ ਹਿਸਾਬ ਭੇਜੋ"
                  >
                    {isExporting === 'share' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5 text-amber-300" />}
                    <span>💬 WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                    title="ਪ੍ਰਿੰਟ ਕਰੋ"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>ਪ੍ਰਿੰਟ</span>
                  </button>
                </div>
              </div>

              {/* Printable & Exportable Statement Card Container */}
              <div 
                ref={statementCardRef} 
                id="farmer-statement-printable" 
                className="bg-white rounded-3xl border-2 border-emerald-900/30 p-5 sm:p-7 shadow-xs space-y-6"
              >
                {/* Official Dual-Firm Mandi Header - Visible in Screen, Print, JPG & PDF */}
                <div className="border-b-2 border-emerald-950/40 pb-4 text-center space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-600 flex-wrap gap-1">
                    <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ਲਾਈਸੰਸ: {ARHTIA_FIRMS[0]?.lic_number}
                    </span>
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider bg-amber-400 text-emerald-950 px-3 py-0.5 rounded-full shadow-2xs">
                      🌾 ਕਿਸਾਨ ਫਸਲ ਹਿਸਾਬ-ਕਿਤਾਬ ਪਾਸਬੁੱਕ ਸਟੇਟਮੈਂਟ (Settlement Statement)
                    </span>
                    <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ਲਾਈਸੰਸ: {ARHTIA_FIRMS[1]?.lic_number}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-gray-950 uppercase tracking-tight">
                    JAMMU TRADING CO. & NEW JAMMU TRADING CO.
                  </h1>
                  <p className="text-xs text-gray-700 font-medium">
                    ਕਮਿਸ਼ਨ ਏਜੰਟ (ਆੜ੍ਹਤੀਏ) • {currentMandi} (ਪੰਜਾਬ) • ਮੋਬਾਈਲ: {ARHTIA_FIRMS[0]?.mobile}, {ARHTIA_FIRMS[1]?.mobile}
                  </p>
                  <div className="mt-2 text-[11px] text-gray-600 flex justify-between border-t border-gray-200 pt-1.5 font-medium flex-wrap gap-2">
                    <span>ਤਾਰੀਖ: <b>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</b></span>
                    <span>ਸੀਜ਼ਨ: <b>ਪੈਡੀ ਸੀਜ਼ਨ 2026-2027</b></span>
                    <span>ਸਰਕਾਰੀ MSP ਰੇਟ: <b className="font-mono text-emerald-900 font-bold">₹2,461 / ਕੁਇੰਟਲ</b></span>
                  </div>
                </div>

              {/* Farmer Profile Identity Card */}
              <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-amber-300 font-black text-xl flex items-center justify-center shadow-md shrink-0">
                      {currentFarmer.name_en ? currentFarmer.name_en.slice(0, 2).toUpperCase() : 'KM'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-gray-950">
                          {currentFarmer.name_en} {currentFarmer.name_pa && `(${currentFarmer.name_pa})`}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">
                          ID: {currentFarmer.id}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-mono font-bold">
                          ਕੁੱਲ {totalFarmerBags.toLocaleString()} ਗੱਟੇ
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 font-medium">
                        ਸਪੁੱਤਰ/ਪਤੀ: <b>{currentFarmer.father_husband_name_en} {currentFarmer.father_husband_name_pa && `(${currentFarmer.father_husband_name_pa})`}</b> • ਪਿੰਡ: <b>{currentFarmer.village_en} {currentFarmer.village_pa && `(${currentFarmer.village_pa})`}</b>
                      </p>
                      {/* Live Record Counts Indicator */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] font-bold">
                        <span className="bg-amber-50 text-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                          <Wheat className="w-3.5 h-3.5 text-amber-600" />
                          <span>ਆਵਕ: {farmerArrivals.length} ਪਰਚੀਆਂ ({farmerArrivalBags} ਗੱਟੇ)</span>
                        </span>
                        <span className="bg-blue-50 text-blue-950 px-2.5 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-700" />
                          <span>ਸਰਕਾਰੀ ਖਰੀਦ: {farmerPurchases.length} J-Forms (₹{defaultJFormTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })})</span>
                        </span>
                        <span className="bg-emerald-50 text-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                          <span>ਨਕਦ ਐਂਟਰੀਆਂ: {farmerCustomEntries.length}</span>
                        </span>
                        <span className="bg-purple-50 text-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-200 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-purple-700" />
                          <span>ਬਾਰਦਾਨਾ: {farmerBardanaPending > 0 ? `${farmerBardanaPending} ਬਕਾਇਆ` : 'ਕਲੀਅਰ'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Aadhaar */}
                  <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs">
                    <div className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-xl font-mono text-gray-800 font-bold">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{currentFarmer.mobile_number || 'ਕੋਈ ਨੰਬਰ ਨਹੀਂ'}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-xl font-mono text-emerald-950 font-bold border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>ਆਧਾਰ: {currentFarmer.aadhaar_number ? currentFarmer.aadhaar_number.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3') : 'Not Provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Account & Linked Family Members Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-1 text-xs">
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">ਬੈਂਕ ਖਾਤਾ (Direct Bank DBT)</span>
                      <span className="font-mono font-black text-gray-900 text-sm">
                        {currentFarmer.bank_account || 'ਖਾਤਾ ਨੰਬਰ ਨਹੀਂ ਭਰਿਆ'}
                      </span>
                      <span className="text-[11px] text-gray-600 block">
                        IFSC: {currentFarmer.ifsc_code || 'N/A'} • {currentFarmer.bank_name || 'ਸਟੇਟ ਬੈਂਕ / ਕੋਆਪਰੇਟਿਵ'}
                      </span>
                    </div>
                    <CreditCard className="w-6 h-6 text-gray-400" />
                  </div>

                  <div className="bg-amber-50/70 rounded-2xl p-3 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-900 uppercase block">ਜੁੜੇ ਪਰਿਵਾਰਕ ਮੈਂਬਰ (Linked Family Members)</span>
                    {currentFarmer.linked_farmers && currentFarmer.linked_farmers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {currentFarmer.linked_farmers.map((lf) => (
                          <span key={lf.id} className="px-2 py-0.5 bg-white text-amber-950 rounded-lg border border-amber-300 font-medium text-[11px]">
                            {lf.name_en} ({lf.relation})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 mt-1 block">ਕੋਈ ਹੋਰ ਪਰਿਵਾਰਕ ਮੈਂਬਰ ਲਿੰਕ ਨਹੀਂ ਹੈ।</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Master Financial Settlement Ledger Card (ਹਿਸਾਬ ਦਾ ਨਿਬੇੜਾ) */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-emerald-800 p-5 sm:p-6 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-800" />
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-gray-950">
                        ਅੰਤਿਮ ਫਸਲ ਤੇ ਖਾਤਾ ਨਿਬੇੜਾ (Final Settlement Ledger)
                      </h3>
                      <span className="text-xs text-gray-500 font-medium">
                        ਕੁੱਲ ਫਸਲ: <b>{totalFarmerBags.toLocaleString()} ਗੱਟੇ</b>
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    ਲਾਈਵ ਕੈਲਕੁਲੇਟਰ
                  </span>
                </div>

                {/* 2-Columns Balance Calculation Sheet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 text-xs">
                  
                  {/* Left Column: Crop Value & Credits (ਜੋ ਕਿਸਾਨ ਦੇ ਬਣਦੇ ਹਨ) */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                    <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wider pb-1.5 border-b border-emerald-100 flex items-center justify-between">
                      <span>1. ਫਸਲ ਦੀ ਬਣਦੀ ਰਕਮ (Crop Credit)</span>
                      <span className="text-emerald-700 font-bold">ਜਮ੍ਹਾਂ ਰਕਮ (+)</span>
                    </h4>

                    {/* Gross Crop Value: ਜੋ ਕਿਸਾਨ ਮੰਡੀ ਵਿੱਚ ਲੈ ਕੇ ਆਇਆ */}
                    <div className="p-3.5 bg-emerald-50/80 rounded-2xl border-2 border-emerald-300 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-emerald-950 font-black text-xs block">
                            ਕੁੱਲ ਫਸਲ ਰਕਮ (MSP @ ₹2461):
                          </span>
                          <span className="text-[10.5px] text-emerald-800 font-bold block mt-0.5">
                            🌾 ਜੋ ਕਿਸਾਨ ਮੰਡੀ ਵਿੱਚ ਲੈ ਕੇ ਆਇਆ (ਮੰਡੀ ਆਵਕ ਕੁੱਲ)
                          </span>
                        </div>
                        <span className="font-mono font-black text-emerald-950 text-base sm:text-lg">
                          ₹{grossCropValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Weight and bags summary banner */}
                      <div className="flex items-center justify-between text-[11px] bg-white p-2.5 rounded-xl border border-emerald-200 text-gray-700 shadow-2xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-500">ਮੰਡੀ ਆਵਕ:</span>
                          <span className="font-mono font-black text-emerald-900">
                            {totalFarmerQuintals > 0 ? `${totalFarmerQuintals.toFixed(2)} ਕੁਇੰਟਲ` : '—'}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="font-mono font-black text-gray-900">
                            {totalFarmerBags.toLocaleString()} ਗੱਟੇ
                          </span>
                          {farmerArrivals.length > 0 && (
                            <span className="text-[9.5px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md font-bold">
                              {farmerArrivals.length} ਆਵਕ ਪਰਚੀਆਂ
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-emerald-800 text-[10.5px]">
                          @ ₹2,461 / ਕੁਇੰਟਲ
                        </span>
                      </div>
                    </div>

                    {/* Labor Deductions Box */}
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2.5">
                      <div className="flex items-center justify-between text-rose-950 font-bold text-[11px]">
                        <span>ਕਟੌਤੀ: ਲੇਬਰ ਤੇ ਮੰਡੀ ਖਰਚੇ ({totalFarmerBags} ਗੱਟੇ)</span>
                        <span>-₹{totalLaborDeductions.toLocaleString('en-IN')}</span>
                      </div>

                      {/* 1. Palledari */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700">ਪੱਲੇਦਾਰੀ ਲੇਬਰ (@ ₹{adjustments.palledariRate}/ਗੱਟਾ):</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-mono text-[10px] hidden sm:inline">
                            {totalFarmerBags} × ₹{adjustments.palledariRate} =
                          </span>
                          <span className="font-mono font-bold text-rose-700">
                            -₹{totalPalledariLabor.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* 2. Sukhi Kiti Toggle */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-100">
                        <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
                          <input
                            type="checkbox"
                            checked={adjustments.enableSukhiKiti}
                            onChange={(e) => updateAdjustment({ enableSukhiKiti: e.target.checked })}
                            className="w-3.5 h-3.5 text-rose-600 rounded cursor-pointer"
                          />
                          <span>ਸੁੱਕੀ ਕੀਤੀ ਲੇਬਰ (@ ₹{adjustments.sukhiKitiRate}):</span>
                        </label>
                        <span className={`font-mono font-bold ${adjustments.enableSukhiKiti ? 'text-rose-700' : 'text-gray-400'}`}>
                          -₹{totalSukhiKiti.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* 3. Double Pakha Toggle */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-100">
                        <label className="flex items-center gap-1.5 cursor-pointer text-gray-700">
                          <input
                            type="checkbox"
                            checked={adjustments.enableDoublePakha}
                            onChange={(e) => updateAdjustment({ enableDoublePakha: e.target.checked })}
                            className="w-3.5 h-3.5 text-rose-600 rounded cursor-pointer"
                          />
                          <span>ਡਬਲ ਪੱਖਾ ਖਰਚਾ (@ ₹{adjustments.doublePakhaRate}):</span>
                        </label>
                        <span className={`font-mono font-bold ${adjustments.enableDoublePakha ? 'text-rose-700' : 'text-gray-400'}`}>
                          -₹{totalDoublePakha.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Net Crop Value */}
                    <div className="pt-2 border-t-2 border-emerald-300 flex items-center justify-between font-bold text-gray-900 bg-emerald-50/70 p-2.5 rounded-xl">
                      <div>
                        <span className="text-emerald-950 block">ਕਿਸਾਨ ਦੀ ਕੁੱਲ ਨੈੱਟ ਫਸਲ ਰਕਮ:</span>
                        <span className="text-[10px] text-gray-500 font-normal">ਫਸਲ ਰਕਮ ਵਿੱਚੋਂ ਲੇਬਰ ਕੱਟ ਕੇ</span>
                      </div>
                      <span className="font-mono text-emerald-900 text-base font-black">
                        ₹{netCropValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {customCredits > 0 && (
                      <div className="flex items-center justify-between text-emerald-700 text-[11px] pt-1">
                        <span>ਕਿਸਾਨ ਦੁਆਰਾ ਜਮ੍ਹਾਂ ਕਰਵਾਈ ਨਕਦੀ:</span>
                        <span className="font-mono font-bold">+₹{customCredits.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Advances, Khata & Debits (ਜੋ ਕਿਸਾਨ ਵੱਲ ਨਿਕਲਦੇ ਹਨ) */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                    <div className="pb-1.5 border-b border-rose-100 flex items-center justify-between">
                      <h4 className="font-bold text-xs text-rose-900 uppercase tracking-wider">
                        2. ਪੇਸ਼ਗੀ ਤੇ ਪੁਰਾਣਾ ਖਾਤਾ (Farmer Debits)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddEntryModalOpen(true)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ ਨਵੀਂ ਐਂਟਰੀ</span>
                      </button>
                    </div>

                    {/* Interactive Input: Previous Season Khata */}
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-gray-700 font-bold text-[11px]">
                          ਪਿਛਲੇ ਸੀਜ਼ਨ ਦਾ ਪੁਰਾਣਾ ਖਾਤਾ:
                        </label>
                        <span className="text-[10px] text-gray-400">ਰਕਮ ਸੋਧੋ / ਬਦਲੋ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={adjustments.directPreviousKhata === 0 ? '' : adjustments.directPreviousKhata}
                          onChange={(e) => updateAdjustment({ directPreviousKhata: Number(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-rose-600"
                        />
                      </div>
                    </div>

                    {/* Interactive Input: Season Advance Paid (Auto-fills with J-Form gross crop value) */}
                    <div className="p-3 bg-amber-50/80 rounded-2xl border-2 border-amber-300 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="text-amber-950 font-black text-xs flex items-center gap-1.5">
                          <span>ਸੀਜ਼ਨ ਦੌਰਾਨ J-Form ਪੇਸ਼ਗੀ ਕਟੌਤੀ:</span>
                        </label>
                        {defaultJFormTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => updateAdjustment({ directAdvance: defaultJFormTotal })}
                            className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 active:scale-95 text-amber-950 rounded-md text-[10px] font-black cursor-pointer transition shadow-2xs"
                            title="ਸਰਕਾਰੀ ਖਰੀਦ / J-Form ਕੁੱਲ ਰਕਮ ਨਾਲ ਮੁੜ ਭਰੋ"
                          >
                            ਆਟੋ J-Form ਕੁੱਲ (₹{defaultJFormTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-amber-900 font-black text-sm">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={adjustments.directAdvance !== undefined && adjustments.directAdvance !== null && adjustments.directAdvance !== 0 ? adjustments.directAdvance : (effectiveJFormAdvance > 0 ? effectiveJFormAdvance : '')}
                          onChange={(e) => updateAdjustment({ directAdvance: Number(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full p-2 bg-white border border-amber-400 rounded-xl text-sm font-mono font-black text-gray-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                        />
                      </div>

                      {/* Explicit deduction indicator */}
                      <div className="text-[10px] text-amber-950 bg-amber-100/80 p-2.5 rounded-xl leading-relaxed border border-amber-200 space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span>ਸਰਕਾਰੀ ਖਰੀਦ / J-Form ਕੁੱਲ:</span>
                          <span className="font-mono text-emerald-900 font-black">
                            ₹{defaultJFormTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-rose-800 font-bold pt-1 border-t border-amber-200">
                          <span>ਕਿਸਾਨ ਦੀ ਕੁੱਲ ਨੈੱਟ ਫਸਲ ਰਕਮ ਵਿੱਚੋਂ ਲੇਸ:</span>
                          <span className="font-mono font-black">
                            -₹{effectiveJFormAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-gray-600 italic pt-0.5">
                          ਨੋਟ: ਸਰਕਾਰ ਵੱਲੋਂ J-Form ਦੀ ਪੂਰੀ ਰਕਮ ਕਿਸਾਨ ਦੇ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚ ਸਿੱਧੀ ਭੇਜੀ ਜਾਂਦੀ ਹੈ, ਇਸ ਲਈ ਇਹ ਫਸਲ ਰਕਮ ਵਿੱਚੋਂ ਕੱਟੀ ਜਾਂਦੀ ਹੈ।
                        </p>
                      </div>

                      {customDebits > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-amber-950 font-bold pt-1 border-t border-amber-200">
                          <span>+ ਵੱਖਰੀਆਂ ਨਕਦ ਐਂਟਰੀਆਂ:</span>
                          <span className="font-mono text-rose-700">₹{customDebits.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>

                    {/* Total Advances & Debits Summary */}
                    <div className="pt-2 border-t border-gray-200 space-y-1 text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>ਕੁੱਲ ਪੇਸ਼ਗੀ / J-Form ਕਟੌਤੀ:</span>
                        <span className="font-mono font-bold text-rose-700">
                          -₹{totalAdvancesPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 font-bold">
                        <span>ਕੁੱਲ ਕਟੌਤੀਆਂ ਦਾ ਜੋੜ (Total Debits):</span>
                        <span className="font-mono text-rose-800 text-sm font-black">
                          -₹{totalFarmerDebits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Big Final Settlement Banner */}
                <div className={`mt-6 p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  finalSettlementBalance >= 0 
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950' 
                    : 'bg-rose-50 border-rose-400 text-rose-950'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                      finalSettlementBalance >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}>
                      {finalSettlementBalance >= 0 ? <CheckCircle2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">
                        {finalSettlementBalance >= 0 
                          ? '✅ ਆੜ੍ਹਤੀਏ ਵੱਲੋਂ ਕਿਸਾਨ ਨੂੰ ਅੰਤਿਮ ਦੇਣਯੋਗ ਰਕਮ (Net Payable to Farmer)' 
                          : '⚠️ ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ ਨਿਕਲਦਾ ਹੈ (Net Due from Farmer)'}
                      </span>
                      <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                        {finalSettlementBalance >= 0 
                          ? `ਕੁੱਲ ਨੈੱਟ ਫਸਲ ਰਕਮ ₹${netCropValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ਵਿੱਚੋਂ J-Form ਪੇਸ਼ਗੀ ਕਟੌਤੀ (-₹${effectiveJFormAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) ਅਤੇ ਪੁਰਾਣਾ ਖਾਤਾ (-₹${totalPreviousKhata.toLocaleString('en-IN')}) ਕੱਟ ਕੇ ਇਹ ਅੰਤਿਮ ਦੇਣਯੋਗ ਰਕਮ ਬਣਦੀ ਹੈ।`
                          : `ਸਰਕਾਰੀ J-Form ਦੀ ਕੁੱਲ ਰਕਮ ₹${effectiveJFormAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ਸਿੱਧੀ ਕਿਸਾਨ ਦੇ ਖਾਤੇ ਵਿੱਚ ਜਾਣ ਕਾਰਨ, ਮੰਡੀ ਲੇਬਰ (-₹${totalLaborDeductions.toLocaleString('en-IN')}) ਅਤੇ ਪੁਰਾਣਾ ਖਾਤਾ ਕੱਟ ਕੇ ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ ਨਿਕਲਦਾ ਹੈ।`}
                      </p>
                    </div>
                  </div>

                  <div className="text-center sm:text-right shrink-0">
                    <div className="text-2xl sm:text-3xl font-black font-mono">
                      ₹{Math.abs(finalSettlementBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] font-bold block uppercase tracking-wide opacity-80">
                      {finalSettlementBalance >= 0 ? 'ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ (Payable)' : 'ਕਿਸਾਨ ਵੱਲ ਬਾਕੀ (Balance Due)'}
                    </span>
                  </div>
                </div>

                {/* 100% Complete Itemized Farmer Records Section (ਸੰਪੂਰਨ ਰਿਕਾਰਡ ਤੇ ਆਡਿਟ ਵੇਰਵਾ) */}
                <div className="mt-8 pt-6 border-t-2 border-emerald-950/20 space-y-6">
                  
                  {/* Section Title Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-800" />
                        <span>ਸੰਪੂਰਨ ਕਿਸਾਨ ਰਿਕਾਰਡ ਤੇ ਆਡਿਟ ਵੇਰਵਾ (Complete Itemized Records & Audit Trail)</span>
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        ਕਿਸਾਨ ਦੀਆਂ ਸਾਰੀਆਂ ਮੰਡੀ ਆਵਕ ਪਰਚੀਆਂ, ਸਰਕਾਰੀ J-Forms, ਲੇਬਰ ਕਟੌਤੀਆਂ ਅਤੇ ਨਕਦ ਲੈਣ-ਦੇਣ ਦਾ ਪੂਰਾ ਵੇਰਵਾ (JPG / PDF / ਪ੍ਰਿੰਟ ਵਿੱਚ ਸ਼ਾਮਲ)
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg">
                        {farmerArrivals.length} ਆਵਕ ਪਰਚੀਆਂ
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-lg">
                        {farmerPurchases.length} ਸਰਕਾਰੀ ਖਰੀਦਾਂ (J-Forms)
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg">
                        {farmerCustomEntries.length} ਨਕਦ ਐਂਟਰੀਆਂ
                      </span>
                    </div>
                  </div>

                  {/* 1. Crop Inward Arrivals Table (ਮੰਡੀ ਆਵਕ ਪਰਚੀਆਂ) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <Wheat className="w-4 h-4 text-amber-600" />
                        <span>1. ਮੰਡੀ ਆਵਕ ਪਰਚੀਆਂ ਦਾ ਵੇਰਵਾ (Crop Inward Arrivals - {farmerArrivals.length})</span>
                      </h4>
                      <span className="text-[10.5px] font-bold text-gray-600 font-mono">
                        ਕੁੱਲ: {farmerArrivalBags.toLocaleString()} ਗੱਟੇ | {farmerArrivalQuintals.toFixed(2)} ਕੁਇੰਟਲ
                      </span>
                    </div>

                    {farmerArrivals.length === 0 ? (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
                        ਇਸ ਕਿਸਾਨ ਦੀ ਅਜੇ ਕੋਈ ਮੰਡੀ ਆਵਕ ਪਰਚੀ ਦਰਜ ਨਹੀਂ ਹੈ।
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                            <tr>
                              <th className="py-2 px-2.5">#</th>
                              <th className="py-2 px-2.5">ਤਾਰੀਖ</th>
                              <th className="py-2 px-2.5">ਪਰਚੀ ਨੰ.</th>
                              <th className="py-2 px-2.5">ਟਰਾਲੀ / ਵਾਹਨ</th>
                              <th className="py-2 px-2.5">ਕਿਸਮ</th>
                              <th className="py-2 px-2.5 text-center">ਗੱਟੇ</th>
                              <th className="py-2 px-2.5 text-right">ਵਜ਼ਨ (Qtl)</th>
                              <th className="py-2 px-2.5 text-center">ਨਮੀ %</th>
                              <th className="py-2 px-2.5 text-right">ਪੱਲੇਦਾਰੀ ਲੇਬਰ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {farmerArrivals.map((a, idx) => {
                              const bags = Number(a.total_bags_arrived) || (Number(a.new_jute_bags || 0) + Number(a.old_jute_bags || 0));
                              const packing = Number(a.bag_packing_kg) || 37.5;
                              const loose = Number(a.loose_weight_kg) || 0;
                              const weight = Number(a.weight_quintals) || (((bags * packing) + loose) / 100);
                              const labor = Number(a.labor_total) || (bags * (adjustments.palledariRate || 8));
                              return (
                                <tr key={a.id || idx} className="hover:bg-amber-50/30">
                                  <td className="py-1.5 px-2.5 text-gray-400 font-mono text-[10px]">{idx + 1}</td>
                                  <td className="py-1.5 px-2.5 font-mono">{formatDmy(a.date)}</td>
                                  <td className="py-1.5 px-2.5 font-mono font-bold text-amber-900">{a.parchi_no || a.gate_pass_no || '—'}</td>
                                  <td className="py-1.5 px-2.5 font-medium text-gray-800">{a.vehicle_trolley_no || 'ਟਰਾਲੀ'}</td>
                                  <td className="py-1.5 px-2.5 text-gray-700">{a.crop_variety || a.crop_type || 'ਝੋਨਾ'}</td>
                                  <td className="py-1.5 px-2.5 font-mono font-bold text-center">{bags}</td>
                                  <td className="py-1.5 px-2.5 font-mono text-right">{weight.toFixed(2)}</td>
                                  <td className="py-1.5 px-2.5 font-mono text-center">{a.moisture_percentage ? `${a.moisture_percentage}%` : '—'}</td>
                                  <td className="py-1.5 px-2.5 font-mono font-bold text-rose-700 text-right">₹{labor.toLocaleString('en-IN')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-amber-100/60 font-bold border-t-2 border-amber-300 text-amber-950">
                            <tr>
                              <td colSpan={5} className="py-2 px-2.5 text-left font-black">ਕੁੱਲ ਜੋੜ (Total Inward Arrivals):</td>
                              <td className="py-2 px-2.5 font-mono font-black text-center">{farmerArrivalBags.toLocaleString()} ਗੱਟੇ</td>
                              <td className="py-2 px-2.5 font-mono font-black text-right">{farmerArrivalQuintals.toFixed(2)} Qtl</td>
                              <td className="py-2 px-2.5 text-center">—</td>
                              <td className="py-2 px-2.5 font-mono font-black text-rose-800 text-right">
                                ₹{farmerArrivalLaborTotal.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 2. Agency Purchases & J-Forms Table (ਸਰਕਾਰੀ ਖਰੀਦ / J-Form) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <Building2 className="w-4 h-4 text-blue-700" />
                        <span>2. ਸਰਕਾਰੀ ਖਰੀਦ ਤੇ J-Form ਦਾ ਵੇਰਵਾ (Agency Purchases / J-Forms - {farmerPurchases.length})</span>
                      </h4>
                      <span className="text-[10.5px] font-bold text-gray-600 font-mono">
                        ਕੁੱਲ: {farmerPurchasedBags.toLocaleString()} ਗੱਟੇ | ₹{jFormPurchaseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {farmerPurchases.length === 0 ? (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
                        ਇਸ ਕਿਸਾਨ ਦੀ ਅਜੇ ਕੋਈ ਸਰਕਾਰੀ ਖਰੀਦ ਜਾਂ J-Form ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ।
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-blue-50/80 text-blue-950 font-bold border-b border-blue-200">
                            <tr>
                              <th className="py-2 px-2.5">#</th>
                              <th className="py-2 px-2.5">ਤਾਰੀਖ</th>
                              <th className="py-2 px-2.5">ਏਜੰਸੀ</th>
                              <th className="py-2 px-2.5">ਆੜ੍ਹਤੀਆ ਫਰਮ</th>
                              <th className="py-2 px-2.5">ਬਿਲ ਨਾਮ (Billed To)</th>
                              <th className="py-2 px-2.5 text-center">ਗੱਟੇ</th>
                              <th className="py-2 px-2.5 text-right">ਵਜ਼ਨ (Qtl)</th>
                              <th className="py-2 px-2.5 text-right">ਸਰਕਾਰੀ ਰੇਟ</th>
                              <th className="py-2 px-2.5 text-right font-black">J-Form ਕੁੱਲ ਰਕਮ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {farmerPurchases.map((p, idx) => {
                              const bags = Number(p.total_bags) || (Number(p.new_jute_bags || 0) + Number(p.old_jute_bags || 0));
                              const packing = Number(p.bag_packing_kg) || 37.5;
                              const weight = Number(p.weight_quintals) || ((bags * packing) / 100);
                              const rate = Number(p.rate_per_quintal) || 2461;
                              const amount = Number(p.total_amount) || (weight * rate);
                              return (
                                <tr key={p.id || idx} className="hover:bg-blue-50/30">
                                  <td className="py-1.5 px-2.5 text-gray-400 font-mono text-[10px]">{idx + 1}</td>
                                  <td className="py-1.5 px-2.5 font-mono">{formatDmy(p.date)}</td>
                                  <td className="py-1.5 px-2.5 font-bold text-blue-900">{p.purchasing_agency}</td>
                                  <td className="py-1.5 px-2.5 text-gray-700">{p.firm_name}</td>
                                  <td className="py-1.5 px-2.5 font-medium text-gray-900">
                                    {p.billed_to_name}
                                    {p.relation_with_main && (
                                      <span className="text-[10px] text-gray-500 ml-1">({p.relation_with_main})</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-mono font-bold text-center">{bags}</td>
                                  <td className="py-1.5 px-2.5 font-mono text-right">{weight.toFixed(2)}</td>
                                  <td className="py-1.5 px-2.5 font-mono text-right">₹{rate}</td>
                                  <td className="py-1.5 px-2.5 font-mono font-black text-emerald-900 text-right">
                                    ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-blue-100/60 font-bold border-t-2 border-blue-300 text-blue-950">
                            <tr>
                              <td colSpan={5} className="py-2 px-2.5 text-left font-black">ਕੁੱਲ ਜੋੜ (Total J-Forms / Agency Purchases):</td>
                              <td className="py-2 px-2.5 font-mono font-black text-center">{farmerPurchasedBags.toLocaleString()} ਗੱਟੇ</td>
                              <td className="py-2 px-2.5 font-mono font-black text-right">{farmerPurchasedQuintals.toFixed(2)} Qtl</td>
                              <td className="py-2 px-2.5 text-right">—</td>
                              <td className="py-2 px-2.5 font-mono font-black text-emerald-950 text-right">
                                ₹{jFormPurchaseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 3. Cash Advances & Ledger Entries Table (ਨਕਦ ਲੈਣ-ਦੇਣ ਤੇ ਪੇਸ਼ਗੀ) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <CreditCard className="w-4 h-4 text-emerald-700" />
                        <span>3. ਸੀਜ਼ਨ ਦੌਰਾਨ ਨਕਦ ਲੈਣ-ਦੇਣ ਤੇ ਪੇਸ਼ਗੀ ਖਾਤਾ (Cash Advances & Ledger Entries - {farmerCustomEntries.length})</span>
                      </h4>
                      <div className="flex items-center gap-2 text-[10.5px] font-bold font-mono">
                        <span className="text-rose-700">ਕੁੱਲ ਲਏ: -₹{customDebits.toLocaleString('en-IN')}</span>
                        {customCredits > 0 && (
                          <span className="text-emerald-700">| ਜਮ੍ਹਾਂ: +₹{customCredits.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>

                    {farmerCustomEntries.length === 0 ? (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
                        ਇਸ ਸੀਜ਼ਨ ਦੌਰਾਨ ਕੋਈ ਵੱਖਰੀ ਨਕਦ ਪੇਸ਼ਗੀ ਜਾਂ ਅਦਾਇਗੀ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਕੀਤੀ ਗਈ।
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-emerald-50/80 text-emerald-950 font-bold border-b border-emerald-200">
                            <tr>
                              <th className="py-2 px-2.5">#</th>
                              <th className="py-2 px-2.5">ਤਾਰੀਖ</th>
                              <th className="py-2 px-2.5">ਲੈਣ-ਦੇਣ ਦੀ ਕਿਸਮ</th>
                              <th className="py-2 px-2.5 text-right">ਕਿਸਾਨ ਨੇ ਲਏ (Debit -)</th>
                              <th className="py-2 px-2.5 text-right">ਕਿਸਾਨ ਨੇ ਦਿੱਤੇ (Credit +)</th>
                              <th className="py-2 px-2.5">ਭੁਗਤਾਨ ਮੋਡ</th>
                              <th className="py-2 px-2.5">ਵੇਰਵਾ / Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {farmerCustomEntries.map((e, idx) => (
                              <tr key={e.id || idx} className="hover:bg-emerald-50/30">
                                <td className="py-1.5 px-2.5 text-gray-400 font-mono text-[10px]">{idx + 1}</td>
                                <td className="py-1.5 px-2.5 font-mono">{formatDmy(e.date)}</td>
                                <td className="py-1.5 px-2.5 font-bold text-gray-900">{e.transaction_type}</td>
                                <td className="py-1.5 px-2.5 font-mono font-bold text-rose-700 text-right">
                                  {e.entry_type === 'debit' ? `₹${Number(e.amount).toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-700 text-right">
                                  {e.entry_type === 'credit' ? `₹${Number(e.amount).toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="py-1.5 px-2.5 text-gray-600 font-medium">{e.payment_mode || 'Cash'}</td>
                                <td className="py-1.5 px-2.5 text-gray-500 italic">{e.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-emerald-100/60 font-bold border-t-2 border-emerald-300 text-emerald-950">
                            <tr>
                              <td colSpan={3} className="py-2 px-2.5 text-left font-black">ਕੁੱਲ ਨਕਦ ਜੋੜ:</td>
                              <td className="py-2 px-2.5 font-mono font-black text-rose-800 text-right">
                                -₹{customDebits.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-2.5 font-mono font-black text-emerald-800 text-right">
                                {customCredits > 0 ? `+₹${customCredits.toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td colSpan={2} className="py-2 px-2.5 text-gray-500">—</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 4. Bardana Summary Strip */}
                  <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-gray-800 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-orange-600" />
                        <span>4. ਬਾਰਦਾਨਾ ਹਿਸਾਬ (Gunny Bags Record)</span>
                      </span>
                      <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-full ${
                        farmerBardanaPending > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {farmerBardanaPending > 0 ? `${farmerBardanaPending} ਗੱਟੇ ਬਕਾਇਆ` : 'ਬਾਰਦਾਨਾ ਕਲੀਅਰ ਹੈ'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="bg-white p-2 rounded-xl border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">ਦਿੱਤੇ ਗੱਟੇ:</span>
                        <span className="font-mono font-bold text-gray-900">{farmerBardanaIssued.toLocaleString()}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">ਵਾਪਸ ਆਏ ਗੱਟੇ:</span>
                        <span className="font-mono font-bold text-emerald-700">{farmerBardanaReturned.toLocaleString()}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-200">
                        <span className="text-gray-500 block text-[10px]">ਬਕਾਇਆ ਗੱਟੇ:</span>
                        <span className={`font-mono font-bold ${farmerBardanaPending > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {farmerBardanaPending.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Signatures Block (Visible in Screen, Print, JPG, and PDF) */}
                <div className="grid grid-cols-2 gap-8 mt-10 pt-8 border-t-2 border-gray-300 text-xs text-center font-bold">
                  <div>
                    <div className="h-14 border-b-2 border-gray-400 mb-2"></div>
                    <span className="text-gray-950 font-black">ਦਸਤਖ਼ਤ / ਅੰਗੂਠਾ ਕਿਸਾਨ (Farmer Signature)</span>
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">ਮੈਂ ਇਹ ਪੂਰਾ ਹਿਸਾਬ-ਕਿਤਾਬ ਤੇ ਸਾਰੀਆਂ ਪਰਚੀਆਂ ਪੜ੍ਹ ਕੇ ਸਹੀ ਤਸਦੀਕ ਕੀਤਾ ਹੈ।</p>
                  </div>
                  <div>
                    <div className="h-14 border-b-2 border-gray-400 mb-2"></div>
                    <span className="text-gray-950 font-black">ਦਸਤਖ਼ਤ ਆੜ੍ਹਤੀਆ (JAMMU TRADING CO. & NEW JAMMU TRADING CO.)</span>
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">ਕਮਿਸ਼ਨ ਏਜੰਟ (ਆੜ੍ਹਤੀਆ ਫਰਮ ਮੋਹਰ ਸਹਿਤ)</p>
                  </div>
                </div>

              </div>

            </div>

              {/* Detailed Breakdown Tabs */}
              <div className="print:hidden bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab('purchases')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'purchases' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      <span>ਸਰਕਾਰੀ ਖਰੀਦ / J-Form ({farmerPurchases.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('arrivals')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'arrivals' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Wheat className="w-3.5 h-3.5 text-amber-600" />
                      <span>ਮੰਡੀ ਆਵਕ ਪਰਚੀਆਂ ({farmerArrivals.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('advances')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'advances' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      <span>ਪੇਸ਼ਗੀ ਤੇ ਨਕਦ ਲੈਣ-ਦੇਣ ({farmerCustomEntries.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('bardana')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'bardana' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 text-orange-600" />
                      <span>ਬਾਰਦਾਨਾ ਹਿਸਾਬ</span>
                    </button>

                  </div>

                  {activeTab === 'advances' && (
                    <button
                      type="button"
                      onClick={() => setIsAddEntryModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                      <span>+ ਐਂਟਰੀ ਪਾਓ</span>
                    </button>
                  )}
                </div>

                {/* Tab 1: Agency Purchases / J-Form */}
                {activeTab === 'purchases' && (
                  farmerPurchases.length === 0 ? (
                    <div className="py-10 text-center text-xs text-gray-500">
                      ਇਸ ਕਿਸਾਨ ਦੀ ਅਜੇ ਕੋਈ ਸਰਕਾਰੀ ਖਰੀਦ ਜਾਂ J-Form ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ।
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-y border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">ਤਾਰੀਖ</th>
                            <th className="py-2.5 px-3">ਏਜੰਸੀ</th>
                            <th className="py-2.5 px-3">ਫਰਮ</th>
                            <th className="py-2.5 px-3">ਨਾਮ (Billed To)</th>
                            <th className="py-2.5 px-3">ਗੱਟੇ</th>
                            <th className="py-2.5 px-3">ਵਜ਼ਨ (Qtl)</th>
                            <th className="py-2.5 px-3">ਰੇਟ</th>
                            <th className="py-2.5 px-3">ਕੁੱਲ ਰਕਮ</th>
                            <th className="py-2.5 px-3 text-right">ਕੁੱਲ ਵੈਲਿਊ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {farmerPurchases.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-mono font-medium">{formatDmy(p.date)}</td>
                              <td className="py-2.5 px-3 font-bold text-blue-900">{p.purchasing_agency}</td>
                              <td className="py-2.5 px-3 text-gray-700">{p.firm_name}</td>
                              <td className="py-2.5 px-3 font-medium">
                                {p.billed_to_name}
                                {p.relation_with_main && <span className="text-[10px] text-gray-400 block">({p.relation_with_main})</span>}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">{p.total_bags}</td>
                              <td className="py-2.5 px-3 font-mono">{p.weight_quintals}</td>
                              <td className="py-2.5 px-3 font-mono">₹{p.rate_per_quintal}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-900">₹{p.total_amount.toLocaleString()}</td>
                              <td className="py-2.5 px-3 font-mono font-black text-emerald-800 text-right">
                                ₹{p.total_amount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* Tab 2: Crop Inward / Arrivals */}
                {activeTab === 'arrivals' && (
                  farmerArrivals.length === 0 ? (
                    <div className="py-10 text-center text-xs text-gray-500">
                      ਇਸ ਕਿਸਾਨ ਦੀ ਕੋਈ ਆਵਕ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-y border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">ਤਾਰੀਖ</th>
                            <th className="py-2.5 px-3">ਪਰਚੀ ਨੰਬਰ</th>
                            <th className="py-2.5 px-3">ਟਰਾਲੀ / ਵਾਹਨ</th>
                            <th className="py-2.5 px-3">ਕਿਸਮ</th>
                            <th className="py-2.5 px-3">ਗੱਟੇ</th>
                            <th className="py-2.5 px-3">ਕੁੱਲ ਵਜ਼ਨ (Qtl)</th>
                            <th className="py-2.5 px-3">ਨਮੀ (%)</th>
                            <th className="py-2.5 px-3 text-right">ਪੱਲੇਦਾਰੀ ਲੇਬਰ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {farmerArrivals.map((a) => (
                            <tr key={a.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-mono font-medium">{formatDmy(a.date)}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-800">{a.parchi_no || a.gate_pass_no}</td>
                              <td className="py-2.5 px-3 font-medium">{a.vehicle_trolley_no || 'ਟਰਾਲੀ'}</td>
                              <td className="py-2.5 px-3 text-gray-700">{a.crop_variety || a.crop_type}</td>
                              <td className="py-2.5 px-3 font-mono font-bold">{a.total_bags_arrived}</td>
                              <td className="py-2.5 px-3 font-mono">{a.weight_quintals} Qtl</td>
                              <td className="py-2.5 px-3 font-mono">{a.moisture_percentage ? `${a.moisture_percentage}%` : '—'}</td>
                              <td className="py-2.5 px-3 font-mono text-right font-bold text-gray-700">
                                ₹{(a.labor_total || a.total_bags_arrived * 8).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* Tab 3: Advances & Manual Cash Entries */}
                {activeTab === 'advances' && (
                  farmerCustomEntries.length === 0 ? (
                    <div className="py-10 text-center text-xs text-gray-500 space-y-2">
                      <p>ਕੋਈ ਵੱਖਰੀ ਨਕਦ ਪੇਸ਼ਗੀ ਜਾਂ ਅਦਾਇਗੀ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।</p>
                      <button
                        type="button"
                        onClick={() => setIsAddEntryModalOpen(true)}
                        className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                        <span>ਨਵੀਂ ਪੇਸ਼ਗੀ / ਡੀਜ਼ਲ ਖਰਚਾ ਦਰਜ ਕਰੋ</span>
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-y border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">ਤਾਰੀਖ</th>
                            <th className="py-2.5 px-3">ਲੈਣ-ਦੇਣ ਦੀ ਕਿਸਮ</th>
                            <th className="py-2.5 px-3">ਕਿਸਾਨ ਨੇ ਲਏ (Debit -)</th>
                            <th className="py-2.5 px-3">ਕਿਸਾਨ ਨੇ ਦਿੱਤੇ (Credit +)</th>
                            <th className="py-2.5 px-3">ਭੁਗਤਾਨ ਮੋਡ</th>
                            <th className="py-2.5 px-3">ਵੇਰਵਾ / Remarks</th>
                            <th className="py-2.5 px-3 text-right">ਐਕਸ਼ਨ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {farmerCustomEntries.map((e) => (
                            <tr key={e.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-mono font-medium">{formatDmy(e.date)}</td>
                              <td className="py-2.5 px-3 font-bold text-gray-900">{e.transaction_type}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                                {e.entry_type === 'debit' ? `₹${e.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                {e.entry_type === 'credit' ? `₹${e.amount.toLocaleString()}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-gray-600">{e.payment_mode || 'Cash'}</td>
                              <td className="py-2.5 px-3 text-gray-500 italic">{e.notes || '—'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('ਕੀ ਇਹ ਐਂਟਰੀ ਹਟਾਉਣੀ ਹੈ?')) {
                                      onDeleteLedgerEntry(e.id);
                                    }
                                  }}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {/* Tab 4: Bardana Status */}
                {activeTab === 'bardana' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                        <span className="text-gray-500 block text-[11px]">ਕਿਸਾਨ ਨੂੰ ਦਿੱਤੇ ਗੱਟੇ (Issued)</span>
                        <div className="text-xl font-black font-mono text-orange-950 mt-1">
                          {farmerBardanaIssued.toLocaleString()} ਗੱਟੇ
                        </div>
                        <span className="text-[10px] text-gray-500 block mt-0.5">ਘਰ ਭਰਨ ਲਈ ਜਾਰੀ</span>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <span className="text-gray-500 block text-[11px]">ਫਸਲ ਭਰ ਕੇ ਵਾਪਸ ਆਏ (Returned)</span>
                        <div className="text-xl font-black font-mono text-emerald-950 mt-1">
                          {farmerBardanaReturned.toLocaleString()} ਗੱਟੇ
                        </div>
                        <span className="text-[10px] text-emerald-700 block mt-0.5">ਮੰਡੀ ਵਿੱਚ ਆਵਕ</span>
                      </div>

                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                        <span className="text-gray-500 block text-[11px]">ਕਿਸਾਨ ਕੋਲ ਬਕਾਇਆ (Balance Due)</span>
                        <div className={`text-xl font-black font-mono mt-1 ${farmerBardanaPending > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {farmerBardanaPending.toLocaleString()} ਗੱਟੇ
                        </div>
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          {farmerBardanaPending > 0 ? 'ਗੱਟੇ ਵਾਪਸ ਲੈਣੇ ਬਾਕੀ ਹਨ' : 'ਬਾਰਦਾਨਾ ਬਿਲਕੁਲ ਪੂਰਾ ਹੈ'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center text-gray-500 text-sm">
              ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਕੋਈ ਕਿਸਾਨ ਚੁਣੋ ਜਾਂ ਨਵਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ।
            </div>
          )}

        </div>

      </div>

      {/* Modal: Add New Cash / Advance / Payment Entry */}
      {isAddEntryModalOpen && currentFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <h3 className="font-black text-base text-gray-950">
                  ਨਵੀਂ ਪੇਸ਼ਗੀ / ਨਕਦੀ ਐਂਟਰੀ (Add Ledger Entry)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ਕਿਸਾਨ: <b>{currentFarmer.name_en} ({currentFarmer.village_en})</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEntryModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-4 text-xs">
              
              {/* Debit vs Credit Choice */}
              <div>
                <label className="block font-bold text-gray-700 mb-1.5">ਲੈਣ-ਦੇਣ ਦਾ ਰੁਖ਼ (Transaction Type)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewEntryDirection('debit');
                      setNewEntryType('Advance (ਪੇਸ਼ਗੀ)');
                    }}
                    className={`p-2.5 rounded-xl font-bold border transition text-center cursor-pointer ${
                      newEntryDirection === 'debit'
                        ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <span>ਕਿਸਾਨ ਨੇ ਲਏ (Debit -)</span>
                    <span className="block text-[10px] font-normal opacity-75">ਪੇਸ਼ਗੀ, ਤੇਲ, ਖਾਦ, ਖਰਚਾ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewEntryDirection('credit');
                      setNewEntryType('Payment Received (ਅਦਾਇਗੀ ਮਿਲੀ)');
                    }}
                    className={`p-2.5 rounded-xl font-bold border transition text-center cursor-pointer ${
                      newEntryDirection === 'credit'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <span>ਕਿਸਾਨ ਨੇ ਦਿੱਤੇ (Credit +)</span>
                    <span className="block text-[10px] font-normal opacity-75">ਨਕਦ ਜਮ੍ਹਾਂ, ਬੈਂਕ ਅਦਾਇਗੀ</span>
                  </button>
                </div>
              </div>

              {/* Transaction Category */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">ਮੱਦ (Category)</label>
                <select
                  value={newEntryType}
                  onChange={(e) => setNewEntryType(e.target.value as any)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="Advance (ਪੇਸ਼ਗੀ)">Advance (ਨਕਦ ਪੇਸ਼ਗੀ)</option>
                  <option value="Diesel / Fertilizer (ਤੇਲ/ਖਾਦ)">Diesel / Fertilizer (ਤੇਲ ਜਾਂ ਖਾਦ ਲਈ)</option>
                  <option value="Old Khata (ਪੁਰਾਣਾ ਬਕਾਇਆ)">Old Khata (ਪੁਰਾਣਾ ਬਕਾਇਆ ਖਾਤਾ)</option>
                  <option value="Payment Received (ਅਦਾਇਗੀ ਮਿਲੀ)">Payment Received (ਕਿਸਾਨ ਵੱਲੋਂ ਜਮ੍ਹਾਂ)</option>
                  <option value="Other (ਹੋਰ)">Other (ਹੋਰ ਖਰਚਾ)</option>
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ਰਕਮ (Amount ₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newEntryAmount}
                    onChange={(e) => setNewEntryAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 10000"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">ਤਾਰੀਖ (Date)</label>
                  <input
                    type="date"
                    required
                    value={newEntryDate}
                    onChange={(e) => setNewEntryDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">ਭੁਗਤਾਨ ਮੋਡ (Payment Mode)</label>
                <select
                  value={newEntryMode}
                  onChange={(e) => setNewEntryMode(e.target.value as any)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="Cash (ਨਕਦ)">Cash (ਨਕਦ ਰਕਮ)</option>
                  <option value="Bank Transfer (ਬੈਂਕ ਟਰਾਂਸਫਰ)">Bank Transfer (RTGS/NEFT)</option>
                  <option value="UPI">UPI / Google Pay</option>
                  <option value="Cheque">Cheque (ਚੈੱਕ)</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">ਵੇਰਵਾ / ਕਾਰਨ (Remarks / Note)</label>
                <input
                  type="text"
                  value={newEntryNotes}
                  onChange={(e) => setNewEntryNotes(e.target.value)}
                  placeholder="e.g. ਟਰੈਕਟਰ ਤੇਲ ਲਈ ਦਿੱਤੇ ਜਾਂ ਖਾਦ ਦੇ ਪੈਸੇ"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEntryModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-bold cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition"
                >
                  ਖਾਤੇ ਵਿੱਚ ਦਰਜ ਕਰੋ (Save Entry)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
