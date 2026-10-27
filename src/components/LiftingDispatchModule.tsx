import React, { useState } from 'react';
import { 
  LiftingDispatchEntry, 
  GoogleSheetConfig, 
  ShellerMaster, 
  ARHTIA_FIRMS, 
  MANDI_LOCATIONS 
} from '../types/mandi';
import { 
  Truck, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  Trash2, 
  FileText, 
  X,
  Phone,
  Building,
  Clock,
  Warehouse,
  Edit3,
  Factory,
  Camera,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  User,
  Scale
} from 'lucide-react';
import { appendLiftingDispatchToSheets } from '../lib/sheets';

interface LiftingDispatchModuleProps {
  entries: LiftingDispatchEntry[];
  onAddEntry: (entry: LiftingDispatchEntry) => void;
  onUpdateEntry: (entry: LiftingDispatchEntry) => void;
  onDeleteEntry: (id: string) => void;
  shellers: ShellerMaster[];
  token: string | null;
  sheetConfig: GoogleSheetConfig | null;
  onOpenSheetModal: () => void;
}

export const LiftingDispatchModule: React.FC<LiftingDispatchModuleProps> = ({
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  shellers,
  token,
  sheetConfig,
  onOpenSheetModal,
}) => {
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LiftingDispatchEntry | null>(null);
  const [reconcilingEntry, setReconcilingEntry] = useState<LiftingDispatchEntry | null>(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  // Filters & Tabs
  const [search, setSearch] = useState('');
  const [firmTab, setFirmTab] = useState<'All' | 'JAMMU TRADING CO.' | 'NEW JAMMU TRADING CO.'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Dispatched' | 'Delivered'>('All');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // New Lifting Form states
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [selectedFirmId, setSelectedFirmId] = useState(ARHTIA_FIRMS[0].id);
  const [mandiName, setMandiName] = useState(MANDI_LOCATIONS[0]);
  const [agency, setAgency] = useState('Pungrain (ਪਨਗਰੇਨ)');
  const [selectedSheller, setSelectedSheller] = useState(shellers[0]?.name || 'Guru Nanak Rice Mill');
  const [cropType, setCropType] = useState('Paddy Grade A');
  const [truckNo, setTruckNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [truckPhoto, setTruckPhoto] = useState<string | undefined>(undefined);
  const [godown, setGodown] = useState('Miller Sheller Plant');

  // Bag Categories & Breakdown (Old Bags, New Bags, Both)
  const [bagCategory, setBagCategory] = useState<'both' | 'old' | 'new'>('both');
  const [newBags, setNewBags] = useState<number>(200);
  const [oldBags, setOldBags] = useState<number>(200);
  const [pendingYardBags, setPendingYardBags] = useState<number>(150);
  const [challanNo, setChallanNo] = useState(`CH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // Total Bags & Auto Quintal Calculation (400 bags = 150.00 Qtl => 0.375 qtl/bag)
  const totalBagsLifted = bagCategory === 'new' 
    ? Number(newBags || 0) 
    : bagCategory === 'old' 
    ? Number(oldBags || 0) 
    : Number(newBags || 0) + Number(oldBags || 0);

  const autoWeightQuintals = Number((totalBagsLifted * 0.375).toFixed(2));

  // Reconciliation form states (Stage 2: At Sheller)
  const [shortageBags, setShortageBags] = useState<number>(0);
  const [shortageQuintals, setShortageQuintals] = useState<number>(0);
  const [rejectedBags, setRejectedBags] = useState<number>(0);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const activeFirm = ARHTIA_FIRMS.find((f) => f.id === selectedFirmId) || ARHTIA_FIRMS[0];

  // Photo Upload Handler (Camera or file picker)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('ਫੋਟੋ ਦਾ ਸਾਈਜ਼ 5MB ਤੋਂ ਘੱਟ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTruckPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingEntry) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingEntry({ ...editingEntry, truck_photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckNo.trim()) {
      alert('ਟਰੱਕ ਨੰਬਰ ਦਰਜ ਕਰੋ');
      return;
    }

    if (totalBagsLifted <= 0) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਲੱਦੇ ਗਏ ਗੱਟਿਆਂ ਦੀ ਗਿਣਤੀ ਭਰੋ');
      return;
    }

    const newEntry: LiftingDispatchEntry = {
      id: `LFT-${Date.now().toString().slice(-5)}`,
      date_time: dateTime,
      firm_name: activeFirm.name,
      mandi_name: mandiName,
      purchasing_agency: agency,
      seller_sheller_name: selectedSheller,
      crop_type: cropType,
      truck_number: truckNo.trim().toUpperCase(),
      driver_name: driverName.trim() || undefined,
      driver_mobile: driverMobile.trim() || undefined,
      truck_photo: truckPhoto,
      destination_godown: godown.trim() || selectedSheller,
      bag_category: bagCategory,
      new_bags: bagCategory === 'old' ? 0 : Number(newBags || 0),
      old_bags: bagCategory === 'new' ? 0 : Number(oldBags || 0),
      bags_lifted: totalBagsLifted,
      weight_quintals: autoWeightQuintals,
      pending_yard_bags: Number(pendingYardBags) || 0,
      challan_no: challanNo,
      lifting_status: Number(pendingYardBags) === 0 ? 'Fully Lifted' : 'Partially Lifted',
      delivery_status: 'Dispatched', // Stage 1: Mandi Gate Pass Cut / Dispatched
      synced_to_sheets: false,
    };

    onAddEntry(newEntry);
    setIsModalOpen(false);

    // Reset Form
    setTruckNo('');
    setDriverName('');
    setDriverMobile('');
    setTruckPhoto(undefined);
    setNewBags(200);
    setOldBags(200);
    setChallanNo(`CH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Open Reconciliation Modal for Sheller Delivery
  const openReconciliationModal = (entry: LiftingDispatchEntry) => {
    setReconcilingEntry(entry);
    setShortageBags(entry.shortage_bags || 0);
    setShortageQuintals(entry.shortage_quintals || Number(((entry.shortage_bags || 0) * 0.375).toFixed(2)));
    setRejectedBags(entry.rejected_bags || 0);
    setDeliveryNotes(entry.delivery_notes || '');
  };

  const handleReconciliationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingEntry) return;

    const updated: LiftingDispatchEntry = {
      ...reconcilingEntry,
      delivery_status: 'Delivered',
      shortage_bags: Number(shortageBags || 0),
      shortage_quintals: Number(shortageQuintals || 0),
      rejected_bags: Number(rejectedBags || 0),
      delivered_date_time: new Date().toISOString().slice(0, 16),
      delivery_notes: deliveryNotes.trim() || undefined,
    };

    onUpdateEntry(updated);
    setReconcilingEntry(null);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const tot = Number(editingEntry.bags_lifted || 0);
    const calculatedWeight = editingEntry.weight_quintals || Number((tot * 0.375).toFixed(2));

    const updated: LiftingDispatchEntry = {
      ...editingEntry,
      weight_quintals: calculatedWeight,
    };

    onUpdateEntry(updated);
    setEditingEntry(null);
  };

  const handleSyncEntry = async (entry: LiftingDispatchEntry) => {
    if (!token || !sheetConfig) {
      onOpenSheetModal();
      return;
    }

    setIsSyncing(entry.id);
    try {
      await appendLiftingDispatchToSheets(token, sheetConfig.spreadsheetId, entry);
      entry.synced_to_sheets = true;
      alert(`ਲਿਫਟਿੰਗ ਐਂਟਰੀ Google Sheets (Lifting_Dispatches tab) ਵਿੱਚ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ!`);
    } catch (err: any) {
      console.error(err);
      alert('ਗੂਗਲ ਸ਼ੀਟ ਵਿੱਚ ਸੇਵ ਕਰਨ ਵਿੱਚ ਦਿੱਕਤ ਆਈ: ' + err.message);
    } finally {
      setIsSyncing(null);
    }
  };

  // Filtered entries by Search, Firm Tabs, and Delivery Status
  const filteredEntries = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.truck_number.toLowerCase().includes(q) ||
      (e.driver_name && e.driver_name.toLowerCase().includes(q)) ||
      (e.driver_mobile && e.driver_mobile.includes(q)) ||
      e.purchasing_agency.toLowerCase().includes(q) ||
      e.challan_no.toLowerCase().includes(q) ||
      (e.seller_sheller_name && e.seller_sheller_name.toLowerCase().includes(q)) ||
      (e.mandi_name && e.mandi_name.toLowerCase().includes(q));

    const matchFirm = firmTab === 'All' || e.firm_name === firmTab;
    const matchStatus = statusFilter === 'All' || (e.delivery_status || 'Dispatched') === statusFilter;

    return matchSearch && matchFirm && matchStatus;
  });

  // KPI Calculations
  const allTrucksCount = entries.length;
  const jammuTradingCount = entries.filter((e) => e.firm_name === 'JAMMU TRADING CO.').length;
  const newJammuTradingCount = entries.filter((e) => e.firm_name === 'NEW JAMMU TRADING CO.').length;

  const totalBagsAll = filteredEntries.reduce((acc, curr) => acc + (curr.bags_lifted || 0), 0);
  const totalWeightAll = filteredEntries.reduce((acc, curr) => acc + (curr.weight_quintals || (curr.bags_lifted * 0.375)), 0);
  const totalShortageBagsAll = filteredEntries.reduce((acc, curr) => acc + (curr.shortage_bags || 0), 0);
  const totalRejectedBagsAll = filteredEntries.reduce((acc, curr) => acc + (curr.rejected_bags || 0), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden space-y-4">
      
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-800 rounded-xl text-amber-300">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                ਮੰਡੀ ਲਿਫਟਿੰਗ, ਟਰੱਕ ਗੇਟ ਪਾਸ ਤੇ ਸ਼ੈਲਰ ਡਿਸਪੈਚ (Lifting & Dispatches)
              </h2>
              <p className="text-xs text-purple-200">
                ਡਰਾਈਵਰ ਨਾਮ • ਟਰੱਕ ਫੋਟੋ ਕੈਮਰਾ • 2-ਸਟੇਜ (ਰਵਾਨਾ ਤੇ ਸ਼ੈਲਰ ਪਹੁੰਚ) • ਸ਼ਾਰਟੇਜ/ਰੱਦ ਹਿਸਾਬ • 400 ਬੈਗ = 150 ਕੁਇੰਟਲ ਆਟੋ
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ ਨਵਾਂ ਟਰੱਕ ਗੇਟ ਪਾਸ ਕੱਟੋ (New Dispatch)</span>
        </button>
      </div>

      {/* DEDICATED FIRM FILTER TABS */}
      <div className="px-5 border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFirmTab('All')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              firmTab === 'All'
                ? 'border-purple-800 text-purple-950 bg-purple-50/70'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>ਸਾਰੇ ਟਰੱਕ ਲਿਸਟ (All Trucks)</span>
            <span className="bg-purple-200 text-purple-950 px-2 py-0.5 rounded-full font-mono text-[11px]">
              {allTrucksCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFirmTab('JAMMU TRADING CO.')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              firmTab === 'JAMMU TRADING CO.'
                ? 'border-emerald-700 text-emerald-950 bg-emerald-50/70'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building className="w-4 h-4 text-emerald-700" />
            <span>JAMMU TRADING CO.</span>
            <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-mono text-[11px]">
              {jammuTradingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFirmTab('NEW JAMMU TRADING CO.')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              firmTab === 'NEW JAMMU TRADING CO.'
                ? 'border-blue-700 text-blue-950 bg-blue-50/70'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building className="w-4 h-4 text-blue-700" />
            <span>NEW JAMMU TRADING CO.</span>
            <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-mono text-[11px]">
              {newJammuTradingCount}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="px-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਕੁੱਲ ਚੁੱਕੇ ਗੱਟੇ (Lifted Bags)</span>
          <div className="text-lg font-bold font-mono text-purple-950">{totalBagsAll} Bags</div>
          <div className="text-[10px] text-purple-700 font-mono mt-0.5">{totalWeightAll.toFixed(2)} Qtl</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਕੁੱਲ ਟਰੱਕ (Selected Trucks)</span>
          <div className="text-lg font-bold font-mono text-blue-950">{filteredEntries.length} Trucks</div>
          <div className="text-[10px] text-blue-700">
            {firmTab === 'All' ? 'ਦੋਵੇਂ ਫਰਮਾਂ' : firmTab}
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਸ਼ੈਲਰ ਪਹੁੰਚੇ (Delivered)</span>
          <div className="text-lg font-bold font-mono text-emerald-950">
            {filteredEntries.filter((e) => e.delivery_status === 'Delivered').length} Trucks
          </div>
          <div className="text-[10px] text-emerald-700">ਤਸਦੀਕ ਸ਼ੁਦਾ</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਸ਼ਾਰਟੇਜ ਤੇ ਰੱਦ (Shortage / Rejected)</span>
          <div className="text-sm font-bold font-mono text-red-800 mt-1">
            ਤੋਟਾ: {totalShortageBagsAll} ਬੈਗ • ਰੱਦ: {totalRejectedBagsAll} ਬੈਗ
          </div>
          <div className="text-[10px] text-gray-500">ਸ਼ੈਲਰ ਰਿਪੋਰਟ</div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="px-5 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ਟਰੱਕ ਨੰਬਰ, ਡਰਾਈਵਰ ਦਾ ਨਾਮ, ਮੋਬਾਈਲ, ਸ਼ੈਲਰ, ਚਲਾਨ..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-purple-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-gray-500 text-xs">ਸਟੇਜ:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="All">ਸਾਰੇ ਸਟੇਟਸ (All)</option>
            <option value="Dispatched">ਰਵਾਨਾ / ਰਾਹ ਵਿੱਚ (Dispatched)</option>
            <option value="Delivered">ਸ਼ੈਲਰ ਪਹੁੰਚਿਆ (Delivered)</option>
          </select>
        </div>
      </div>

      {/* Lifting Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <th className="py-3 px-3">ਚਲਾਨ ਨੰਬਰ / ਸਮਾਂ</th>
              <th className="py-3 px-3">ਆੜ੍ਹਤੀਆ ਫਰਮ</th>
              <th className="py-3 px-3">ਟਰੱਕ, ਫੋਟੋ ਤੇ ਡਰਾਈਵਰ</th>
              <th className="py-3 px-3">ਸ਼ੈਲਰ / ਏਜੰਸੀ</th>
              <th className="py-3 px-3 text-right">ਗੱਟੇ ਤੇ ਵਜ਼ਨ (Auto Qtl)</th>
              <th className="py-3 px-3 text-center">ਸਟੇਜ (2-ਸਟੇਜ ਲਾਈਫਸਾਈਕਲ)</th>
              <th className="py-3 px-3 text-center">ਸ਼ਾਰਟੇਜ / ਰਿਜੈਕਟ</th>
              <th className="py-3 px-3 text-center">Sheet Sync</th>
              <th className="py-3 px-3 text-right">ਐਕਸ਼ਨ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-400 text-xs">
                  ਕੋਈ ਲਿਫਟਿੰਗ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ। ਨਵਾਂ ਟਰੱਕ ਗੇਟ ਪਾਸ ਕੱਟਣ ਲਈ ਉੱਪਰ ਵਾਲੇ ਬਟਨ 'ਤੇ ਕਲਿੱਕ ਕਰੋ।
                </td>
              </tr>
            ) : (
              filteredEntries.map((item) => {
                const isDelivered = item.delivery_status === 'Delivered';
                const hasShortage = (item.shortage_bags || 0) > 0 || (item.rejected_bags || 0) > 0;
                const calcQtl = item.weight_quintals || Number((item.bags_lifted * 0.375).toFixed(2));

                return (
                  <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-gray-900">{item.challan_no}</div>
                      <div className="text-[10px] text-gray-400">{item.date_time}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.firm_name.includes('NEW') 
                          ? 'bg-blue-100 text-blue-950' 
                          : 'bg-emerald-100 text-emerald-950'
                      }`}>
                        {item.firm_name}
                      </span>
                      <div className="text-[10px] text-gray-500 mt-0.5">{item.mandi_name}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {item.truck_photo ? (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(item.truck_photo || null)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0 cursor-pointer hover:opacity-80"
                            title="ਫੋਟੋ ਵੱਡੀ ਦੇਖੋ"
                          >
                            <img src={item.truck_photo} alt="Truck" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 flex-shrink-0">
                            <Truck className="w-5 h-5" />
                          </div>
                        )}

                        <div>
                          <div className="font-bold font-mono text-gray-900">{item.truck_number}</div>
                          {item.driver_name && (
                            <div className="text-[11px] text-purple-900 font-semibold flex items-center gap-1">
                              <User className="w-3 h-3 text-purple-600" />
                              <span>{item.driver_name}</span>
                            </div>
                          )}
                          {item.driver_mobile && (
                            <div className="text-[10px] text-gray-500 font-mono">
                              📞 {item.driver_mobile}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900 flex items-center gap-1">
                        <Factory className="w-3.5 h-3.5 text-orange-600" />
                        <span>{item.seller_sheller_name || item.destination_godown}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 font-medium">
                        {item.purchasing_agency} ({item.crop_type})
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <div className="font-bold text-purple-950 text-sm">
                        {item.bags_lifted} Bags
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold">
                        = {calcQtl.toFixed(2)} Qtl
                      </div>
                      <div className="text-[9px] text-gray-500">
                        {item.new_bags ? `${item.new_bags}N ` : ''}{item.old_bags ? `${item.old_bags}O` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {isDelivered ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ਸ਼ੈਲਰ ਪਹੁੰਚਿਆ</span>
                          </span>
                          {item.delivered_date_time && (
                            <div className="text-[9px] text-gray-400 mt-0.5">{item.delivered_date_time}</div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-950 px-2.5 py-1 rounded-full border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ</span>
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => openReconciliationModal(item)}
                              className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
                            >
                              ਸ਼ੈਲਰ ਪਹੁੰਚ ਦਰਜ ਕਰੋ →
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {hasShortage ? (
                        <div className="inline-block bg-red-50 border border-red-200 rounded-lg p-1 text-[10px] text-red-900 font-mono">
                          {item.shortage_bags ? <div>ਤੋਟਾ: {item.shortage_bags} ਬੈਗ ({item.shortage_quintals || 0}Q)</div> : null}
                          {item.rejected_bags ? <div>ਰੱਦ: {item.rejected_bags} ਬੈਗ</div> : null}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">-</span>
                      )}
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
                          className="inline-flex items-center gap-1 text-[11px] bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 rounded font-semibold transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>{isSyncing === item.id ? 'Sync...' : 'Sync'}</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openReconciliationModal(item)}
                          title="ਸ਼ੈਲਰ ਪਹੁੰਚ ਤੇ ਤੋਟਾ/ਰਿਜੈਕਟ ਹਿਸਾਬ"
                          className="p-1 text-emerald-700 hover:bg-emerald-50 rounded font-semibold text-[11px] cursor-pointer"
                        >
                          ਤਸਦੀਕ
                        </button>
                        <button
                          onClick={() => setEditingEntry({ ...item })}
                          title="ਪੂਰੀ ਐਂਟਰੀ ਐਡਿਟ ਕਰੋ"
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ਕੀ ਤੁਸੀਂ ਲਿਫਟਿੰਗ ਐਂਟਰੀ ${item.challan_no} ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
                              onDeleteEntry(item.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
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

      {/* ============================================================== */}
      {/* NEW LIFTING MODAL                                             */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-purple-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">ਨਵੀਂ ਮੰਡੀ ਲਿਫਟਿੰਗ ਤੇ ਟਰੱਕ ਗੇਟ ਪਾਸ (New Lifting Dispatch)</h3>
                  <p className="text-[10px] text-purple-200">ਸਟੇਜ 1: ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ (Mandi Dispatch)</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              
              {/* Firm and Mandi Select */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">ਆੜ੍ਹਤੀਆ ਫਰਮ (Firm):</label>
                  <select
                    value={selectedFirmId}
                    onChange={(e) => setSelectedFirmId(e.target.value)}
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold text-purple-950"
                  >
                    {ARHTIA_FIRMS.map((firm) => (
                      <option key={firm.id} value={firm.id}>{firm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">ਦਾਣਾ ਮੰਡੀ (Dana Mandi):</label>
                  <select
                    value={mandiName}
                    onChange={(e) => setMandiName(e.target.value)}
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold text-gray-900"
                  >
                    {MANDI_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Agency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਮਿਤੀ ਤੇ ਸਮਾਂ (Date & Time):</label>
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਖਰੀਦ ਏਜੰਸੀ (Agency):</label>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    <option value="Pungrain (ਪਨਗਰੇਨ)">Pungrain (ਪਨਗਰੇਨ)</option>
                    <option value="Markfed (ਮਾਰਕਫੈੱਡ)">Markfed (ਮਾਰਕਫੈੱਡ)</option>
                    <option value="Punsup (ਪਨਸਪ)">Punsup (ਪਨਸਪ)</option>
                    <option value="Punjab State Warehousing (PSWC)">PSWC (ਵੇਅਰਹਾਊਸ)</option>
                    <option value="FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)">FCI (ਕੇਂਦਰੀ ਖੁਰਾਕ ਨਿਗਮ)</option>
                  </select>
                </div>
              </div>

              {/* Destination Sheller */}
              <div>
                <label className="block text-gray-600 font-semibold mb-1">
                  ਮੰਜ਼ਿਲ ਸ਼ੈਲਰ / ਮਿੱਲ ਚੁਣੋ (Destination Rice Sheller / Mill):
                </label>
                <select
                  value={selectedSheller}
                  onChange={(e) => setSelectedSheller(e.target.value)}
                  className="w-full p-2.5 bg-orange-50 border border-orange-300 rounded-xl font-bold text-orange-950"
                >
                  {shellers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} - ਸਥਾਨ: {s.location} • ਮੋਬਾਈਲ: {s.mobile}
                    </option>
                  ))}
                </select>
              </div>

              {/* Truck Details, Driver Name & Driver Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਟਰੱਕ ਨੰਬਰ (Truck No):</label>
                  <input
                    type="text"
                    value={truckNo}
                    onChange={(e) => setTruckNo(e.target.value)}
                    placeholder="PB-03-AF-9876"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono uppercase font-bold text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਡਰਾਈਵਰ ਦਾ ਨਾਮ (Driver Name):</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Kuldeep Singh"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਡਰਾਈਵਰ ਮੋਬਾਈਲ (Mobile):</label>
                  <input
                    type="tel"
                    value={driverMobile}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    placeholder="98765-11223"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>
              </div>

              {/* Truck Photo Capture / Upload */}
              <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-700" />
                    <span>ਟਰੱਕ ਦੀ ਫੋਟੋ / ਕੈਮਰਾ (Truck Photo Capture):</span>
                  </label>
                  {truckPhoto && (
                    <button
                      type="button"
                      onClick={() => setTruckPhoto(undefined)}
                      className="text-red-600 text-[11px] hover:underline cursor-pointer"
                    >
                      ਫੋਟੋ ਹਟਾਓ
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                  />
                  {truckPhoto && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-purple-400 flex-shrink-0">
                      <img src={truckPhoto} alt="Truck Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Bag Categories (Old, New, Both) and Auto Quintal */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950">ਬਾਰਦਾਨਾ ਕਿਸਮ ਚੁਣੋ (Old / New / Both):</span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    ਆਟੋ ਵਜ਼ਨ: {autoWeightQuintals} ਕੁਇੰਟਲ
                  </span>
                </div>

                {/* Radio selection */}
                <div className="grid grid-cols-3 gap-2">
                  <label className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                    bagCategory === 'both' ? 'bg-purple-800 text-white border-purple-900' : 'bg-white border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="bagCat"
                      checked={bagCategory === 'both'}
                      onChange={() => setBagCategory('both')}
                      className="sr-only"
                    />
                    <span>ਦੋਵੇਂ (New + Old)</span>
                  </label>

                  <label className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                    bagCategory === 'new' ? 'bg-purple-800 text-white border-purple-900' : 'bg-white border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="bagCat"
                      checked={bagCategory === 'new'}
                      onChange={() => setBagCategory('new')}
                      className="sr-only"
                    />
                    <span>ਸਿਰਫ਼ ਨਵਾਂ (New)</span>
                  </label>

                  <label className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                    bagCategory === 'old' ? 'bg-purple-800 text-white border-purple-900' : 'bg-white border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="bagCat"
                      checked={bagCategory === 'old'}
                      onChange={() => setBagCategory('old')}
                      className="sr-only"
                    />
                    <span>ਸਿਰਫ਼ ਪੁਰਾਣਾ (Old)</span>
                  </label>
                </div>

                {/* Counters */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(bagCategory === 'both' || bagCategory === 'new') && (
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">ਨਵੇਂ ਬਾਰਦਾਨਾ ਗੱਟੇ (New Bags):</label>
                      <input
                        type="number"
                        value={newBags}
                        onChange={(e) => setNewBags(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-950"
                      />
                    </div>
                  )}

                  {(bagCategory === 'both' || bagCategory === 'old') && (
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣੇ ਬਾਰਦਾਨਾ ਗੱਟੇ (Old Bags):</label>
                      <input
                        type="number"
                        value={oldBags}
                        onChange={(e) => setOldBags(Number(e.target.value))}
                        className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-950"
                      />
                    </div>
                  )}
                </div>

                {/* Auto Qtl Banner */}
                <div className="p-2 bg-white rounded-lg border border-purple-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">ਕੁੱਲ ਲੱਦੇ ਗੱਟੇ: {totalBagsLifted} Bags</span>
                  <span className="font-mono font-black text-emerald-900 text-sm">
                    {autoWeightQuintals} Qtl (400 ਬੈਗ = 150Qtl)
                  </span>
                </div>
              </div>

              {/* Challan No & Pending Yard */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਚਲਾਨ ਨੰਬਰ (Challan No):</label>
                  <input
                    type="text"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਫੜ੍ਹ ਵਿੱਚ ਬਾਕੀ (Yard Stock):</label>
                  <input
                    type="number"
                    value={pendingYardBags}
                    onChange={(e) => setPendingYardBags(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono font-bold text-amber-950"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-900 hover:bg-purple-950 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>ਗੇਟ ਪਾਸ ਕੱਟੋ ਤੇ ਰਵਾਨਾ ਕਰੋ (Dispatch)</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RECONCILIATION MODAL (STAGE 2: DELIVERED TO SHELLER)          */}
      {/* ============================================================== */}
      {reconcilingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">ਸ਼ੈਲਰ ਪਹੁੰਚ ਤੇ ਤੋਟਾ/ਰੱਦ ਤਸਦੀਕ (Confirm Sheller Delivery)</h3>
                  <p className="text-[10px] text-emerald-200">ਟਰੱਕ: {reconcilingEntry.truck_number} • ਚਲਾਨ: {reconcilingEntry.challan_no}</p>
                </div>
              </div>
              <button
                onClick={() => setReconcilingEntry(null)}
                className="text-gray-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconciliationSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                <div className="font-bold">
                  ਮੰਜ਼ਿਲ: {reconcilingEntry.seller_sheller_name}
                </div>
                <div className="text-[11px] text-emerald-800">
                  ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ ਹੋਏ: {reconcilingEntry.bags_lifted} ਗੱਟੇ ({reconcilingEntry.weight_quintals || (reconcilingEntry.bags_lifted * 0.375).toFixed(2)} ਕੁਇੰਟਲ)
                </div>
              </div>

              {/* Shortage Bags and Quintals */}
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-3">
                <div className="font-bold text-red-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>ਸ਼ੈਲਰ ਪਹੁੰਚ ਕੇ ਮਾਲ ਵਿੱਚ ਸ਼ਾਰਟੇਜ / ਤੋਟਾ (Shortage Breakdown):</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਸ਼ਾਰਟੇਜ ਗੱਟੇ (Shortage Bags):</label>
                    <input
                      type="number"
                      value={shortageBags}
                      onChange={(e) => {
                        const sBags = Number(e.target.value) || 0;
                        setShortageBags(sBags);
                        setShortageQuintals(Number((sBags * 0.375).toFixed(2)));
                      }}
                      className="w-full p-2 bg-white border border-red-300 rounded-lg font-mono font-bold text-red-900"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">ਸ਼ਾਰਟੇਜ ਵਜ਼ਨ (Shortage Qtl):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={shortageQuintals}
                      onChange={(e) => setShortageQuintals(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-red-300 rounded-lg font-mono font-bold text-red-900"
                    />
                  </div>
                </div>

                {/* Rejected Bags */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">ਰੱਦ / ਰਿਜੈਕਟ ਗੱਟੇ (Rejected Bags):</label>
                  <input
                    type="number"
                    value={rejectedBags}
                    onChange={(e) => setRejectedBags(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-red-300 rounded-lg font-mono font-bold text-red-900"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">ਜੋ ਗੱਟੇ ਸ਼ੈਲਰ ਨੇ ਵਾਪਿਸ ਕੀਤੇ ਜਾਂ ਪਾਸ ਨਹੀਂ ਕੀਤੇ</span>
                </div>
              </div>

              {/* Net Accepted calculation */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <div className="text-gray-700 font-semibold flex justify-between">
                  <span>ਸ਼ੈਲਰ ਵੱਲੋਂ ਪਾਸ ਕੁੱਲ ਬੈਗ:</span>
                  <span className="font-bold font-mono text-emerald-900">
                    {Math.max(0, reconcilingEntry.bags_lifted - Number(shortageBags || 0) - Number(rejectedBags || 0))} Bags
                  </span>
                </div>
                <div className="text-gray-700 font-semibold flex justify-between">
                  <span>ਕੁੱਲ ਪਾਸ ਵਜ਼ਨ:</span>
                  <span className="font-bold font-mono text-emerald-900">
                    {(Math.max(0, reconcilingEntry.bags_lifted - Number(shortageBags || 0) - Number(rejectedBags || 0)) * 0.375).toFixed(2)} Qtl
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਸ਼ੈਲਰ ਰਸੀਦ / ਰਿਮਾਰਕਸ (Delivery Notes):</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. 5 bags damaged in transit, passed 395 bags"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReconcilingEntry(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>ਸ਼ੈਲਰ ਡਿਲੀਵਰੀ ਤਸਦੀਕ ਕਰੋ (Confirm Delivery)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 100% FULL EDIT MODAL                                           */}
      {/* ============================================================== */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">ਲਿਫਟਿੰਗ ਐਂਟਰੀ ਸੋਧੋ (Edit Lifting Entry 100%)</h3>
                  <p className="text-[10px] text-blue-200">ਚਲਾਨ: {editingEntry.challan_no}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="text-gray-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਆੜ੍ਹਤੀਆ ਫਰਮ (Firm):</label>
                  <select
                    value={editingEntry.firm_name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, firm_name: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    {ARHTIA_FIRMS.map((firm) => (
                      <option key={firm.id} value={firm.name}>{firm.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਟਰੱਕ ਨੰਬਰ (Truck No):</label>
                  <input
                    type="text"
                    value={editingEntry.truck_number}
                    onChange={(e) => setEditingEntry({ ...editingEntry, truck_number: e.target.value.toUpperCase() })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-mono uppercase font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਡਰਾਈਵਰ ਦਾ ਨਾਮ:</label>
                  <input
                    type="text"
                    value={editingEntry.driver_name || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, driver_name: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਡਰਾਈਵਰ ਮੋਬਾਈਲ:</label>
                  <input
                    type="tel"
                    value={editingEntry.driver_mobile || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, driver_mobile: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਸ਼ੈਲਰ (Destination Sheller):</label>
                  <select
                    value={editingEntry.seller_sheller_name}
                    onChange={(e) => setEditingEntry({ ...editingEntry, seller_sheller_name: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    {shellers.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਸਟੇਟਸ (Delivery Status):</label>
                  <select
                    value={editingEntry.delivery_status || 'Dispatched'}
                    onChange={(e) => setEditingEntry({ ...editingEntry, delivery_status: e.target.value as any })}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  >
                    <option value="Dispatched">ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ (Dispatched)</option>
                    <option value="Delivered">ਸ਼ੈਲਰ ਪਹੁੰਚਿਆ (Delivered)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਲੱਦੇ ਗੱਟੇ (Bags):</label>
                  <input
                    type="number"
                    value={editingEntry.bags_lifted}
                    onChange={(e) => {
                      const bags = Number(e.target.value) || 0;
                      setEditingEntry({
                        ...editingEntry,
                        bags_lifted: bags,
                        weight_quintals: Number((bags * 0.375).toFixed(2)),
                      });
                    }}
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-950"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਆਟੋ ਕੁਇੰਟਲ (Qtl):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEntry.weight_quintals || Number((editingEntry.bags_lifted * 0.375).toFixed(2))}
                    onChange={(e) => setEditingEntry({ ...editingEntry, weight_quintals: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਯਾਰਡ ਸਟਾਕ (Pending):</label>
                  <input
                    type="number"
                    value={editingEntry.pending_yard_bags}
                    onChange={(e) => setEditingEntry({ ...editingEntry, pending_yard_bags: Number(e.target.value) })}
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-gray-900"
                  />
                </div>
              </div>

              {/* Edit Truck Photo */}
              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਟਰੱਕ ਫੋਟੋ ਬਦਲੋ (Update Photo):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditPhotoUpload}
                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-100 file:text-blue-800"
                  />
                  {editingEntry.truck_photo && (
                    <div className="w-10 h-10 rounded border border-gray-300 overflow-hidden flex-shrink-0">
                      <img src={editingEntry.truck_photo} alt="Truck" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                >
                  ਸੋਧ ਸੇਵ ਕਰੋ (Update)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Photo Viewer Modal */}
      {viewPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewPhotoUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-black rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
            <img src={viewPhotoUrl} alt="Truck Full" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setViewPhotoUrl(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/90 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
