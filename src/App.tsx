/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { FarmerDirectory } from './components/FarmerDirectory';
import { FarmerRegisterModal } from './components/FarmerRegisterModal';
import { CropArrivalModule } from './components/CropArrivalModule';
import { BardanaModule } from './components/BardanaModule';
import { AgencyPurchaseModule } from './components/AgencyPurchaseModule';
import { LiftingDispatchModule } from './components/LiftingDispatchModule';
import { LetterPadModule } from './components/LetterPadModule';
import { VoiceTextInputStudio } from './components/VoiceTextInputStudio';
import { TransactionEditor } from './components/TransactionEditor';
import { JFormModal } from './components/JFormModal';
import { JsonViewerModal } from './components/JsonViewerModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { UnauthorizedDomainModal } from './components/UnauthorizedDomainModal';
import { 
  FarmerMaster, 
  CropArrivalEntry, 
  BardanaEntry, 
  AgencyPurchaseEntry, 
  LiftingDispatchEntry,
  MandiTransaction, 
  GoogleSheetConfig,
  ShellerMaster,
  DEFAULT_SHELLERS,
  ARHTIA_FIRMS,
  MANDI_LOCATIONS
} from './types/mandi';
import { initAuth, googleSignIn, googleSignInRedirect, logout } from './lib/auth';
import { 
  appendFarmerToSheets, 
  appendCropArrivalToSheets, 
  appendBardanaToSheets, 
  appendAgencyPurchaseToSheets, 
  appendLiftingDispatchToSheets,
  appendMandiTransaction 
} from './lib/sheets';
import { 
  testConnection, 
  saveMasterSheetConfigToCloud, 
  saveFarmerToCloud, 
  deleteFarmerFromCloud, 
  saveCropArrivalToCloud, 
  saveBardanaToCloud, 
  saveAgencyPurchaseToCloud, 
  saveLiftingDispatchToCloud, 
  syncLocalDataToCloud, 
  subscribeToUserCloudData 
} from './lib/firestore';
import { harvestVillagesFromRecords, registerVillage } from './lib/villages';
import { harvestTrucksFromLifting, saveTruck } from './lib/trucks';
import { 
  Users, 
  Wheat, 
  Package, 
  Building2, 
  Truck, 
  Sparkles,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  CloudUpload,
  RefreshCw,
  Smartphone,
  Laptop,
  Trash2
} from 'lucide-react';

// Demo Initial Data
const INITIAL_DEMO_FARMERS: FarmerMaster[] = [
  {
    id: 'FR-1001',
    name_en: 'Malkit Singh',
    name_pa: 'ਮਲਕੀਤ ਸਿੰਘ',
    father_husband_name_en: 'Harnek Singh',
    father_husband_name_pa: 'ਹਰਨੇਕ ਸਿੰਘ',
    village_en: 'Bhadaur',
    village_pa: 'ਭਦੌੜ',
    mobile_number: '9876543210',
    aadhaar_number: '543212349876',
    bank_account: '602384910283',
    ifsc_code: 'SBIN0001245',
    bank_name: 'State Bank of India',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    linked_farmers: [
      {
        id: 'LF-101',
        name_en: 'Jaspreet Kaur',
        name_pa: 'ਜਸਪ੍ਰੀਤ ਕੌਰ',
        father_husband_name_en: 'Malkit Singh',
        father_husband_name_pa: 'ਮਲਕੀਤ ਸਿੰਘ',
        village_en: 'Bhadaur',
        village_pa: 'ਭਦੌੜ',
        relation: 'Wife (ਪਤਨੀ)',
        mobile_number: '9876500001',
        aadhaar_number: '543212349877',
      },
      {
        id: 'LF-102',
        name_en: 'Harpreet Singh',
        name_pa: 'ਹਰਪ੍ਰੀਤ ਸਿੰਘ',
        father_husband_name_en: 'Malkit Singh',
        father_husband_name_pa: 'ਮਲਕੀਤ ਸਿੰਘ',
        village_en: 'Bhadaur',
        village_pa: 'ਭਦੌੜ',
        relation: 'Son (ਪੁੱਤਰ)',
        mobile_number: '9876500002',
        aadhaar_number: '543212349878',
      },
    ],
  },
  {
    id: 'FR-1002',
    name_en: 'Baldev Singh',
    name_pa: 'ਬਲਦੇਵ ਸਿੰਘ',
    father_husband_name_en: 'Gurmel Singh',
    father_husband_name_pa: 'ਗੁਰਮੇਲ ਸਿੰਘ',
    village_en: 'Barnala',
    village_pa: 'ਬਰਨਾਲਾ',
    mobile_number: '9814012345',
    aadhaar_number: '765432109812',
    bank_account: '501004392100',
    ifsc_code: 'PUNB0123400',
    bank_name: 'Punjab National Bank',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    linked_farmers: [
      {
        id: 'LF-103',
        name_en: 'Gurmeet Singh',
        name_pa: 'ਗੁਰਮੀਤ ਸਿੰਘ',
        father_husband_name_en: 'Gurmel Singh',
        father_husband_name_pa: 'ਗੁਰਮੇਲ ਸਿੰਘ',
        village_en: 'Barnala',
        village_pa: 'ਬਰਨਾਲਾ',
        relation: 'Brother (ਭਰਾ)',
        mobile_number: '9814054321',
        aadhaar_number: '765432109813',
      },
    ],
  },
];

const INITIAL_DEMO_ARRIVALS: CropArrivalEntry[] = [
  {
    id: 'ARR-201',
    date: new Date().toISOString().split('T')[0],
    mandi_name: MANDI_LOCATIONS[0],
    farmer_id: 'FR-1001',
    farmer_name: 'Malkit Singh',
    farmer_name_pa: 'ਮਲਕੀਤ ਸਿੰਘ',
    village: 'Bhadaur',
    village_pa: 'ਭਦੌੜ',
    mobile: '9876543210',
    crop_type: 'Paddy Grade A',
    crop_variety: 'PR-126',
    vehicle_trolley_no: 'PB-19-TR-4021',
    bag_packing_kg: 37.5,
    total_bags_arrived: 400,
    weight_quintals: 150.0,
    moisture_percentage: 16.5,
    gate_pass_no: 'GP-2026-084',
    synced_to_sheets: false,
  },
  {
    id: 'ARR-202',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    mandi_name: MANDI_LOCATIONS[1],
    farmer_id: 'FR-1002',
    farmer_name: 'Baldev Singh',
    farmer_name_pa: 'ਬਲਦੇਵ ਸਿੰਘ',
    village: 'Barnala',
    village_pa: 'ਬਰਨਾਲਾ',
    mobile: '9814012345',
    crop_type: 'Hybrid',
    crop_variety: 'Hybrid',
    vehicle_trolley_no: 'PB-19-TR-1190',
    bag_packing_kg: 37.5,
    total_bags_arrived: 320,
    weight_quintals: 120.0,
    moisture_percentage: 15.0,
    gate_pass_no: 'GP-2026-071',
    synced_to_sheets: true,
  },
];

const INITIAL_DEMO_BARDANA: BardanaEntry[] = [
  {
    id: 'BAR-301',
    date: new Date().toISOString().split('T')[0],
    mandi_name: MANDI_LOCATIONS[0],
    transaction_type: 'Received from Agency',
    agency_name: 'Pungrain (ਪਨਗਰੇਨ)',
    bardana_type: 'Jute Gunny (ਸਣ ਦਾ ਬਾਰਦਾਨਾ)',
    new_jute_bags: 300,
    old_jute_bags: 300,
    quantity_bags: 600,
    balance_after_transaction: 600,
    remarks: 'Warehouse Delivery Challan #WH-402',
    synced_to_sheets: true,
  },
  {
    id: 'BAR-302',
    date: new Date().toISOString().split('T')[0],
    mandi_name: MANDI_LOCATIONS[0],
    transaction_type: 'Received from Seller/Sheller',
    seller_sheller_name: 'Guru Nanak Rice Mill (ਸ਼ੈਲਰ)',
    bardana_type: 'Jute Gunny (ਸਣ ਦਾ ਬਾਰਦਾਨਾ)',
    new_jute_bags: 200,
    old_jute_bags: 200,
    quantity_bags: 400,
    balance_after_transaction: 1000,
    remarks: 'Received from Sheller for Paddy packaging',
    synced_to_sheets: false,
  },
];

const INITIAL_DEMO_PURCHASES: AgencyPurchaseEntry[] = [
  {
    id: 'AUC-401',
    date: new Date().toISOString().split('T')[0],
    firm_id: ARHTIA_FIRMS[0].id,
    firm_name: ARHTIA_FIRMS[0].name,
    mandi_name: MANDI_LOCATIONS[0],
    farmer_id: 'FR-1001',
    farmer_name: 'Malkit Singh',
    father_husband_name: 'Harnek Singh',
    billed_to_name: 'Jaspreet Kaur',
    relation_with_main: 'Wife (ਪਤਨੀ)',
    address_village: 'Bhadaur',
    village: 'Bhadaur',
    mobile: '9876543210',
    crop_type: 'Paddy Grade A',
    crop_variety: 'PR-126',
    bag_packing_kg: 37.5,
    new_jute_bags: 200,
    old_jute_bags: 200,
    total_bags: 400,
    weight_quintals: 150.0,
    rate_per_quintal: 2461,
    total_amount: 369150,
    purchasing_agency: 'Pungrain (ਪਨਗਰੇਨ)',
    j_form_labor_rate: 8,
    j_form_labor_total: 3200,
    sukhi_kiti_rate: 5,
    sukhi_kiti_total: 2000,
    double_pakha_rate: 4,
    double_pakha_total: 1600,
    previous_khata: 0,
    advance_paid: 20000,
    net_payable: 342350,
    synced_to_sheets: false,
  },
  {
    id: 'AUC-402',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    firm_id: ARHTIA_FIRMS[1].id,
    firm_name: ARHTIA_FIRMS[1].name,
    mandi_name: MANDI_LOCATIONS[1],
    farmer_id: 'FR-1002',
    farmer_name: 'Baldev Singh',
    father_husband_name: 'Gurmel Singh',
    billed_to_name: 'Gurmeet Singh',
    relation_with_main: 'Brother (ਭਰਾ)',
    address_village: 'Barnala',
    village: 'Barnala',
    mobile: '9814012345',
    crop_type: 'Hybrid',
    crop_variety: 'Hybrid',
    bag_packing_kg: 37.5,
    new_jute_bags: 160,
    old_jute_bags: 160,
    total_bags: 320,
    weight_quintals: 120.0,
    rate_per_quintal: 2461,
    total_amount: 295320,
    purchasing_agency: 'Markfed (ਮਾਰਕਫੈੱਡ)',
    j_form_labor_rate: 8,
    j_form_labor_total: 2560,
    sukhi_kiti_rate: 5,
    sukhi_kiti_total: 1600,
    double_pakha_rate: 4,
    double_pakha_total: 1280,
    previous_khata: 15000,
    advance_paid: 10000,
    net_payable: 264880,
    synced_to_sheets: true,
  },
];

const INITIAL_DEMO_LIFTING: LiftingDispatchEntry[] = [
  {
    id: 'LFT-501',
    date_time: new Date().toISOString().slice(0, 16),
    firm_name: ARHTIA_FIRMS[0].name,
    mandi_name: MANDI_LOCATIONS[0],
    purchasing_agency: 'Pungrain (ਪਨਗਰੇਨ)',
    seller_sheller_name: 'Guru Nanak Rice Mill (ਸ਼ੈਲਰ)',
    crop_type: 'Paddy Grade A',
    truck_number: 'PB-19-M-2041',
    driver_mobile: '9814099887',
    destination_godown: 'Guru Nanak Rice Mill Plant',
    bags_lifted: 200,
    pending_yard_bags: 200,
    challan_no: 'CH-2026-9041',
    lifting_status: 'Partially Lifted',
    synced_to_sheets: false,
  },
  {
    id: 'LFT-502',
    date_time: new Date(Date.now() - 86400000).toISOString().slice(0, 16),
    firm_name: ARHTIA_FIRMS[1].name,
    mandi_name: MANDI_LOCATIONS[1],
    purchasing_agency: 'Markfed (ਮਾਰਕਫੈੱਡ)',
    seller_sheller_name: 'Punjab Agro Food Sheller',
    crop_type: 'Hybrid',
    truck_number: 'PB-19-M-4421',
    driver_mobile: '9876511223',
    destination_godown: 'Punjab Agro Sheller Yard',
    bags_lifted: 320,
    pending_yard_bags: 0,
    challan_no: 'CH-2026-8812',
    lifting_status: 'Fully Lifted',
    synced_to_sheets: true,
  },
];

export default function App() {
  // Active Module Navigation Tab
  const [activeModule, setActiveModule] = useState<
    'farmers' | 'arrivals' | 'bardana' | 'agency' | 'lifting' | 'letterpad' | 'ai_assistant'
  >('farmers');

  // Authentication
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Cloud Sync State
  const [cloudSyncActive, setCloudSyncActive] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [hasLocalDataToUpload, setHasLocalDataToUpload] = useState(false);

  // Mandi Yard
  const [currentMandi, setCurrentMandi] = useState('Khanna Grain Market (Asia’s Largest)');

  // Module 1: Farmers
  const [farmers, setFarmers] = useState<FarmerMaster[]>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_farmers_master');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_DEMO_FARMERS;
  });

  // Module 2: Crop Arrivals
  const [cropArrivals, setCropArrivals] = useState<CropArrivalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_crop_arrivals');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_DEMO_ARRIVALS;
  });

  // Module 3: Bardana
  const [bardanaEntries, setBardanaEntries] = useState<BardanaEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_bardana_entries');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_DEMO_BARDANA;
  });

  // Module 4: Agency Purchase
  const [agencyPurchases, setAgencyPurchases] = useState<AgencyPurchaseEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_agency_purchases');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_DEMO_PURCHASES;
  });

  // Module 5: Lifting & Dispatch
  const [liftingDispatches, setLiftingDispatches] = useState<LiftingDispatchEntry[]>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_lifting_dispatches');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_DEMO_LIFTING;
  });

  // Rice Shellers Master
  const [shellers, setShellers] = useState<ShellerMaster[]>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_shellers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return DEFAULT_SHELLERS;
  });

  // AI Voice Assistant State
  const [isParsing, setIsParsing] = useState(false);
  const [activeVoiceTransaction, setActiveVoiceTransaction] = useState<MandiTransaction | null>(null);

  // Google Sheet Configuration (Fixed Master Sheet)
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(() => {
    try {
      const saved = localStorage.getItem('kisanmitra_sheet_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return null;
  });

  // Modals
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isFarmerModalOpen, setIsFarmerModalOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<FarmerMaster | null>(null);
  const [selectedJFormEntry, setSelectedJFormEntry] = useState<any | null>(null);
  const [selectedJsonData, setSelectedJsonData] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, userToken) => {
        setUser(authUser);
        setToken(userToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Firestore Multi-Device Sync & Fixed Sheet listener
  useEffect(() => {
    if (!user) {
      setCloudSyncActive(false);
      return;
    }

    testConnection().catch(console.warn);

    // Subscribe to user cloud data (farmers, crop arrivals, master sheet config, etc.)
    const unsubscribe = subscribeToUserCloudData(user.uid, {
      onSheetConfig: (cloudSheet) => {
        if (cloudSheet && cloudSheet.spreadsheetId) {
          setSheetConfig(cloudSheet);
          localStorage.setItem('kisanmitra_sheet_config', JSON.stringify(cloudSheet));
        }
      },
      onFarmers: (cloudFarmers) => {
        if (cloudFarmers && cloudFarmers.length > 0) {
          setFarmers(cloudFarmers);
          setHasLocalDataToUpload(false);
        } else if (farmers.length > 0) {
          // Cloud has no farmers yet, local device has farmers -> flag for migration
          setHasLocalDataToUpload(true);
        }
      },
      onCropArrivals: (cloudArrivals) => {
        if (cloudArrivals && cloudArrivals.length > 0) {
          setCropArrivals(cloudArrivals);
        }
      },
      onBardana: (cloudBardana) => {
        if (cloudBardana && cloudBardana.length > 0) {
          setBardanaEntries(cloudBardana);
        }
      },
      onPurchases: (cloudPurchases) => {
        if (cloudPurchases && cloudPurchases.length > 0) {
          setAgencyPurchases(cloudPurchases);
        }
      },
      onLifting: (cloudLifting) => {
        if (cloudLifting && cloudLifting.length > 0) {
          setLiftingDispatches(cloudLifting);
        }
      },
    });

    setCloudSyncActive(true);

    // Auto-save local sheetConfig to cloud if cloud doesn't have it yet
    if (sheetConfig && sheetConfig.spreadsheetId) {
      saveMasterSheetConfigToCloud(user.uid, sheetConfig).catch(console.warn);
    }

    return () => {
      unsubscribe();
      setCloudSyncActive(false);
    };
  }, [user]);

  // Persist modules to localStorage as local cache
  useEffect(() => {
    localStorage.setItem('kisanmitra_farmers_master', JSON.stringify(farmers));
  }, [farmers]);

  useEffect(() => {
    localStorage.setItem('kisanmitra_crop_arrivals', JSON.stringify(cropArrivals));
  }, [cropArrivals]);

  useEffect(() => {
    localStorage.setItem('kisanmitra_bardana_entries', JSON.stringify(bardanaEntries));
  }, [bardanaEntries]);

  useEffect(() => {
    localStorage.setItem('kisanmitra_agency_purchases', JSON.stringify(agencyPurchases));
  }, [agencyPurchases]);

  useEffect(() => {
    localStorage.setItem('kisanmitra_lifting_dispatches', JSON.stringify(liftingDispatches));
  }, [liftingDispatches]);

  useEffect(() => {
    localStorage.setItem('kisanmitra_shellers', JSON.stringify(shellers));
  }, [shellers]);

  useEffect(() => {
    if (sheetConfig) {
      localStorage.setItem('kisanmitra_sheet_config', JSON.stringify(sheetConfig));
    }
  }, [sheetConfig]);

  // Harvest and keep Village Master up to date whenever farmers or arrivals change
  useEffect(() => {
    harvestVillagesFromRecords([
      ...farmers.map((f) => ({ village_en: f.village_en, village_pa: f.village_pa })),
      ...farmers.flatMap((f) => (f.linked_farmers || []).map((lf) => ({ village_en: lf.village_en, village_pa: lf.village_pa }))),
      ...cropArrivals.map((a) => ({ village: a.village, village_pa: a.village_pa })),
    ]);
  }, [farmers, cropArrivals]);

  // Harvest and keep Truck Master up to date whenever lifting dispatches change
  useEffect(() => {
    harvestTrucksFromLifting(liftingDispatches);
  }, [liftingDispatches]);

  const [isUnauthorizedDomainModalOpen, setIsUnauthorizedDomainModalOpen] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<{ code?: string; message?: string } | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setLastAuthError(null);
        showToast('success', `${result.user.displayName || result.user.email} ਨਾਲ ਸਾਈਨ-ਇਨ ਸਫਲ! ਕਲਾਊਡ ਸਿੰਕ ਐਕਟਿਵ ਹੋ ਗਿਆ।`);
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      const errInfo = {
        code: err?.code || 'AUTH_ERROR',
        message: err?.message || String(err),
      };
      setLastAuthError(errInfo);
      setIsUnauthorizedDomainModalOpen(true);
      showToast('error', `ਗੂਗਲ ਲੌਗਇਨ ਅਸਫਲ (${errInfo.code})। ਹੱਲ ਲਈ ਸਕ੍ਰੀਨ ਤੇ ਆਇਆ ਬਾਕਸ ਦੇਖੋ।`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginRedirect = async () => {
    setIsLoggingIn(true);
    try {
      await googleSignInRedirect();
    } catch (err: any) {
      console.error('Google Sign In redirect error:', err);
      const errInfo = {
        code: err?.code || 'REDIRECT_AUTH_ERROR',
        message: err?.message || String(err),
      };
      setLastAuthError(errInfo);
      setIsUnauthorizedDomainModalOpen(true);
      showToast('error', err?.message || 'Redirect Sign-In error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setCloudSyncActive(false);
      showToast('info', 'ਸਾਈਨ ਆਊਟ ਹੋ ਗਿਆ।');
    } catch (err) {
      console.error(err);
    }
  };

  // Upload local laptop data to Firestore so it immediately shows up on mobile
  const handleSyncLaptopData = async () => {
    if (!user) {
      showToast('error', 'ਪਹਿਲਾਂ ਗੂਗਲ ਅਕਾਊਂਟ ਨਾਲ ਸਾਈਨ-ਇਨ ਕਰੋ।');
      return;
    }
    setIsSyncingCloud(true);
    try {
      const res = await syncLocalDataToCloud(user.uid, {
        farmers,
        cropArrivals,
        bardanaEntries,
        agencyPurchases,
        liftingDispatches,
        sheetConfig,
      });
      if (res.success) {
        setHasLocalDataToUpload(false);
        showToast('success', `ਸਫਲਤਾਪੂਰਵਕ ${res.count} ਰਿਕਾਰਡ ਕਲਾਊਡ ਤੇ ਸਿੰਕ ਹੋ ਗਏ! ਹੁਣ ਇਹ ਮੋਬਾਈਲ 'ਤੇ ਵੀ ਲਾਈਵ ਦਿਖਣਗੇ।`);
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'ਕਲਾਊਡ ਸਿੰਕ ਵਿੱਚ ਗਲਤੀ: ' + (err.message || 'Error'));
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Handle Permanent Master Sheet Save
  const handleSaveSheetConfig = async (newConfig: GoogleSheetConfig) => {
    setSheetConfig(newConfig);
    localStorage.setItem('kisanmitra_sheet_config', JSON.stringify(newConfig));

    if (user) {
      try {
        await saveMasterSheetConfigToCloud(user.uid, newConfig);
        showToast('success', `ਮਾਸਟਰ ਗੂਗਲ ਸ਼ੀਟ ਪੱਕੀ ਫਿਕਸ ਹੋ ਗਈ: ${newConfig.spreadsheetTitle}! ਮੋਬਾਈਲ ਅਤੇ ਲੈਪਟਾਪ ਦੋਵਾਂ ਤੇ ਇਹੀ ਸ਼ੀਟ ਖੁੱਲ੍ਹੇਗੀ।`);
      } catch (err: any) {
        console.error(err);
        showToast('error', 'ਸ਼ੀਟ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ।');
      }
    } else {
      showToast('success', `ਸ਼ੀਟ ਲਿੰਕ ਹੋ ਗਈ: ${newConfig.spreadsheetTitle}`);
    }
  };

  // Farmer Handlers
  const handleSaveFarmer = async (farmer: FarmerMaster) => {
    const isExisting = farmers.some((f) => f.id === farmer.id);
    if (isExisting) {
      setFarmers((prev) => prev.map((f) => (f.id === farmer.id ? farmer : f)));
      showToast('success', `ਕਿਸਾਨ ਖਾਤਾ ਅੱਪਡੇਟ: ${farmer.name_en} (${farmer.name_pa})`);
    } else {
      setFarmers((prev) => [farmer, ...prev]);
      showToast('success', `ਨਵਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ: ${farmer.name_en} (${farmer.name_pa})`);
    }

    // Register village into master list
    registerVillage(farmer.village_en, farmer.village_pa);
    (farmer.linked_farmers || []).forEach((lf) => {
      if (lf.village_en || lf.village_pa) registerVillage(lf.village_en || '', lf.village_pa || '');
    });

    // Real-time Cloud Save
    if (user) {
      saveFarmerToCloud(user.uid, farmer).catch((e) => console.error('Cloud save farmer error:', e));
    }

    // Google Sheets Auto-Sync
    if (token && sheetConfig) {
      try {
        await appendFarmerToSheets(token, sheetConfig.spreadsheetId, farmer);
        showToast('info', `Farmer record synced to Google Sheets (Farmer_Register tab)`);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleDeleteFarmer = (id: string) => {
    if (confirm('ਕੀ ਤੁਸੀਂ ਵਾਕਈ ਇਹ ਕਿਸਾਨ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?')) {
      setFarmers((prev) => prev.filter((f) => f.id !== id));
      if (user) {
        deleteFarmerFromCloud(user.uid, id).catch((e) => console.error('Cloud delete farmer error:', e));
      }
      showToast('info', 'ਕਿਸਾਨ ਹਟਾਇਆ ਗਿਆ।');
    }
  };

  // Crop Arrival Handlers
  const handleAddArrival = async (entry: CropArrivalEntry) => {
    setCropArrivals((prev) => [entry, ...prev]);
    showToast('success', `ਨਵੀਂ ਆਵਕ ਦਰਜ: ${entry.farmer_name} (${entry.total_bags_arrived} ਗੱਟੇ)`);

    // Register village
    if (entry.village) registerVillage(entry.village, entry.village_pa);

    // Real-time Cloud Save
    if (user) {
      saveCropArrivalToCloud(user.uid, entry).catch((e) => console.error('Cloud save arrival error:', e));
    }

    // Google Sheets Auto-Sync
    if (token && sheetConfig) {
      try {
        await appendCropArrivalToSheets(token, sheetConfig.spreadsheetId, entry);
        entry.synced_to_sheets = true;
        setCropArrivals((prev) => [...prev]);
        if (user) saveCropArrivalToCloud(user.uid, entry).catch(console.warn);
        showToast('info', `Crop arrival synced to Google Sheets (Crop_Arrival_Inward tab)`);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleAddBatchArrivals = async (newBatch: CropArrivalEntry[]) => {
    setCropArrivals((prev) => [...newBatch, ...prev]);
    showToast('success', `${newBatch.length} ਨਵੀਆਂ ਫਸਲ ਆਵਕ ਐਂਟਰੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈਆਂ!`);

    // Register villages in batch
    newBatch.forEach((entry) => {
      if (entry.village) registerVillage(entry.village, entry.village_pa);
    });

    if (user) {
      newBatch.forEach((entry) => {
        saveCropArrivalToCloud(user.uid, entry).catch(console.error);
      });
    }

    if (token && sheetConfig) {
      try {
        for (const entry of newBatch) {
          await appendCropArrivalToSheets(token, sheetConfig.spreadsheetId, entry);
          entry.synced_to_sheets = true;
        }
        setCropArrivals((prev) => [...prev]);
        showToast('info', `${newBatch.length} ਐਂਟਰੀਆਂ Google Sheets ਵਿੱਚ ਸਿੰਕ ਹੋ ਗਈਆਂ`);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleUpdateArrival = (updated: CropArrivalEntry) => {
    setCropArrivals((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (updated.village) registerVillage(updated.village, updated.village_pa);
    if (user) {
      saveCropArrivalToCloud(user.uid, updated).catch((e) => console.error('Cloud update arrival error:', e));
    }
    showToast('success', `ਆਵਕ ਐਂਟਰੀ ${updated.parchi_no || updated.gate_pass_no} ਅੱਪਡੇਟ ਹੋਈ`);
  };

  // Bardana Handlers
  const handleAddBardana = async (entry: BardanaEntry) => {
    setBardanaEntries((prev) => [entry, ...prev]);
    showToast('success', `ਬਾਰਦਾਨਾ ਦਰਜ: ${entry.transaction_type} (${entry.quantity_bags} ਗੱਟੇ)`);

    if (user) {
      saveBardanaToCloud(user.uid, entry).catch((e) => console.error('Cloud save bardana error:', e));
    }

    if (token && sheetConfig) {
      try {
        await appendBardanaToSheets(token, sheetConfig.spreadsheetId, entry);
        entry.synced_to_sheets = true;
        setBardanaEntries((prev) => [...prev]);
        if (user) saveBardanaToCloud(user.uid, entry).catch(console.warn);
        showToast('info', `Bardana synced to Google Sheets (Bardana_Inventory tab)`);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleUpdateBardana = (updated: BardanaEntry) => {
    setBardanaEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (user) {
      saveBardanaToCloud(user.uid, updated).catch((e) => console.error('Cloud update bardana error:', e));
    }
    showToast('success', `ਬਾਰਦਾਨਾ ਐਂਟਰੀ ${updated.id} ਅੱਪਡੇਟ ਹੋਈ`);
  };

  const handleAddSheller = (sheller: ShellerMaster) => {
    setShellers((prev) => [...prev, sheller]);
    showToast('success', `ਨਵਾਂ ਸ਼ੈਲਰ ਰਜਿਸਟਰ ਹੋਇਆ: ${sheller.name}`);
  };

  // Agency Purchase Handlers
  const handleAddPurchase = async (entry: AgencyPurchaseEntry) => {
    setAgencyPurchases((prev) => [entry, ...prev]);
    showToast('success', `ਸਰਕਾਰੀ ਖਰੀਦ ਦਰਜ: ${entry.purchasing_agency} - ₹${entry.total_amount}`);

    if (user) {
      saveAgencyPurchaseToCloud(user.uid, entry).catch((e) => console.error('Cloud save purchase error:', e));
    }

    if (token && sheetConfig) {
      try {
        await appendAgencyPurchaseToSheets(token, sheetConfig.spreadsheetId, entry);
        entry.synced_to_sheets = true;
        setAgencyPurchases((prev) => [...prev]);
        if (user) saveAgencyPurchaseToCloud(user.uid, entry).catch(console.warn);
        showToast('info', `Agency purchase synced to Google Sheets (Agency_Purchase_Auction tab)`);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleAddBatchPurchases = async (entriesToAdd: AgencyPurchaseEntry[]) => {
    setAgencyPurchases((prev) => [...entriesToAdd, ...prev]);
    showToast('success', `${entriesToAdd.length} ਕਿਸਾਨਾਂ ਦੀ ਸਰਕਾਰੀ ਖਰੀਦ ਤੇ ਜੇ-ਫਾਰਮ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋਏ!`);

    if (user) {
      for (const entry of entriesToAdd) {
        saveAgencyPurchaseToCloud(user.uid, entry).catch((e) => console.error('Cloud save purchase error:', e));
      }
    }

    if (token && sheetConfig) {
      try {
        for (const entry of entriesToAdd) {
          await appendAgencyPurchaseToSheets(token, sheetConfig.spreadsheetId, entry);
          entry.synced_to_sheets = true;
        }
        setAgencyPurchases((prev) => [...prev]);
        showToast('info', `${entriesToAdd.length} Purchases synced to Google Sheets (Agency_Purchase_Auction tab)`);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleUpdatePurchase = (updated: AgencyPurchaseEntry) => {
    setAgencyPurchases((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (user) {
      saveAgencyPurchaseToCloud(user.uid, updated).catch((e) => console.error('Cloud update purchase error:', e));
    }
    showToast('success', `ਖਰੀਦ ਐਂਟਰੀ ${updated.id} ਅੱਪਡੇਟ ਹੋਈ`);
  };

  // Lifting Dispatch Handlers
  const handleAddLifting = async (entry: LiftingDispatchEntry) => {
    setLiftingDispatches((prev) => [entry, ...prev]);
    showToast('success', `ਲਿਫਟਿੰਗ ਚਲਾਨ ਦਰਜ: ਟਰੱਕ ${entry.truck_number} (${entry.bags_lifted} ਗੱਟੇ)`);

    // Save truck and driver to directory
    if (entry.truck_number) {
      saveTruck(entry.truck_number, entry.driver_name, entry.driver_mobile, entry.destination_godown || entry.seller_sheller_name);
    }

    if (user) {
      saveLiftingDispatchToCloud(user.uid, entry).catch((e) => console.error('Cloud save lifting error:', e));
    }

    if (token && sheetConfig) {
      try {
        await appendLiftingDispatchToSheets(token, sheetConfig.spreadsheetId, entry);
        entry.synced_to_sheets = true;
        setLiftingDispatches((prev) => [...prev]);
        if (user) saveLiftingDispatchToCloud(user.uid, entry).catch(console.warn);
        showToast('info', `Lifting dispatch synced to Google Sheets (Lifting_Dispatches tab)`);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleUpdateLifting = (updated: LiftingDispatchEntry) => {
    setLiftingDispatches((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (updated.truck_number) {
      saveTruck(updated.truck_number, updated.driver_name, updated.driver_mobile, updated.destination_godown || updated.seller_sheller_name);
    }
    if (user) {
      saveLiftingDispatchToCloud(user.uid, updated).catch((e) => console.error('Cloud update lifting error:', e));
    }
    showToast('success', `ਲਿਫਟਿੰਗ ਚਲਾਨ ${updated.challan_no} ਅੱਪਡੇਟ ਹੋਇਆ`);
  };

  // Software Demo Data Cleanup Management
  const DEMO_IDS = new Set([
    'FR-1001', 'FR-1002',
    'ARR-101', 'ARR-102',
    'BAR-201', 'BAR-202',
    'AUC-401', 'AUC-402',
    'LFT-501', 'LFT-502',
  ]);

  const hasDemoData = 
    farmers.some((f) => DEMO_IDS.has(f.id)) ||
    cropArrivals.some((a) => DEMO_IDS.has(a.id)) ||
    bardanaEntries.some((b) => DEMO_IDS.has(b.id)) ||
    agencyPurchases.some((p) => DEMO_IDS.has(p.id)) ||
    liftingDispatches.some((l) => DEMO_IDS.has(l.id));

  const handleRemoveDemoData = () => {
    if (window.confirm('ਕੀ ਤੁਸੀਂ ਸਾਫਟਵੇਅਰ ਦਾ ਸੈਂਪਲ/ਡੈਮੋ ਡਾਟਾ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਤੁਹਾਡਾ ਆਪਣਾ ਅਸਲ ਡਾਟਾ ਬਿਲਕੁਲ ਸੁਰੱਖਿਅਤ ਰਹੇਗਾ।')) {
      setFarmers((prev) => prev.filter((f) => !DEMO_IDS.has(f.id)));
      setCropArrivals((prev) => prev.filter((a) => !DEMO_IDS.has(a.id)));
      setBardanaEntries((prev) => prev.filter((b) => !DEMO_IDS.has(b.id)));
      setAgencyPurchases((prev) => prev.filter((p) => !DEMO_IDS.has(p.id)));
      setLiftingDispatches((prev) => prev.filter((l) => !DEMO_IDS.has(l.id)));
      showToast('success', 'ਸਾਫਟਵੇਅਰ ਦਾ ਡੈਮੋ ਡਾਟਾ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ! ਹੁਣ ਸਿਰਫ਼ ਤੁਹਾਡਾ ਆਪਣਾ ਅਸਲ ਡਾਟਾ ਹੀ ਰਹੇਗਾ।');
    }
  };

  // Process Voice / Text
  const handleProcessVoiceInput = async (inputText: string) => {
    setIsParsing(true);
    try {
      const res = await fetch('/api/parse-mandi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: inputText,
          mandi_name: currentMandi,
          default_agent_name: 'JAMMU TRADING CO.',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const parsed: MandiTransaction = await res.json();
      parsed.raw_transcript = inputText;
      parsed.mandi_yard = currentMandi;
      parsed.synced_to_sheets = false;

      setActiveVoiceTransaction(parsed);
      showToast('success', `Voice record for ${parsed.master_record.main_farmer_name} parsed!`);
    } catch (err: any) {
      console.error(err);
      showToast('error', err.message || 'Voice parsing failed.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased text-gray-900 selection:bg-emerald-200">
      
      {/* Top Navigation & Status */}
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        sheetConfig={sheetConfig}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        currentMandi={currentMandi}
        onMandiChange={setCurrentMandi}
        cloudSyncActive={cloudSyncActive}
        isSyncingCloud={isSyncingCloud}
        onSyncLaptopData={handleSyncLaptopData}
        hasLocalDataToUpload={hasLocalDataToUpload}
        onOpenLetterPad={() => setActiveModule('letterpad')}
        onOpenAuthTroubleshoot={() => setIsUnauthorizedDomainModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
        
        {/* Device Sync Info & Laptop Data Migration Banner */}
        {user && hasLocalDataToUpload && (
          <div className="print:hidden bg-gradient-to-r from-amber-50 to-emerald-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 flex-shrink-0">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                  <span>ਲੈਪਟਾਪ ਦਾ ਡਾਟਾ ਕਲਾਊਡ ਤੇ ਸਿੰਕ ਕਰੋ (Sync Laptop Records to Cloud)</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    ਮੋਬਾਈਲ ਲਈ ਜ਼ਰੂਰੀ
                  </span>
                </h4>
                <p className="text-xs text-amber-900 mt-0.5">
                  ਤੁਹਾਡੇ ਲੈਪਟਾਪ ਵਿੱਚ ਮੌਜੂਦ {farmers.length} ਕਿਸਾਨ ਅਤੇ {cropArrivals.length} ਆਵਕ ਐਂਟਰੀਆਂ ਨੂੰ ਇੱਕ ਕਲਿੱਕ ਨਾਲ ਕਲਾਊਡ ਵਿੱਚ ਸੇਵ ਕਰੋ ਤਾਂ ਜੋ ਉਹ ਮੋਬਾਈਲ ਤੇ ਵੀ ਆਪਣੇ-ਆਪ ਦਿਸਣ।
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncLaptopData}
              disabled={isSyncingCloud}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 flex-shrink-0"
            >
              {isSyncingCloud ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ਅਪਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 text-amber-300" />
                  <span>ਹੁਣੇ ਸਿੰਕ ਕਰੋ (Sync Now)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 5 Distinct Module Tabs Bar */}
        <div className="print:hidden bg-white rounded-2xl shadow-xs border border-gray-200 p-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            
            {/* Module 1: Farmer Register */}
            <button
              type="button"
              onClick={() => setActiveModule('farmers')}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeModule === 'farmers'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>1. Farmer Register (ਕਿਸਾਨ ਰਜਿਸਟਰ)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeModule === 'farmers' ? 'bg-emerald-900 text-amber-300' : 'bg-gray-200 text-gray-800'
              }`}>
                {farmers.length}
              </span>
            </button>

            {/* Module 2: Crop Inward / Arrival */}
            <button
              type="button"
              onClick={() => setActiveModule('arrivals')}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeModule === 'arrivals'
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Wheat className="w-4 h-4 text-amber-400" />
              <span>2. Crop Arrival (ਫਸਲ ਆਵਕ/ਆਮਦ)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeModule === 'arrivals' ? 'bg-emerald-900 text-amber-300' : 'bg-gray-200 text-gray-800'
              }`}>
                {cropArrivals.length}
              </span>
            </button>

            {/* Module 3: Bardana */}
            <button
              type="button"
              onClick={() => setActiveModule('bardana')}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeModule === 'bardana'
                  ? 'bg-orange-800 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="w-4 h-4 text-amber-300" />
              <span>3. Bardana (ਬਾਰਦਾਨਾ ਗੱਟੇ)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeModule === 'bardana' ? 'bg-orange-950 text-amber-300' : 'bg-gray-200 text-gray-800'
              }`}>
                {bardanaEntries.length}
              </span>
            </button>

            {/* Module 4: Agency Purchase & Auction */}
            <button
              type="button"
              onClick={() => setActiveModule('agency')}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeModule === 'agency'
                  ? 'bg-blue-800 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>4. Agency Purchase & J-Form (ਖਰੀਦ/ਬੋਲੀ)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeModule === 'agency' ? 'bg-blue-950 text-amber-300' : 'bg-gray-200 text-gray-800'
              }`}>
                {agencyPurchases.length}
              </span>
            </button>

            {/* Module 5: Lifting & Dispatch */}
            <button
              type="button"
              onClick={() => setActiveModule('lifting')}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeModule === 'lifting'
                  ? 'bg-purple-800 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-300" />
              <span>5. Lifting & Dispatch (ਲਿਫਟਿੰਗ)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeModule === 'lifting' ? 'bg-purple-950 text-amber-300' : 'bg-gray-200 text-gray-800'
              }`}>
                {liftingDispatches.length}
              </span>
            </button>

            {/* Module 6: Letter Pad (ਲੈਟਰ ਪੈਡ - ਦੋਵੇਂ ਫਰਮਾਂ) */}
            <button
              type="button"
              onClick={() => setActiveModule('letterpad')}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeModule === 'letterpad'
                  ? 'bg-emerald-900 text-white shadow-md ring-2 ring-amber-400'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>6. ਲੈਟਰ ਪੈਡ (Letter Pad)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeModule === 'letterpad' ? 'bg-emerald-950 text-amber-300' : 'bg-emerald-100 text-emerald-800'
              }`}>
                ਦੋਵੇਂ ਫਰਮਾਂ
              </span>
            </button>

            {/* AI Voice Assistant */}
            <button
              type="button"
              onClick={() => setActiveModule('ai_assistant')}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeModule === 'ai_assistant'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>🎙️ Voice Studio</span>
            </button>

          </div>
        </div>

        {/* Toast Alert Banner */}
        {toastMessage && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : toastMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : 'bg-blue-50 text-blue-900 border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
              {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-gray-400 hover:text-gray-700 ml-4 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. SEPARATE MODULE: Farmer Register */}
        {activeModule === 'farmers' && (
          <FarmerDirectory
            farmers={farmers}
            onAddNew={() => {
              setEditingFarmer(null);
              setIsFarmerModalOpen(true);
            }}
            onEditFarmer={(f) => {
              setEditingFarmer(f);
              setIsFarmerModalOpen(true);
            }}
            onDeleteFarmer={handleDeleteFarmer}
            sheetConfig={sheetConfig}
            onSyncSheets={() => setIsSheetModalOpen(true)}
            isSyncing={false}
          />
        )}

        {/* 2. SEPARATE MODULE: Crop Inward & Arrival */}
        {activeModule === 'arrivals' && (
          <CropArrivalModule
            entries={cropArrivals}
            onAddEntry={handleAddArrival}
            onAddBatchEntries={handleAddBatchArrivals}
            onUpdateEntry={handleUpdateArrival}
            onDeleteEntry={(id) => {
              if (confirm('ਆਵਕ ਐਂਟਰੀ ਹਟਾਉਣੀ ਹੈ?')) {
                setCropArrivals((prev) => prev.filter((e) => e.id !== id));
                showToast('info', 'ਆਵਕ ਐਂਟਰੀ ਹਟਾਈ ਗਈ।');
              }
            }}
            registeredFarmers={farmers}
            agencyPurchases={agencyPurchases}
            token={token}
            sheetConfig={sheetConfig}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        )}

        {/* 3. SEPARATE MODULE: Bardana Management */}
        {activeModule === 'bardana' && (
          <BardanaModule
            entries={bardanaEntries}
            onAddEntry={handleAddBardana}
            onUpdateEntry={handleUpdateBardana}
            onDeleteEntry={(id) => {
              if (confirm('ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਹਟਾਉਣੀ ਹੈ?')) {
                setBardanaEntries((prev) => prev.filter((e) => e.id !== id));
                showToast('info', 'ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਹਟਾਈ ਗਈ।');
              }
            }}
            registeredFarmers={farmers}
            shellers={shellers}
            onAddSheller={handleAddSheller}
            token={token}
            sheetConfig={sheetConfig}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        )}

        {/* 4. SEPARATE MODULE: Agency Purchase & J-Form */}
        {activeModule === 'agency' && (
          <AgencyPurchaseModule
            entries={agencyPurchases}
            onAddEntry={handleAddPurchase}
            onAddBatchPurchases={handleAddBatchPurchases}
            onUpdateEntry={handleUpdatePurchase}
            onDeleteEntry={(id) => {
              if (confirm('ਖਰੀਦ ਐਂਟਰੀ ਹਟਾਉਣੀ ਹੈ?')) {
                setAgencyPurchases((prev) => prev.filter((e) => e.id !== id));
                showToast('info', 'ਖਰੀਦ ਐਂਟਰੀ ਹਟਾਈ ਗਈ।');
              }
            }}
            onOpenJForm={(entry) => setSelectedJFormEntry(entry)}
            registeredFarmers={farmers}
            token={token}
            sheetConfig={sheetConfig}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        )}

        {/* 5. SEPARATE MODULE: Lifting & Dispatch */}
        {activeModule === 'lifting' && (
          <LiftingDispatchModule
            entries={liftingDispatches}
            onAddEntry={handleAddLifting}
            onUpdateEntry={handleUpdateLifting}
            onDeleteEntry={(id) => {
              if (confirm('ਲਿਫਟਿੰਗ ਚਲਾਨ ਹਟਾਉਣਾ ਹੈ?')) {
                setLiftingDispatches((prev) => prev.filter((e) => e.id !== id));
                showToast('info', 'ਲਿਫਟਿੰਗ ਚਲਾਨ ਹਟਾਇਆ ਗਿਆ।');
              }
            }}
            shellers={shellers}
            token={token}
            sheetConfig={sheetConfig}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
          />
        )}

        {/* 6. SEPARATE MODULE: Letter Pad (ਲੈਟਰ ਪੈਡ - ਦੋਵੇਂ ਫਰਮਾਂ) */}
        {activeModule === 'letterpad' && (
          <LetterPadModule
            registeredFarmers={farmers}
            currentMandi={currentMandi}
            onToast={showToast}
          />
        )}

        {/* 6. AI Voice Studio for Unstructured Audio / Text */}
        {activeModule === 'ai_assistant' && (
          <div className="space-y-6">
            <VoiceTextInputStudio onProcess={handleProcessVoiceInput} isLoading={isParsing} />
            {activeVoiceTransaction && (
              <TransactionEditor
                transaction={activeVoiceTransaction}
                registeredFarmers={farmers}
                onChange={(updated) => setActiveVoiceTransaction(updated)}
                onSyncSheets={() => {
                  if (!token || !sheetConfig) {
                    setIsSheetModalOpen(true);
                  } else {
                    appendMandiTransaction(token, sheetConfig.spreadsheetId, activeVoiceTransaction);
                    showToast('success', 'Synced across Google Sheets tabs!');
                  }
                }}
                onOpenJForm={() => setSelectedJFormEntry(activeVoiceTransaction)}
                onOpenJson={() => setSelectedJsonData(activeVoiceTransaction)}
                onSaveLocal={() => showToast('success', 'Saved!')}
                isSyncing={false}
                hasGoogleToken={Boolean(token)}
              />
            )}
          </div>
        )}

        {/* Software Sample Demo Data Management Banner */}
        {hasDemoData && (
          <div className="print:hidden bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200/70 flex items-center justify-center text-amber-900 flex-shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-xs text-amber-950">
                <p className="font-bold">ਸਾਫਟਵੇਅਰ ਦਾ ਸੈਂਪਲ / ਡੈਮੋ ਡਾਟਾ (Demo Sample Records)</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  ਸਾਫਟਵੇਅਰ ਵਿੱਚ ਡੈਮੋ ਕਿਸਾਨ (Malkit Singh, Baldev Singh) ਤੇ ਸੈਂਪਲ ਐਂਟਰੀਆਂ ਸ਼ਾਮਲ ਹਨ। ਤੁਸੀਂ ਜਦੋਂ ਚਾਹੋ ਸਿਰਫ਼ ਡੈਮੋ ਡਾਟਾ ਹਟਾ ਸਕਦੇ ਹੋ — ਤੁਹਾਡਾ ਆਪਣਾ ਅਸਲ ਡਾਟਾ ਬਿਲਕੁਲ ਸੁਰੱਖਿਅਤ ਰਹੇਗਾ।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveDemoData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ਸਿਰਫ਼ ਡੈਮੋ ਡਾਟਾ ਸਾਫ਼ ਕਰੋ (Clear Demo Data)</span>
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">KisanMitra ERP</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-gray-600" /> ਲੈਪਟਾਪ + <Smartphone className="w-3.5 h-3.5 text-gray-600" /> ਮੋਬਾਈਲ ਲਾਈਵ ਸਿੰਕ
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-400 font-mono text-[11px]">
            <span>Farmer_Register</span>
            <span>•</span>
            <span>Crop_Arrival_Inward</span>
            <span>•</span>
            <span>Bardana_Inventory</span>
            <span>•</span>
            <span>Agency_Purchase_Auction</span>
            <span>•</span>
            <span>Lifting_Dispatches</span>
          </div>
        </div>
      </footer>

      {/* Farmer Register Modal */}
      <FarmerRegisterModal
        isOpen={isFarmerModalOpen}
        onClose={() => {
          setIsFarmerModalOpen(false);
          setEditingFarmer(null);
        }}
        onSaveFarmer={handleSaveFarmer}
        existingFarmers={farmers}
        editingFarmer={editingFarmer}
      />

      {/* Punjab Mandi Board Form J Preview */}
      <JFormModal
        transaction={
          selectedJFormEntry
            ? {
                id: selectedJFormEntry.id,
                created_at: selectedJFormEntry.date || new Date().toISOString(),
                master_record: {
                  main_farmer_name: selectedJFormEntry.farmer_name || selectedJFormEntry.master_record?.main_farmer_name || 'Farmer',
                  father_husband_name: selectedJFormEntry.father_husband_name || selectedJFormEntry.master_record?.father_husband_name || '',
                  village: selectedJFormEntry.village || selectedJFormEntry.master_record?.village || 'Punjab',
                  mobile_number: selectedJFormEntry.mobile || selectedJFormEntry.master_record?.mobile_number || '',
                  billed_to_name: selectedJFormEntry.billed_to_name || selectedJFormEntry.master_record?.billed_to_name || selectedJFormEntry.farmer_name || 'Farmer',
                },
                crop_inward: {
                  crop_type: selectedJFormEntry.crop_type || selectedJFormEntry.crop_inward?.crop_type || 'Paddy (ਝੋਨਾ)',
                  crop_variety: selectedJFormEntry.crop_variety || selectedJFormEntry.crop_inward?.crop_variety || 'PR-126',
                  total_bags: selectedJFormEntry.total_bags || selectedJFormEntry.crop_inward?.total_bags || 0,
                  weight_quintals: selectedJFormEntry.weight_quintals || selectedJFormEntry.crop_inward?.weight_quintals || 0,
                  rate_per_quintal: selectedJFormEntry.rate_per_quintal || selectedJFormEntry.crop_inward?.rate_per_quintal || 0,
                  total_amount: selectedJFormEntry.total_amount || selectedJFormEntry.crop_inward?.total_amount || 0,
                },
                bardana_tracking: {
                  bardana_received_from_agency: selectedJFormEntry.total_bags || 0,
                  bardana_issued_to_farmer: selectedJFormEntry.total_bags || 0,
                  bardana_balance: 0,
                  bardana_type: 'Gunny Bags',
                },
                procurement_agency: {
                  seller_name: selectedJFormEntry.firm_name || selectedJFormEntry.seller_arhtia || 'JAMMU TRADING CO.',
                  purchasing_agency: selectedJFormEntry.purchasing_agency || 'Pungrain',
                  auction_date: selectedJFormEntry.date || new Date().toISOString().split('T')[0],
                  gate_pass_number: 'GP-2026-PB',
                },
                lifting_dispatch: {
                  lifted_bags: selectedJFormEntry.total_bags || 0,
                  lifting_date: selectedJFormEntry.date || new Date().toISOString().split('T')[0],
                  pending_lifting_bags: 0,
                  transporter_truck_no: 'PB-19',
                  lifting_status: 'Fully Lifted',
                },
                labor_palledari: {
                  total_laborers_engaged: 4,
                  palledari_rate_per_bag: selectedJFormEntry.palledari_rate || 14,
                  total_palledari_expense: selectedJFormEntry.palledari_total || 0,
                },
                financial_ledger: {
                  previous_balance: selectedJFormEntry.previous_khata || 0,
                  advance_paid: selectedJFormEntry.advance_paid || 0,
                  net_payable_balance: selectedJFormEntry.net_payable || selectedJFormEntry.total_amount || 0,
                  payment_mode: 'Bank Transfer',
                },
                summary_punjabi: 'ਜੇ-ਫਾਰਮ ਰਸੀਦ',
                summary_english: 'Official J-Form receipt',
              }
            : null
        }
        onClose={() => setSelectedJFormEntry(null)}
        currentMandi={currentMandi}
      />

      {/* Raw JSON Modal */}
      <JsonViewerModal
        transaction={selectedJsonData}
        onClose={() => setSelectedJsonData(null)}
      />

      {/* Google Sheets Configuration Modal */}
      <GoogleSheetsModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        token={token}
        user={user}
        onLogin={handleLogin}
        currentConfig={sheetConfig}
        onSaveConfig={handleSaveSheetConfig}
        currentMandi={currentMandi}
      />

      {/* Firebase & Google OAuth Troubleshooter Modal */}
      <UnauthorizedDomainModal
        isOpen={isUnauthorizedDomainModalOpen}
        onClose={() => setIsUnauthorizedDomainModalOpen(false)}
        onRetryLogin={handleLogin}
        onRetryRedirectLogin={handleLoginRedirect}
        lastError={lastAuthError}
      />

    </div>
  );
}
