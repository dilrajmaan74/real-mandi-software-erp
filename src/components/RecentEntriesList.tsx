import React, { useState } from 'react';
import { MandiTransaction } from '../types/mandi';
import { 
  Search, 
  Filter, 
  Printer, 
  Code, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Wheat
} from 'lucide-react';

interface RecentEntriesListProps {
  entries: MandiTransaction[];
  onSelectEntry: (entry: MandiTransaction) => void;
  onDeleteEntry: (id: string) => void;
  onOpenJForm: (entry: MandiTransaction) => void;
  onOpenJson: (entry: MandiTransaction) => void;
  selectedId?: string;
}

export const RecentEntriesList: React.FC<RecentEntriesListProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onOpenJForm,
  onOpenJson,
  selectedId,
}) => {
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('All');
  const [agencyFilter, setAgencyFilter] = useState('All');

  const filteredEntries = entries.filter((item) => {
    const matchesSearch =
      item.master_record.main_farmer_name.toLowerCase().includes(search.toLowerCase()) ||
      item.master_record.village.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      (item.master_record.mobile_number && item.master_record.mobile_number.includes(search));

    const matchesCrop = cropFilter === 'All' || item.crop_inward.crop_type.toLowerCase() === cropFilter.toLowerCase();
    const matchesAgency = agencyFilter === 'All' || item.procurement_agency.purchasing_agency.toLowerCase().includes(agencyFilter.toLowerCase());

    return matchesSearch && matchesCrop && matchesAgency;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/10 overflow-hidden">
      {/* Header and filters */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>Mandi Ledger & Transaction History</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold font-mono">
              {entries.length} Entries
            </span>
          </h3>
          <p className="text-xs text-gray-500">
            ਲੋਕਲ ਖਾਤਾ ਬੁੱਕ (Saved offline & synced to Google Sheets)
          </p>
        </div>

        {/* Filter & search inputs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmer, village, ID..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-emerald-600 focus:bg-white w-44"
            />
          </div>

          {/* Crop Filter */}
          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="All">All Crops</option>
            <option value="Paddy">Paddy (ਝੋਨਾ)</option>
            <option value="Maize">Maize (ਮੱਕੀ)</option>
            <option value="Wheat">Wheat (ਕਣਕ)</option>
            <option value="Basmati">Basmati</option>
          </select>

          {/* Agency Filter */}
          <select
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="All">All Agencies</option>
            <option value="Pungrain">Pungrain</option>
            <option value="Markfed">Markfed</option>
            <option value="FCI">FCI</option>
            <option value="Punsup">Punsup</option>
            <option value="Miller">Private Miller</option>
          </select>
        </div>
      </div>

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-xs">
          <Wheat className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="font-semibold text-gray-600">No Mandi records found matching filters.</p>
          <p className="mt-1">Speak or type an inward note in the studio above to create your first entry.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <th className="py-3 px-4">Entry / Date</th>
                <th className="py-3 px-4">Farmer & Village</th>
                <th className="py-3 px-4">Crop & Bags</th>
                <th className="py-3 px-4">Agency / Lifting</th>
                <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                <th className="py-3 px-4 text-center">Sheets Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((item) => {
                const isSelected = item.id === selectedId;
                const formattedDate = item.created_at
                  ? new Date(item.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })
                  : 'Today';

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectEntry(item)}
                    className={`hover:bg-emerald-50/50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-emerald-50/80 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-gray-900">{item.id}</div>
                      <div className="text-[11px] text-gray-400">{formattedDate}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">
                        {item.master_record.main_farmer_name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        ਪਿੰਡ {item.master_record.village} {item.master_record.mobile_number && `• ${item.master_record.mobile_number}`}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-800">
                        {item.crop_inward.crop_type}{' '}
                        <span className="text-[11px] text-gray-500 font-normal">
                          ({item.crop_inward.total_bags} Bags)
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {item.crop_inward.weight_quintals} Qtl @ ₹{item.crop_inward.rate_per_quintal}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-emerald-900">
                        {item.procurement_agency.purchasing_agency}
                      </div>
                      <div className="text-[11px] flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          item.lifting_dispatch.lifting_status === 'Fully Lifted'
                            ? 'bg-emerald-500'
                            : item.lifting_dispatch.lifting_status === 'Partially Lifted'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`} />
                        <span className="text-gray-500">{item.lifting_dispatch.lifting_status}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-950">
                      ₹{item.financial_ledger.net_payable_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {item.synced_to_sheets ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Synced</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Local</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenJForm(item)}
                          className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-md transition-colors"
                          title="Print J-Form"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenJson(item)}
                          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                          title="View JSON"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEntry(item.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-md transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
