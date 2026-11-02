import React, { useState, useRef, useMemo } from 'react';
import { CropArrivalEntry, FarmerMaster, MANDI_LOCATIONS, ARHTIA_FIRMS } from '../types/mandi';
import { 
  Printer, 
  X, 
  Calendar, 
  MapPin, 
  Download, 
  Building2, 
  CheckCircle2, 
  FileText, 
  Search,
  Wheat,
  Scale,
  Layers,
  Sparkles
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

interface CropArrivalPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CropArrivalEntry[];
  registeredFarmers?: FarmerMaster[];
  initialMandi?: string;
  initialDate?: string;
}

export const CropArrivalPdfModal: React.FC<CropArrivalPdfModalProps> = ({
  isOpen,
  onClose,
  entries,
  registeredFarmers = [],
  initialMandi,
  initialDate,
}) => {
  const sheetPrintRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Extract distinct dates from entries
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.date) set.add(e.date);
    });
    return Array.from(set).sort().reverse();
  }, [entries]);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || 'All');
  const [selectedMandi, setSelectedMandi] = useState<string>(initialMandi || 'All');
  const [selectedVariety, setSelectedVariety] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedDate !== 'All' && e.date !== selectedDate) return false;
      if (selectedMandi !== 'All' && e.mandi_name && !e.mandi_name.includes(selectedMandi)) return false;
      if (selectedVariety !== 'All' && e.crop_variety !== selectedVariety && e.crop_type !== selectedVariety) return false;
      
      if (search.trim()) {
        const q = search.toLowerCase();
        const fName = (e.farmer_name || '').toLowerCase();
        const fPa = (e.farmer_name_pa || '').toLowerCase();
        const fat = (e.father_husband_name || '').toLowerCase();
        const vil = (e.village || '').toLowerCase();
        const pNo = (e.parchi_no || e.gate_pass_no || '').toLowerCase();
        const veh = (e.vehicle_trolley_no || '').toLowerCase();
        const mob = (e.mobile || '').toLowerCase();

        return (
          fName.includes(q) ||
          fPa.includes(q) ||
          fat.includes(q) ||
          vil.includes(q) ||
          pNo.includes(q) ||
          veh.includes(q) ||
          mob.includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (a.parchi_no || '').localeCompare(b.parchi_no || '');
    });
  }, [entries, selectedDate, selectedMandi, selectedVariety, search]);

  // Totals
  const totalParchis = filteredEntries.length;
  const totalNewBags = filteredEntries.reduce((sum, e) => sum + (e.new_jute_bags || 0), 0);
  const totalOldBags = filteredEntries.reduce((sum, e) => sum + (e.old_jute_bags || 0), 0);
  const totalBags = filteredEntries.reduce((sum, e) => sum + (e.total_bags_arrived || 0), 0);
  const totalQuintals = filteredEntries.reduce((sum, e) => sum + (e.weight_quintals || 0), 0);

  // Pagination: 16 entries per page so that each row is 100% full and NEVER cut across pages!
  const ROWS_PER_PAGE = 16;
  const pages = useMemo(() => {
    if (filteredEntries.length === 0) return [[] as CropArrivalEntry[]];
    const chunks: CropArrivalEntry[][] = [];
    for (let i = 0; i < filteredEntries.length; i += ROWS_PER_PAGE) {
      chunks.push(filteredEntries.slice(i, i + ROWS_PER_PAGE));
    }
    return chunks;
  }, [filteredEntries]);

  if (!isOpen) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // High-Resolution PDF Download: Captures each page individually so NO farmer name or line is EVER cut!
  const handleDownloadPdf = async () => {
    if (!sheetPrintRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const pageElements = sheetPrintRef.current.querySelectorAll('.pdf-page-container');
      if (pageElements.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i] as HTMLElement;
        const dataUrl = await toJpeg(el, {
          quality: 0.98,
          backgroundColor: '#ffffff',
          pixelRatio: 2.2,
        });

        if (i > 0) {
          pdf.addPage();
        }
        // Map exactly 1 page to 1 A4 page (no vertical pixel slicing!)
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const dateStr = selectedDate !== 'All' ? selectedDate : new Date().toISOString().split('T')[0];
      pdf.save(`PunjabiMandi_Arrival_Register_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਿੰਟ ਬਟਨ ਵਰਤੋ।');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* Strict Print CSS for Zero Cutoff / Zero Row Splitting */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pdf-page-container {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .pdf-page-container:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-300 overflow-hidden my-auto max-h-[96vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Action Header (Hidden in Print) */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-emerald-950 rounded-xl shadow-md font-bold">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>ਆਵਕ ਰਿਕਾਰਡ ਲਿਸਟ (Crop Arrival Inward Register)</span>
                <span className="text-xs bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-full font-mono font-bold">
                  PDF & Print
                </span>
                <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  {pages.length} {pages.length === 1 ? 'ਪੰਨਾ' : 'ਪੰਨੇ (No Cutoff)'}
                </span>
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                ਪਰਚੀ ਨੰਬਰ, ਕਿਸਾਨ, ਪਿੰਡ, ਮੋਬਾਈਲ, ਬੋਰੀਆਂ, ਵਜ਼ਨ ਤੇ ਨਮੀ — ਹਰ ਪੰਨੇ 'ਤੇ ਕਿਸਾਨ ਦਾ ਪੂਰਾ ਨਾਮ ਬਿਨਾਂ ਕੱਟੇ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>🖨️ ਪ੍ਰਿੰਟ ਕਰੋ (Print)</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-emerald-950 font-black rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4 text-emerald-950" />
              <span>{isGeneratingPdf ? 'PDF ਬਣ ਰਿਹਾ ਹੈ...' : '📄 PDF ਡਾਊਨਲੋਡ ਕਰੋ'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden in Print) */}
        <div className="p-3 bg-slate-50 border-b border-gray-200 shrink-0 text-xs print:hidden space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span className="font-bold text-gray-700 text-[11px]">ਮਿਤੀ:</span>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-semibold text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="All">ਸਾਰੀਆਂ ਮਿਤੀਆਂ (All Dates)</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {d.split('-').reverse().join('/')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mandi Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-blue-700" />
                <span className="font-bold text-gray-700 text-[11px]">ਮੰਡੀ:</span>
                <select
                  value={selectedMandi}
                  onChange={(e) => setSelectedMandi(e.target.value)}
                  className="bg-transparent font-semibold text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="All">ਸਾਰੀਆਂ ਮੰਡੀਆਂ (All Mandis)</option>
                  {MANDI_LOCATIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Variety Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <Wheat className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-bold text-gray-700 text-[11px]">ਕਿਸਮ:</span>
                <select
                  value={selectedVariety}
                  onChange={(e) => setSelectedVariety(e.target.value)}
                  className="bg-transparent font-semibold text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="All">ਸਾਰੀਆਂ ਕਿਸਮਾਂ (All Varieties)</option>
                  <option value="PR-126">PR-126</option>
                  <option value="110">110</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Paddy Grade A">Paddy Grade A</option>
                </select>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ਕਿਸਾਨ, ਪਿੰਡ, ਪਰਚੀ ਨੰਬਰ ਖੋਜੋ..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* KPI Strip */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-200/60 text-xs font-mono font-bold flex-wrap">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-300">
                ਕੁੱਲ ਪਰਚੀਆਂ: <strong>{totalParchis}</strong>
              </span>
              <span className="bg-blue-100 text-blue-950 px-2 py-0.5 rounded-lg border border-blue-300">
                ਨਵਾਂ: <strong>{totalNewBags}N</strong>
              </span>
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-lg border border-amber-300">
                ਪੁਰਾਣਾ: <strong>{totalOldBags}O</strong>
              </span>
              <span className="bg-teal-100 text-teal-950 px-2 py-0.5 rounded-lg border border-teal-300">
                ਕੁੱਲ ਗੱਟੇ: <strong>{totalBags} Bags</strong>
              </span>
              <span className="bg-purple-100 text-purple-950 px-2 py-0.5 rounded-lg border border-purple-300">
                ਕੁੱਲ ਵਜ਼ਨ: <strong>{totalQuintals.toFixed(2)} Qtl</strong>
              </span>
            </div>

            <span className="text-[11px] text-gray-600 font-sans font-semibold">
              ਕੁੱਲ {pages.length} ਪੰਨੇ • ਪ੍ਰਤੀ ਪੰਨਾ {ROWS_PER_PAGE} ਐਂਟਰੀਆਂ (ਬਿਨਾਂ ਲਾਈਨ ਕੱਟੇ)
            </span>
          </div>
        </div>

        {/* Scrollable Printable Document Area with Exact Multi-Page Containers */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200 print:bg-white print:p-0 print:overflow-visible space-y-6 print:space-y-0" ref={sheetPrintRef}>
          {pages.map((pageRows, pageIndex) => {
            const isFirstPage = pageIndex === 0;
            const isLastPage = pageIndex === pages.length - 1;
            const pageNumber = pageIndex + 1;
            const totalPageCount = pages.length;

            return (
              <div 
                key={`arrival-page-${pageIndex}`}
                className="pdf-page-container print-page bg-white text-black p-6 sm:p-8 rounded-xl shadow-lg border border-gray-300 mx-auto max-w-5xl print:shadow-none print:border-none print:p-2 print:max-w-none print:rounded-none relative flex flex-col justify-between"
                style={{ 
                  width: '297mm',
                  minHeight: '200mm',
                  maxHeight: '210mm',
                  boxSizing: 'border-box'
                }}
              >
                <div>
                  {/* Page Header */}
                  {isFirstPage ? (
                    <div className="border-b-2 border-black pb-2 mb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-black leading-tight">
                            PUNJABI MANDI SOFTWARE
                          </h1>
                          <p className="text-xs font-bold text-gray-800">
                            JAMMU TRADING CO. (LIC: JAL/LKH/133) & NEW JAMMU TRADING CO. (LIC: JAL/LKH/134)
                          </p>
                          <p className="text-[11px] text-gray-700">
                            ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ / ਮਹਿਰਾਜਵਾਲਾ / ਕੰਗ ਖੁਰਦ • ਮੋਬਾਈਲ: 98150-00000, 98720-00000
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="inline-block border-2 border-black px-3 py-1 text-center bg-gray-50">
                            <span className="text-[11px] font-bold block uppercase tracking-wider">ਰੋਜ਼ਾਨਾ ਫਸਲ ਆਵਕ ਰਜਿਸਟਰ</span>
                            <span className="text-sm font-black">CROP ARRIVAL INWARD</span>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-1 font-mono">
                            ਤਾਰੀਖ: {selectedDate !== 'All' ? selectedDate.split('-').reverse().join('/') : 'ਸਮੂਹ ਮਿਤੀਆਂ (All Dates)'}
                          </p>
                        </div>
                      </div>

                      {/* Sub-header info bar */}
                      <div className="mt-1.5 pt-1.5 border-t border-gray-300 flex items-center justify-between text-[11px] font-mono">
                        <div>
                          <strong>ਦਾਣਾ ਮੰਡੀ:</strong> {selectedMandi !== 'All' ? selectedMandi : 'ਸਾਰੀਆਂ ਮੰਡੀਆਂ'}
                          <span className="mx-2">•</span>
                          <strong>ਫਸਲ/ਕਿਸਮ:</strong> {selectedVariety !== 'All' ? selectedVariety : 'ਝੋਨਾ (ਸਾਰੀਆਂ ਕਿਸਮਾਂ)'}
                        </div>
                        <div>
                          <strong>ਕੁੱਲ ਪਰਚੀਆਂ:</strong> {totalParchis} | <strong>ਕੁੱਲ ਗੱਟੇ:</strong> {totalBags} | <strong>ਕੁੱਲ ਵਜ਼ਨ:</strong> {totalQuintals.toFixed(2)} Qtl
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Running header on page 2+ */
                    <div className="border-b-2 border-black pb-1.5 mb-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-black text-sm">PUNJABI MANDI SOFTWARE</span>
                        <span className="text-gray-600 ml-2 text-[11px]">
                          ਫਸਲ ਆਵਕ ਰਜਿਸਟਰ (Crop Arrival Inward) • ਮਿਤੀ: {selectedDate !== 'All' ? selectedDate.split('-').reverse().join('/') : 'ਸਮੂਹ ਮਿਤੀਆਂ'}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-gray-800 text-[11px]">
                        ਪੰਨਾ {pageNumber} / {totalPageCount} (Page {pageNumber} of {totalPageCount})
                      </div>
                    </div>
                  )}

                  {/* Arrival Entries Table for THIS Page Only (Zero row cutoff) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-100 text-black font-black border-b-2 border-black">
                          <th className="border border-black p-1 text-center w-8">ਲੜੀ</th>
                          <th className="border border-black p-1 text-center w-20">ਮਿਤੀ</th>
                          <th className="border border-black p-1 w-20">ਪਰਚੀ ਨੰਬਰ</th>
                          <th className="border border-black p-1">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name)</th>
                          <th className="border border-black p-1">ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ</th>
                          <th className="border border-black p-1">ਪਿੰਡ (Village)</th>
                          <th className="border border-black p-1 w-24">ਮੋਬਾਈਲ</th>
                          <th className="border border-black p-1 text-center w-16">ਕਿਸਮ</th>
                          <th className="border border-black p-1 w-20">ਟਰਾਲੀ ਨੰ.</th>
                          <th className="border border-black p-1 text-center w-12">ਨਵਾਂ</th>
                          <th className="border border-black p-1 text-center w-12">ਪੁਰਾਣਾ</th>
                          <th className="border border-black p-1 text-right w-16">ਕੁੱਲ ਗੱਟੇ</th>
                          <th className="border border-black p-1 text-right w-20">ਵਜ਼ਨ (Qtl)</th>
                          <th className="border border-black p-1 text-center w-12">ਨਮੀ%</th>
                          <th className="border border-black p-1 text-center w-16">ਦਸਤਖਤ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.length === 0 ? (
                          <tr>
                            <td colSpan={15} className="border border-black p-6 text-center text-gray-500 italic">
                              ਕੋਈ ਆਵਕ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
                            </td>
                          </tr>
                        ) : (
                          pageRows.map((item, rowIdx) => {
                            const globalIndex = pageIndex * ROWS_PER_PAGE + rowIdx + 1;
                            const totBags = item.total_bags_arrived;
                            const newB = item.new_jute_bags ?? Math.round(totBags / 2);
                            const oldB = item.old_jute_bags ?? Math.floor(totBags / 2);
                            const pNo = item.parchi_no || item.gate_pass_no || '-';

                            return (
                              <tr 
                                key={item.id} 
                                className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-yellow-50/50`}
                              >
                                <td className="border border-black p-1 text-center font-mono font-bold">
                                  {globalIndex}
                                </td>
                                <td className="border border-black p-1 text-center font-mono whitespace-nowrap">
                                  {item.date ? item.date.split('-').reverse().join('/') : '-'}
                                </td>
                                <td className="border border-black p-1 font-mono font-bold text-black">
                                  {pNo}
                                </td>
                                <td className="border border-black p-1 font-bold text-black">
                                  <span>{item.farmer_name}</span>
                                  {item.farmer_name_pa && item.farmer_name_pa !== item.farmer_name && (
                                    <span className="block text-[9.5px] font-normal text-gray-600">
                                      {item.farmer_name_pa}
                                    </span>
                                  )}
                                </td>
                                <td className="border border-black p-1 text-gray-800">
                                  {item.father_husband_name || '-'}
                                </td>
                                <td className="border border-black p-1 text-gray-800">
                                  {item.village || '-'}
                                </td>
                                <td className="border border-black p-1 font-mono text-[10px]">
                                  {item.mobile || '-'}
                                </td>
                                <td className="border border-black p-1 text-center font-semibold text-black">
                                  {item.crop_variety || 'PR-126'}
                                </td>
                                <td className="border border-black p-1 font-mono text-[10px]">
                                  {item.vehicle_trolley_no || '-'}
                                </td>
                                <td className="border border-black p-1 text-center font-mono">
                                  {newB}
                                </td>
                                <td className="border border-black p-1 text-center font-mono">
                                  {oldB}
                                </td>
                                <td className="border border-black p-1 text-right font-mono font-bold text-black">
                                  {totBags}
                                </td>
                                <td className="border border-black p-1 text-right font-mono font-bold text-black">
                                  {Number(item.weight_quintals || 0).toFixed(2)}
                                </td>
                                <td className="border border-black p-1 text-center font-mono text-[10px]">
                                  {item.moisture_percentage ? `${item.moisture_percentage}%` : '-'}
                                </td>
                                <td className="border border-black p-1 text-center">
                                  <div className="h-4"></div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                      {/* On the last page, show Grand Totals */}
                      {isLastPage && (
                        <tfoot>
                          <tr className="bg-gray-200 text-black font-black border-t-2 border-black">
                            <td colSpan={9} className="border border-black p-1.5 text-right uppercase">
                              ਕੁੱਲ ਜੋੜ (GRAND TOTAL):
                            </td>
                            <td className="border border-black p-1.5 text-center font-mono">
                              {totalNewBags}N
                            </td>
                            <td className="border border-black p-1.5 text-center font-mono">
                              {totalOldBags}O
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-xs">
                              {totalBags} Bags
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-xs">
                              {totalQuintals.toFixed(2)} Qtl
                            </td>
                            <td colSpan={2} className="border border-black p-1.5 text-center text-[10px] font-mono">
                              {totalParchis} ਪਰਚੀਆਂ
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Footer Section */}
                <div>
                  {isLastPage ? (
                    /* Official Footer Signatures on Final Page */
                    <div className="mt-4 pt-3 border-t border-black grid grid-cols-3 gap-4 text-center text-xs">
                      <div>
                        <p className="font-bold text-gray-700">ਤਿਆਰ ਕਰਤਾ (Munshi)</p>
                        <div className="h-6"></div>
                        <p className="border-t border-dashed border-gray-400 pt-0.5 font-mono text-[10px]">ਦਸਤਖਤ ਕਲਰਕ / ਮੁਣਸ਼ੀ</p>
                      </div>

                      <div>
                        <p className="font-bold text-gray-700">ਤੋਲਾਈ ਕਰਨ ਵਾਲਾ (Weighman)</p>
                        <div className="h-6"></div>
                        <p className="border-t border-dashed border-gray-400 pt-0.5 font-mono text-[10px]">ਤੋਲਾ ਦਸਤਖਤ</p>
                      </div>

                      <div>
                        <p className="font-bold text-gray-700">ਆੜ੍ਹਤੀਆ ਫਰਮ (Authorised Signatory)</p>
                        <div className="h-6"></div>
                        <p className="border-t border-dashed border-gray-400 pt-0.5 font-mono text-[10px]">ਦਸਤਖਤ / ਮੋਹਰ ਫਰਮ</p>
                      </div>
                    </div>
                  ) : (
                    /* Continued on next page indicator */
                    <div className="mt-2 text-right text-[10px] text-gray-600 italic border-t border-gray-200 pt-1">
                      (ਜਾਰੀ ਅਗਲੇ ਪੰਨੇ {pageNumber + 1} 'ਤੇ... Continued on next page)
                    </div>
                  )}

                  {/* Footer Copyright and Page numbering */}
                  <div className="mt-2 pt-1 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-500 font-mono">
                    <span>Punjabi Mandi Software • ਮਿਤੀ: {new Date().toLocaleDateString('en-GB')} • ਰਿਕਾਰਡ ਕੰਪਿਊਟਰਾਈਜ਼ਡ ਤਿਆਰ ਕੀਤਾ ਗਿਆ</span>
                    <span className="font-bold text-black text-[10px]">ਪੰਨਾ {pageNumber} / {totalPageCount}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-gray-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>ਹਰ ਪੰਨੇ 'ਤੇ ਪੂਰੇ ਕਿਸਾਨ ਦਾ ਨਾਮ (ਕੋਈ ਲਾਈਨ ਅੱਧੀ ਨਹੀਂ ਕੱਟੇਗੀ)। ਕੁੱਲ {pages.length} ਪੰਨੇ।</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl font-semibold text-gray-700 cursor-pointer"
            >
              ਬੰਦ ਕਰੋ (Close)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
