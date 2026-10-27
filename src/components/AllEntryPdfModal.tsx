import React, { useState } from 'react';
import { AgencyPurchaseEntry, ArhtiaFirm, ARHTIA_FIRMS, MANDI_LOCATIONS } from '../types/mandi';
import { Printer, X, Filter, Building2, Calendar, MapPin, Download } from 'lucide-react';

interface AllEntryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AgencyPurchaseEntry[];
  initialFirmId?: string;
  initialMandi?: string;
}

export const AllEntryPdfModal: React.FC<AllEntryPdfModalProps> = ({
  isOpen,
  onClose,
  entries,
  initialFirmId,
  initialMandi,
}) => {
  const [selectedFirmId, setSelectedFirmId] = useState<string>(initialFirmId || ARHTIA_FIRMS[0].id);
  const [selectedMandi, setSelectedMandi] = useState<string>(initialMandi || 'All');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [useDateFilter, setUseDateFilter] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentFirm = ARHTIA_FIRMS.find((f) => f.id === selectedFirmId) || ARHTIA_FIRMS[0];

  // Filter entries according to firm, mandi, and date
  const filteredEntries = entries.filter((e) => {
    // Check firm
    const matchFirm = !e.firm_id || e.firm_id === currentFirm.id || e.firm_name === currentFirm.name;
    // Check mandi
    const matchMandi = selectedMandi === 'All' || e.mandi_name?.includes(selectedMandi) || selectedMandi.includes(e.mandi_name || '');
    // Check date
    const matchDate = !useDateFilter || e.date === selectedDate;
    return matchFirm && matchMandi && matchDate;
  });

  const totalBags = filteredEntries.reduce((sum, e) => sum + (e.total_bags || 0), 0);
  const totalWeight = filteredEntries.reduce((sum, e) => sum + (e.weight_quintals || 0), 0);
  const totalAmount = filteredEntries.reduce((sum, e) => sum + (e.total_amount || (e.weight_quintals * e.rate_per_quintal) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-200 overflow-hidden my-auto print:shadow-none print:border-none print:max-w-none print:w-full">
        
        {/* Controls Bar - Hidden on print */}
        <div className="p-4 bg-gray-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold">ਸਰਕਾਰੀ ਖਰੀਦ ਆਲ-ਐਂਟਰੀ PDF ਰਿਪੋਰਟ (All Entry Purchase PDF)</h3>
              <p className="text-[11px] text-gray-400">ਫਰਮ, ਮੰਡੀ ਅਤੇ ਮਿਤੀ ਅਨੁਸਾਰ ਪ੍ਰਿੰਟ / PDF ਐਕਸਪੋਰਟ</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF (ਪ੍ਰਿੰਟ ਕਰੋ)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar - Hidden on print */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs print:hidden">
          <div>
            <label className="block text-gray-600 font-semibold mb-1">ਆੜ੍ਹਤ ਫਰਮ ਚੁਣੋ (Select Arhtia Firm):</label>
            <select
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-lg font-bold text-gray-800 focus:outline-none focus:border-emerald-600"
            >
              {ARHTIA_FIRMS.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name} ({firm.lic_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600 font-semibold mb-1">ਦਾਣਾ ਮੰਡੀ (Dana Mandi Filter):</label>
            <select
              value={selectedMandi}
              onChange={(e) => setSelectedMandi(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-800 font-medium focus:outline-none focus:border-emerald-600"
            >
              <option value="All">ਸਾਰੀਆਂ ਮੰਡੀਆਂ (All Mandis)</option>
              <option value="Kamalpur">Mandi Kamalpur (ਕਮਾਲਪੁਰ)</option>
              <option value="Mehrajwala">Mehrajwala (ਮਹਿਰਾਜਵਾਲਾ)</option>
              <option value="Kang Khurd">Kang Khurd (ਕੰਗ ਖੁਰਦ)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-600 font-semibold">ਤਾਰੀਖ (Date Filter):</label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDateFilter}
                  onChange={(e) => setUseDateFilter(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span className="text-[11px] text-gray-500">Filter by Date</span>
              </label>
            </div>
            <input
              type="date"
              disabled={!useDateFilter}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full p-2 bg-white border border-gray-300 rounded-lg text-gray-800 font-mono ${
                !useDateFilter ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div id="printable-area" className="p-6 sm:p-8 bg-white print:p-2 text-gray-900 font-sans">
          
          {/* Header Banner - Letterhead */}
          <div className="border-b-2 border-gray-900 pb-4 mb-4 text-center relative">
            <div className="text-[11px] font-bold tracking-widest text-emerald-800 uppercase">
              ਪੰਜਾਬ ਰਾਜ ਖੇਤੀਬਾੜੀ ਮੰਡੀਕਰਨ ਬੋਰਡ ਅਧੀਨ ਕਮਿਸ਼ਨ ਏਜੰਟ (ਆੜ੍ਹਤੀਆ)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-wide mt-1">
              {currentFirm.name}
            </h1>
            <div className="text-xs sm:text-sm font-semibold text-gray-700 mt-1">
              {currentFirm.proprietor && (
                <span className="inline-block mr-3 text-red-900 font-bold">
                  {currentFirm.proprietor}
                </span>
              )}
              <span>Mobile: {currentFirm.mobile}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-2 text-xs font-mono bg-gray-100 py-1.5 px-3 rounded-lg border border-gray-200">
              <span><strong>LIC NO:</strong> {currentFirm.lic_number}</span>
              <span>•</span>
              <span><strong>PAN:</strong> {currentFirm.pan_number}</span>
              <span>•</span>
              <span><strong>ADDRS:</strong> {currentFirm.address}</span>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs font-semibold text-gray-600">
              <div>
                <strong>ਸਰਕਾਰੀ ਖਰੀਦ ਰਜਿਸਟਰ (Agency Purchase / Paddy Inward Register)</strong>
              </div>
              <div>
                <span>ਮੰਡੀ: <strong>{selectedMandi === 'All' ? 'ਸਮੂਹ ਮੰਡੀਆਂ (All Mandis)' : selectedMandi}</strong></span>
                <span className="ml-3">ਮਿਤੀ: <strong>{useDateFilter ? selectedDate : 'All Recorded Dates'}</strong></span>
              </div>
            </div>
          </div>

          {/* Table with the 10 User-Specified Columns */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-900 border-collapse">
              <thead>
                <tr className="bg-gray-200 text-gray-950 font-bold border-b border-gray-900 divide-x divide-gray-900">
                  <th className="py-2.5 px-2 text-center w-10">Sr No (ਲੜੀ)</th>
                  <th className="py-2.5 px-2.5">Agency Name (ਖਰੀਦ ਏਜੰਸੀ)</th>
                  <th className="py-2.5 px-2.5">Farmer Name (ਕਿਸਾਨ ਦਾ ਨਾਮ)</th>
                  <th className="py-2.5 px-2.5">Father / Husband Name (ਪਿਤਾ/ਪਤੀ)</th>
                  <th className="py-2.5 px-2.5">Address / Village (ਪਤਾ/ਪਿੰਡ)</th>
                  <th className="py-2.5 px-2.5">Mobile No. (ਮੋਬਾਈਲ)</th>
                  <th className="py-2.5 px-2 text-right">Bags (ਗੱਟੇ)</th>
                  <th className="py-2.5 px-2 text-right">Weight (Qtl)</th>
                  <th className="py-2.5 px-2 text-right">Rate (₹/Qtl)</th>
                  <th className="py-2.5 px-2.5 text-center">Dana Mandi (ਦਾਣਾ ਮੰਡੀ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400 italic font-sans text-xs">
                      ਚੁਣੀ ਹੋਈ ਫਰਮ ਜਾਂ ਮੰਡੀ ਲਈ ਕੋਈ ਖਰੀਦ ਐਂਟਰੀ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((item, index) => {
                    const fatherName = item.father_husband_name || '-';
                    const mandiName = item.mandi_name || 'Mandi Kamalpur';
                    const bagsNewOld = `${item.total_bags} (${item.new_jute_bags || 0}N/${item.old_jute_bags || 0}O)`;

                    return (
                      <tr key={item.id} className="divide-x divide-gray-300 text-gray-900 hover:bg-gray-50">
                        {/* 1. Sr. No */}
                        <td className="py-2 px-2 text-center font-mono font-bold">
                          {index + 1}
                        </td>

                        {/* 2. Agency Name */}
                        <td className="py-2 px-2.5 font-bold text-gray-900">
                          {item.purchasing_agency || 'Pungrain'}
                        </td>

                        {/* 3. Farmer Name */}
                        <td className="py-2 px-2.5">
                          <div className="font-bold">{item.farmer_name}</div>
                          {item.billed_to_name && item.billed_to_name !== item.farmer_name && (
                            <div className="text-[10px] text-blue-700 italic">
                              Billed to: {item.billed_to_name} ({item.relation_with_main || 'Family'})
                            </div>
                          )}
                        </td>

                        {/* 4. Father / Husband Name */}
                        <td className="py-2 px-2.5 text-gray-700">
                          {fatherName}
                        </td>

                        {/* 5. Address / Village */}
                        <td className="py-2 px-2.5">
                          {item.address_village || item.village || '-'}
                        </td>

                        {/* 6. Mobile Number */}
                        <td className="py-2 px-2.5 font-mono text-gray-800">
                          {item.mobile || '-'}
                        </td>

                        {/* 7. Bags */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-gray-900">
                          <div>{item.total_bags}</div>
                          {(item.new_jute_bags > 0 || item.old_jute_bags > 0) && (
                            <div className="text-[10px] text-gray-500 font-normal">
                              {item.new_jute_bags || 0}N + {item.old_jute_bags || 0}O
                            </div>
                          )}
                        </td>

                        {/* 8. Weight (Quintals) */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-gray-950">
                          {Number(item.weight_quintals || 0).toFixed(2)}
                        </td>

                        {/* 9. Rate (₹2461/Qtl) */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-emerald-900">
                          ₹{item.rate_per_quintal || 2461}
                        </td>

                        {/* 10. Dana Mandi */}
                        <td className="py-2 px-2.5 text-center font-medium">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-[11px]">
                            {mandiName}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Footer Row */}
              {filteredEntries.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 font-bold border-t-2 border-gray-900 divide-x divide-gray-900 text-gray-950">
                    <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                      ਕੁੱਲ ਜੋੜ (Grand Total):
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs">
                      {totalBags} Bags
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-xs">
                      {totalWeight.toFixed(2)} Qtl
                    </td>
                    <td colSpan={2} className="py-2.5 px-2 text-right font-mono text-xs text-emerald-950">
                      Total: ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Bottom Signatures */}
          <div className="mt-12 pt-4 border-t border-gray-400 grid grid-cols-3 gap-4 text-xs text-center">
            <div>
              <div className="font-semibold text-gray-600">ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ / ਅੰਗੂਠਾ</div>
              <div className="text-[10px] text-gray-400 mt-6">(Farmer's Signature)</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">ਖਰੀਦ ਇੰਸਪੈਕਟਰ (ਏਜੰਸੀ)</div>
              <div className="text-[10px] text-gray-400 mt-6">(Procurement Inspector Sign)</div>
            </div>
            <div>
              <div className="font-semibold text-gray-800">ਵਾਸਤੇ {currentFirm.name}</div>
              <div className="text-[10px] text-gray-600 font-bold mt-6">ਅਧਿਕਾਰਤ ਹਸਤਾਖਰ (Authorized Signatory)</div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 text-center mt-6 print:block">
            ਰਿਪੋਰਟ ਤਿਆਰ ਕੀਤੀ ਗਈ KisanMitra ERP ਦੁਆਰਾ • {new Date().toLocaleString('en-IN')}
          </div>

        </div>

      </div>
    </div>
  );
};
