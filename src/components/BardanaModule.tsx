import React, { useState } from 'react';
import { BardanaEntry, FarmerMaster, GoogleSheetConfig, ShellerMaster, DEFAULT_SHELLERS, MANDI_LOCATIONS } from '../types/mandi';
import { 
  Package, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  Trash2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RotateCcw,
  X,
  Building2,
  Users,
  Edit3,
  Factory
} from 'lucide-react';
import { appendBardanaToSheets } from '../lib/sheets';

interface BardanaModuleProps {
  entries: BardanaEntry[];
  onAddEntry: (entry: BardanaEntry) => void;
  onUpdateEntry: (entry: BardanaEntry) => void;
  onDeleteEntry: (id: string) => void;
  registeredFarmers: FarmerMaster[];
  shellers: ShellerMaster[];
  onAddSheller: (sheller: ShellerMaster) => void;
  token: string | null;
  sheetConfig: GoogleSheetConfig | null;
  onOpenSheetModal: () => void;
}

export const BardanaModule: React.FC<BardanaModuleProps> = ({
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  registeredFarmers,
  shellers,
  onAddSheller,
  token,
  sheetConfig,
  onOpenSheetModal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddShellerOpen, setIsAddShellerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BardanaEntry | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // New Sheller Form state
  const [newShellerName, setNewShellerName] = useState('');
  const [newShellerLoc, setNewShellerLoc] = useState('');
  const [newShellerMobile, setNewShellerMobile] = useState('');

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mandiName, setMandiName] = useState('Mandi Kamalpur (ਕਮਾਲਪੁਰ)');
  const [transType, setTransType] = useState<
    'Received from Agency' | 'Received from Seller/Sheller' | 'Received from Private Source' | 'Issued to Farmer' | 'Returned to Yard'
  >('Received from Agency');
  
  const [agencyName, setAgencyName] = useState('Pungrain (ਪਨਗਰੇਨ)');
  const [selectedSheller, setSelectedSheller] = useState(shellers[0]?.name || 'Guru Nanak Rice Mill');
  const [privateSourceLocation, setPrivateSourceLocation] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [village, setVillage] = useState('');
  const [bardanaType, setBardanaType] = useState('Jute Gunny (ਸਣ ਦਾ ਬਾਰਦਾਨਾ)');

  // Split: New Jute + Old Jute
  const [newJuteBags, setNewJuteBags] = useState<number>(200);
  const [oldJuteBags, setOldJuteBags] = useState<number>(200);
  const totalBags = Number(newJuteBags || 0) + Number(oldJuteBags || 0);

  const [remarks, setRemarks] = useState('');

  // Calculate live stats
  const totalReceived = entries
    .filter((e) => 
      e.transaction_type === 'Received from Agency' || 
      e.transaction_type === 'Received from Seller/Sheller' || 
      e.transaction_type === 'Received from Private Source'
    )
    .reduce((acc, curr) => acc + (curr.quantity_bags || 0), 0);

  const totalIssued = entries
    .filter((e) => e.transaction_type === 'Issued to Farmer')
    .reduce((acc, curr) => acc + (curr.quantity_bags || 0), 0);

  const totalReturned = entries
    .filter((e) => e.transaction_type === 'Returned to Yard')
    .reduce((acc, curr) => acc + (curr.quantity_bags || 0), 0);

  const currentBalance = totalReceived - totalIssued + totalReturned;

  const handleAddNewSheller = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShellerName.trim()) return;
    const sheller: ShellerMaster = {
      id: `SH-${Date.now().toString().slice(-4)}`,
      name: newShellerName.trim(),
      location: newShellerLoc.trim() || 'Dana Mandi',
      mobile: newShellerMobile.trim() || '',
    };
    onAddSheller(sheller);
    setSelectedSheller(sheller.name);
    setNewShellerName('');
    setNewShellerLoc('');
    setNewShellerMobile('');
    setIsAddShellerOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isAddition =
      transType === 'Received from Agency' ||
      transType === 'Received from Seller/Sheller' ||
      transType === 'Received from Private Source' ||
      transType === 'Returned to Yard';

    const newBalance = isAddition ? currentBalance + totalBags : currentBalance - totalBags;

    const isReceiving = transType.startsWith('Received');

    const newEntry: BardanaEntry = {
      id: `BAR-${Date.now().toString().slice(-5)}`,
      date,
      mandi_name: mandiName,
      transaction_type: transType,
      agency_name: isReceiving ? (agencyName !== 'None' ? agencyName : undefined) : undefined,
      seller_sheller_name: isReceiving ? (selectedSheller || undefined) : undefined,
      source_type: isReceiving ? 'Government Agency & Sheller' : 'Private Open Market',
      farmer_name: farmerName.trim() || undefined,
      village: village.trim() || undefined,
      new_jute_bags: Number(newJuteBags) || 0,
      old_jute_bags: Number(oldJuteBags) || 0,
      quantity_bags: totalBags,
      bardana_type: bardanaType,
      balance_after_transaction: newBalance,
      remarks: remarks.trim() || (transType === 'Received from Private Source' ? `Private from: ${privateSourceLocation}` : undefined),
      synced_to_sheets: false,
    };

    onAddEntry(newEntry);
    setIsModalOpen(false);

    // Reset
    setFarmerName('');
    setVillage('');
    setRemarks('');
    setPrivateSourceLocation('');
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const computedTotal = Number(editingEntry.new_jute_bags || 0) + Number(editingEntry.old_jute_bags || 0);
    const updated = {
      ...editingEntry,
      quantity_bags: computedTotal > 0 ? computedTotal : editingEntry.quantity_bags,
    };
    onUpdateEntry(updated);
    setEditingEntry(null);
  };

  const handleSyncEntry = async (entry: BardanaEntry) => {
    if (!token || !sheetConfig) {
      onOpenSheetModal();
      return;
    }

    setIsSyncing(entry.id);
    try {
      await appendBardanaToSheets(token, sheetConfig.spreadsheetId, entry);
      entry.synced_to_sheets = true;
      alert(`ਬਾਰਦਾਨਾ ਐਂਟਰੀ Google Sheets (Bardana_Inventory tab) ਵਿੱਚ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ!`);
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
      (e.agency_name && e.agency_name.toLowerCase().includes(q)) ||
      (e.seller_sheller_name && e.seller_sheller_name.toLowerCase().includes(q)) ||
      (e.farmer_name && e.farmer_name.toLowerCase().includes(q)) ||
      (e.village && e.village.toLowerCase().includes(q)) ||
      (e.remarks && e.remarks.toLowerCase().includes(q)) ||
      e.bardana_type.toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || e.transaction_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden space-y-4">
      
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-orange-900 via-amber-900 to-orange-950 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-800/80 rounded-xl text-amber-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ (Bardana Inventory: New & Old Jute)
              </h2>
              <p className="text-xs text-amber-200">
                ਨਵਾਂ + ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ ਸਪਲਿਟ • ਸ਼ੈਲਰ/ਸੈਲਰ ਤੇ ਪ੍ਰਾਈਵੇਟ ਸਰੋਤ • 100% ਪੂਰੀ ਐਡਿਟ ਸੁਵਿਧਾ • Sheet Tab: Bardana_Inventory
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddShellerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-800 hover:bg-orange-700 text-white rounded-xl text-xs font-bold border border-orange-700 cursor-pointer"
          >
            <Factory className="w-4 h-4 text-amber-300" />
            <span>+ ਸ਼ੈਲਰ ਜੋੜੋ (Add Sheller)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ ਨਵੀਂ ਬਾਰਦਾਨਾ ਐਂਟਰੀ</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="px-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span>ਮੌਜੂਦਾ ਸਟਾਕ (Current Balance)</span>
            <Package className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-xl font-bold font-mono text-orange-950">{currentBalance} Bags</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span>ਕੁੱਲ ਪ੍ਰਾਪਤ (Total Received)</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900">{totalReceived} Bags</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span>ਕਿਸਾਨਾਂ ਨੂੰ ਜਾਰੀ (Issued to Farmers)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-900">{totalIssued} Bags</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span>ਵਾਪਿਸ ਆਏ (Returned to Yard)</span>
            <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-900">{totalReturned} Bags</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Agency, Sheller, Farmer, Remarks..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-orange-600 focus:bg-white"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-semibold focus:outline-none cursor-pointer self-end sm:self-auto"
        >
          <option value="All">All Transactions (ਸਾਰੇ ਲੇਣ-ਦੇਣ)</option>
          <option value="Received from Agency">Agency Received</option>
          <option value="Received from Seller/Sheller">Sheller Received</option>
          <option value="Received from Private Source">Private Source Received</option>
          <option value="Issued to Farmer">Issued to Farmer</option>
          <option value="Returned to Yard">Returned to Yard</option>
        </select>
      </div>

      {/* Bardana Ledger Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <th className="py-3 px-4">Date / Mandi</th>
              <th className="py-3 px-4">Transaction Type</th>
              <th className="py-3 px-4">Party / Agency / Sheller / Private</th>
              <th className="py-3 px-4">New Jute (ਨਵਾਂ)</th>
              <th className="py-3 px-4">Old Jute (ਪੁਰਾਣਾ)</th>
              <th className="py-3 px-4 text-right">Total Quantity (ਕੁੱਲ)</th>
              <th className="py-3 px-4 text-right">Yard Balance</th>
              <th className="py-3 px-4">Remarks (ਟਿੱਪਣੀ)</th>
              <th className="py-3 px-4 text-center">Sheet Sync</th>
              <th className="py-3 px-4 text-right">100% Edit / Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-gray-400 text-xs">
                  ਕੋਈ ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
                </td>
              </tr>
            ) : (
              filteredEntries.map((item) => {
                const isIncoming =
                  item.transaction_type === 'Received from Agency' ||
                  item.transaction_type === 'Received from Seller/Sheller' ||
                  item.transaction_type === 'Received from Private Source' ||
                  item.transaction_type === 'Returned to Yard';

                const partyDisplay =
                  item.seller_sheller_name ||
                  item.agency_name ||
                  (item.farmer_name ? `${item.farmer_name} (${item.village || ''})` : 'Mandi Stock');

                return (
                  <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-gray-900">{item.date}</div>
                      <div className="text-[10px] text-gray-500">{item.mandi_name || 'Mandi Kamalpur'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          isIncoming
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-blue-600" />
                        )}
                        {item.transaction_type}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{partyDisplay}</div>
                      {item.source_type && (
                        <div className="text-[10px] text-gray-500">{item.source_type}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {item.new_jute_bags || 0}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-800">
                      {item.old_jute_bags || 0}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-sm text-gray-900">
                      <span className={isIncoming ? 'text-emerald-700' : 'text-blue-700'}>
                        {isIncoming ? '+' : '-'}{item.quantity_bags}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-orange-950">
                      {item.balance_after_transaction} Bags
                    </td>

                    <td className="py-3 px-4 text-gray-600 text-[11px]">
                      {item.remarks || '-'}
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
                          className="inline-flex items-center gap-1 text-[11px] bg-orange-700 hover:bg-orange-800 text-white px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>{isSyncing === item.id ? 'Syncing...' : 'Sync Tab'}</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingEntry({ ...item })}
                          title="100% Full Edit"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer font-bold inline-flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ਕੀ ਤੁਸੀਂ ਐਂਟਰੀ ${item.id} ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
                              onDeleteEntry(item.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
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

      {/* Add Sheller Modal */}
      {isAddShellerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden my-auto">
            <div className="p-4 bg-orange-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-300" />
                <h3 className="text-sm font-bold">ਨਵਾਂ ਸ਼ੈਲਰ / ਸੈਲਰ ਸ਼ਾਮਲ ਕਰੋ (Add New Sheller/Seller)</h3>
              </div>
              <button
                onClick={() => setIsAddShellerOpen(false)}
                className="text-gray-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewSheller} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਸ਼ੈਲਰ ਦਾ ਨਾਮ (Sheller / Mill Name):</label>
                <input
                  type="text"
                  value={newShellerName}
                  onChange={(e) => setNewShellerName(e.target.value)}
                  placeholder="Guru Nanak Rice Mill / ਸ਼ੈਲਰ"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਸਥਾਨ / ਸੜਕ (Location / Road):</label>
                <input
                  type="text"
                  value={newShellerLoc}
                  onChange={(e) => setNewShellerLoc(e.target.value)}
                  placeholder="Kamalpur Mandi Road / Mehrajwala"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਮੋਬਾਈਲ ਨੰਬਰ (Mobile Number):</label>
                <input
                  type="tel"
                  value={newShellerMobile}
                  onChange={(e) => setNewShellerMobile(e.target.value)}
                  placeholder="98140-11223"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddShellerOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-700 hover:bg-orange-800 text-white rounded-xl font-bold shadow-md"
                >
                  ਸ਼ੈਲਰ ਸੇਵ ਕਰੋ (Save Sheller)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Bardana Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-orange-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">ਨਵੀਂ ਬਾਰਦਾਨਾ ਐਂਟਰੀ (New Bardana Entry)</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              
              {/* Row 1: Date & Mandi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਮਿਤੀ (Date):</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
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

              {/* Row 2: Transaction Type */}
              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਲੇਣ-ਦੇਣ ਦੀ ਕਿਸਮ (Transaction Type):</label>
                <select
                  value={transType}
                  onChange={(e) => setTransType(e.target.value as any)}
                  className="w-full p-2.5 bg-orange-50 border border-orange-300 rounded-xl font-bold text-orange-950"
                >
                  <option value="Received from Agency">1. ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀ ਤੋਂ ਪ੍ਰਾਪਤ (From Agency)</option>
                  <option value="Received from Seller/Sheller">2. ਸ਼ੈਲਰ / ਸੈਲਰ ਤੋਂ ਪ੍ਰਾਪਤ (From Sheller / Seller)</option>
                  <option value="Received from Private Source">3. ਪ੍ਰਾਈਵੇਟ ਜਗ੍ਹਾ / ਬਾਜ਼ਾਰ ਤੋਂ ਪ੍ਰਾਪਤ (From Private Source)</option>
                  <option value="Issued to Farmer">4. ਕਿਸਾਨ ਨੂੰ ਜਾਰੀ ਕੀਤਾ (Issued to Farmer)</option>
                  <option value="Returned to Yard">5. ਮੰਡੀ ਯਾਰਡ ਵਿੱਚ ਵਾਪਿਸ ਆਇਆ (Returned)</option>
                </select>
              </div>

              {/* Conditional Source/Party fields */}
              {(transType === 'Received from Agency' || transType === 'Received from Seller/Sheller' || transType === 'Received from Private Source') && (
                <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-3">
                  <div className="font-bold text-orange-950 text-xs flex items-center justify-between">
                    <span>ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ ਸਰੋਤ (Agency & Sheller / Seller ਦੋਵੇਂ ਚੁਣੋ):</span>
                    <span className="text-[10px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-semibold">
                      ਦੋਵੇਂ ਆਪਸ਼ਨ ਉਪਲਬਧ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Agency Dropdown */}
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀ (Agency):</label>
                      <select
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900"
                      >
                        <option value="Pungrain (ਪਨਗਰੇਨ)">Pungrain (ਪਨਗਰੇਨ)</option>
                        <option value="Markfed (ਮਾਰਕਫੈੱਡ)">Markfed (ਮਾਰਕਫੈੱਡ)</option>
                        <option value="Punsup (ਪਨਸਪ)">Punsup (ਪਨਸਪ)</option>
                        <option value="Punjab State Warehousing (PSWC)">PSWC (ਵੇਅਰਹਾਊਸ)</option>
                        <option value="FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)">FCI (ਕੇਂਦਰੀ ਖੁਰਾਕ ਨਿਗਮ)</option>
                        <option value="Miller / Private">Miller / Private Agency</option>
                        <option value="None">None (ਕੋਈ ਨਹੀਂ)</option>
                      </select>
                    </div>

                    {/* Sheller / Seller Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-gray-700 font-bold">ਸੈਲਰ / ਸ਼ੈਲਰ (Seller/Sheller):</label>
                        <button
                          type="button"
                          onClick={() => setIsAddShellerOpen(true)}
                          className="text-orange-700 hover:underline font-bold text-[10px]"
                        >
                          + ਨਵਾਂ ਸ਼ੈਲਰ
                        </button>
                      </div>
                      <select
                        value={selectedSheller}
                        onChange={(e) => setSelectedSheller(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-300 rounded-xl font-bold text-amber-950"
                      >
                        <option value="">-- ਸ਼ੈਲਰ ਚੁਣੋ (Select Sheller) --</option>
                        {shellers.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.location})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {transType === 'Received from Private Source' && (
                    <div className="pt-2 border-t border-orange-200">
                      <label className="block text-gray-600 font-semibold mb-1">ਪ੍ਰਾਈਵੇਟ ਸਰੋਤ / ਸਥਾਨ ਦਾ ਨਾਮ (Private Source / Dealer):</label>
                      <input
                        type="text"
                        value={privateSourceLocation}
                        onChange={(e) => setPrivateSourceLocation(e.target.value)}
                        placeholder="ਖੁੱਲ੍ਹਾ ਬਾਰਦਾਨਾ ਵਪਾਰੀ / ਆੜ੍ਹਤੀਆ ਗੋਦਾਮ"
                        className="w-full p-2 bg-white border border-orange-300 rounded-xl font-bold text-gray-900"
                      />
                    </div>
                  )}
                </div>
              )}

              {transType === 'Issued to Farmer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name):</label>
                    <input
                      type="text"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      placeholder="Malkit Singh"
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਪਿੰਡ (Village):</label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="Bhadaur"
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* Requirement #3: New Jute + Old Jute Bardana Split (e.g. Total 400 = 200 new + 200 old) */}
              <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-950">ਨਵਾਂ ਤੇ ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ ਗਿਣਤੀ (New & Old Jute Split)</span>
                  <span className="text-[11px] font-bold text-orange-800">
                    ਕੁੱਲ ਗੱਟੇ: {totalBags} Bags
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਨਵਾਂ ਬਾਰਦਾਨਾ (New Jute):</label>
                    <input
                      type="number"
                      value={newJuteBags}
                      onChange={(e) => setNewJuteBags(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Jute):</label>
                    <input
                      type="number"
                      value={oldJuteBags}
                      onChange={(e) => setOldJuteBags(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">ਕੁੱਲ ਗਿਣਤੀ (Total Bags):</label>
                    <input
                      type="number"
                      readOnly
                      value={totalBags}
                      className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg font-mono font-black text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks Field (User requirement #7) */}
              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਟਿੱਪਣੀ / ਵੇਰਵਾ (Remarks):</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="ਗੱਡੀ ਨੰਬਰ, ਸ਼ੈਲਰ ਵੇਰਵਾ, ਪ੍ਰਾਈਵੇਟ ਜਗ੍ਹਾ ਜਾਂ ਖਾਸ ਨੋਟ..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                />
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
                  className="px-5 py-2 bg-orange-700 hover:bg-orange-800 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                >
                  ਬਾਰਦਾਨਾ ਸੇਵ ਕਰੋ (Save Bardana)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 100% Full Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 overflow-hidden my-auto">
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">100% ਪੂਰੀ ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਐਡਿਟ ਕਰੋ (Full 100% Edit Bardana)</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਮਿਤੀ (Date):</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-gray-900"
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

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਮ (Transaction Type):</label>
                <select
                  value={editingEntry.transaction_type}
                  onChange={(e) => setEditingEntry({ ...editingEntry, transaction_type: e.target.value as any })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-900"
                >
                  <option value="Received from Agency">Received from Agency</option>
                  <option value="Received from Seller/Sheller">Received from Seller/Sheller</option>
                  <option value="Received from Private Source">Received from Private Source</option>
                  <option value="Issued to Farmer">Issued to Farmer</option>
                  <option value="Returned to Yard">Returned to Yard</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਸਰਕਾਰੀ ਏਜੰਸੀ (Agency Name):</label>
                  <input
                    type="text"
                    value={editingEntry.agency_name || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, agency_name: e.target.value })}
                    placeholder="Pungrain / Markfed / None"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਸ਼ੈਲਰ / ਸੈਲਰ (Seller/Sheller):</label>
                  <input
                    type="text"
                    value={editingEntry.seller_sheller_name || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, seller_sheller_name: e.target.value })}
                    placeholder="Guru Nanak Rice Mill"
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name - ਜੇਕਰ ਕਿਸਾਨ ਨੂੰ ਜਾਰੀ ਕੀਤਾ ਹੋਵੇ):</label>
                <input
                  type="text"
                  value={editingEntry.farmer_name || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, farmer_name: e.target.value })}
                  placeholder="Farmer name"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                />
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਨਵਾਂ ਜੂਟ (New Jute):</label>
                  <input
                    type="number"
                    value={editingEntry.new_jute_bags || 0}
                    onChange={(e) => {
                      const n = Number(e.target.value) || 0;
                      const o = editingEntry.old_jute_bags || 0;
                      setEditingEntry({ ...editingEntry, new_jute_bags: n, quantity_bags: n + o });
                    }}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਪੁਰਾਣਾ ਜੂਟ (Old Jute):</label>
                  <input
                    type="number"
                    value={editingEntry.old_jute_bags || 0}
                    onChange={(e) => {
                      const o = Number(e.target.value) || 0;
                      const n = editingEntry.new_jute_bags || 0;
                      setEditingEntry({ ...editingEntry, old_jute_bags: o, quantity_bags: n + o });
                    }}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">ਕੁੱਲ ਗੱਟੇ (Total Bags):</label>
                  <input
                    type="number"
                    value={editingEntry.quantity_bags}
                    onChange={(e) => setEditingEntry({ ...editingEntry, quantity_bags: Number(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono font-black text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">ਟਿੱਪਣੀ / ਵੇਰਵਾ (Remarks):</label>
                <input
                  type="text"
                  value={editingEntry.remarks || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, remarks: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900"
                />
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
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md cursor-pointer"
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
