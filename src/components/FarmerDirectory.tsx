import React, { useState } from 'react';
import { FarmerMaster, GoogleSheetConfig } from '../types/mandi';
import { 
  UserPlus, 
  Search, 
  Users, 
  MapPin, 
  CreditCard, 
  Phone, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Building,
  CheckCircle2
} from 'lucide-react';

interface FarmerDirectoryProps {
  farmers: FarmerMaster[];
  onAddNew: () => void;
  onEditFarmer: (farmer: FarmerMaster) => void;
  onDeleteFarmer: (id: string) => void;
  sheetConfig: GoogleSheetConfig | null;
  onSyncSheets: () => void;
  isSyncing: boolean;
}

export const FarmerDirectory: React.FC<FarmerDirectoryProps> = ({
  farmers,
  onAddNew,
  onEditFarmer,
  onDeleteFarmer,
  sheetConfig,
  onSyncSheets,
  isSyncing,
}) => {
  const [search, setSearch] = useState('');
  const [expandedFarmerId, setExpandedFarmerId] = useState<string | null>(null);

  const filteredFarmers = farmers.filter((f) => {
    const q = search.toLowerCase();
    const matchesMain =
      f.name_en.toLowerCase().includes(q) ||
      f.name_pa.toLowerCase().includes(q) ||
      f.village_en.toLowerCase().includes(q) ||
      f.village_pa.toLowerCase().includes(q) ||
      f.aadhaar_number.includes(q) ||
      f.mobile_number.includes(q);

    const matchesLinked = (f.linked_farmers || []).some(
      (lf) =>
        lf.name_en.toLowerCase().includes(q) ||
        lf.name_pa.toLowerCase().includes(q) ||
        lf.aadhaar_number.includes(q) ||
        lf.mobile_number.includes(q)
    );

    return matchesMain || matchesLinked;
  });

  const totalLinkedMembers = farmers.reduce(
    (acc, curr) => acc + (curr.linked_farmers ? curr.linked_farmers.length : 0),
    0
  );

  const uniqueVillages = new Set(farmers.map((f) => f.village_en)).size;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden space-y-4">
      
      {/* Top Banner & Stats */}
      <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800 rounded-xl text-amber-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                ਕਿਸਾਨ ਮਾਸਟਰ ਰਜਿਸਟਰ (Farmer Master Register)
              </h2>
              <p className="text-xs text-emerald-200">
                ਸਾਰੇ ਕਾਲਮ ਵੱਖਰੇ • ਅੰਗਰੇਜ਼ੀ ਲਿਖਣ ਤੇ ਪੰਜਾਬੀ ਆਪੇ • ਆਧਾਰ ਨੰਬਰ ਨਾਲ Duplicate ਰੋਕਥਾਮ • Multi ਲਿੰਕਡ ਕਿਸਾਨ
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ ਨਵਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ (Register Farmer)</span>
          </button>
        </div>
      </div>

      {/* Stats summary chips */}
      <div className="px-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਕੁੱਲ ਮੁੱਖ ਖਾਤਾਧਾਰਕ</span>
          <div className="text-lg font-bold font-mono text-emerald-900">{farmers.length} Farmers</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਜੁੜੇ ਪਰਿਵਾਰਕ ਕਿਸਾਨ (Linked)</span>
          <div className="text-lg font-bold font-mono text-amber-900">{totalLinkedMembers} Members</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਪਿੰਡਾਂ ਦੀ ਗਿਣਤੀ (Villages)</span>
          <div className="text-lg font-bold font-mono text-blue-900">{uniqueVillages} Villages</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
          <span className="text-gray-500 block text-[11px]">ਆਧਾਰ ਵੈਰੀਫਾਈਡ</span>
          <div className="text-lg font-bold font-mono text-purple-900">100% Unique</div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="px-5 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, ਪਿੰਡ, Aadhaar, Mobile..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>
        <span className="text-xs text-gray-400 font-medium self-end sm:self-auto">
          Showing {filteredFarmers.length} of {farmers.length} farmers
        </span>
      </div>

      {/* Farmers Register Table with dedicated columns */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <th className="py-3 px-4">Farmer ID</th>
              <th className="py-3 px-4">Farmer Name (English & ਪੰਜਾਬੀ)</th>
              <th className="py-3 px-4">Father / Husband</th>
              <th className="py-3 px-4">Village (ਪਿੰਡ)</th>
              <th className="py-3 px-4">Aadhaar Card No.</th>
              <th className="py-3 px-4">Mobile</th>
              <th className="py-3 px-4 text-center">Multi Linked Farmers</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredFarmers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-xs">
                  ਕੋਈ ਕਿਸਾਨ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। ਨਵਾਂ ਕਿਸਾਨ ਜੋੜਨ ਲਈ ਉੱਪਰ ਦਿੱਤੇ ਬਟਨ ਤੇ ਕਲਿੱਕ ਕਰੋ।
                </td>
              </tr>
            ) : (
              filteredFarmers.map((farmer) => {
                const isExpanded = expandedFarmerId === farmer.id;
                const hasLinked = farmer.linked_farmers && farmer.linked_farmers.length > 0;

                return (
                  <React.Fragment key={farmer.id}>
                    <tr className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-800">
                        {farmer.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 text-sm">
                          {farmer.name_en}
                        </div>
                        <div className="text-emerald-700 font-semibold font-sans">
                          {farmer.name_pa}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-gray-800 font-medium">
                          {farmer.father_husband_name_en || '—'}
                        </div>
                        {farmer.father_husband_name_pa && (
                          <div className="text-gray-500 font-sans text-[11px]">
                            {farmer.father_husband_name_pa}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{farmer.village_en}</span>
                        </div>
                        <div className="text-gray-500 font-sans text-[11px] pl-4">
                          ਪਿੰਡ {farmer.village_pa}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded font-semibold text-gray-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {farmer.aadhaar_number
                              ? farmer.aadhaar_number.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')
                              : 'Not Provided'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-gray-700">
                        {farmer.mobile_number || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {hasLinked ? (
                          <button
                            type="button"
                            onClick={() => setExpandedFarmerId(isExpanded ? null : farmer.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-amber-700" />
                            <span>{farmer.linked_farmers.length} Linked</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">None</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditFarmer(farmer)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                            title="Edit Farmer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteFarmer(farmer.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                            title="Delete Farmer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Multi Linked Farmers Row */}
                    {isExpanded && hasLinked && (
                      <tr className="bg-amber-50/60 border-y border-amber-200">
                        <td colSpan={8} className="py-3 px-6">
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-amber-700" />
                              <span>
                                Linked Family / Joint Farmers under {farmer.name_en} ({farmer.name_pa}):
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {farmer.linked_farmers.map((lf) => (
                                <div
                                  key={lf.id}
                                  className="bg-white border border-amber-200 rounded-lg p-2.5 shadow-2xs text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-900">{lf.name_en}</span>
                                    <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
                                      {lf.relation}
                                    </span>
                                  </div>
                                  <div className="text-emerald-800 font-semibold font-sans mt-0.5">
                                    {lf.name_pa}
                                  </div>
                                  <div className="text-[11px] text-gray-600 mt-1 space-y-0.5">
                                    {(lf.father_husband_name_en || lf.father_husband_name_pa) && (
                                      <div>
                                        <span className="text-gray-400">ਪਿਤਾ/ਪਤੀ:</span> {lf.father_husband_name_en} {lf.father_husband_name_pa && `(${lf.father_husband_name_pa})`}
                                      </div>
                                    )}
                                    {(lf.village_en || lf.village_pa) && (
                                      <div>
                                        <span className="text-gray-400">ਪਿੰਡ:</span> {lf.village_en} {lf.village_pa && `(${lf.village_pa})`}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-500 font-mono mt-1 space-y-0.5">
                                    {lf.mobile_number && <div>Phone: {lf.mobile_number}</div>}
                                    {lf.aadhaar_number && (
                                      <div>
                                        Aadhaar: {lf.aadhaar_number.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
