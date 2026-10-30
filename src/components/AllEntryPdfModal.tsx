import React, { useState, useRef, useMemo } from 'react';
import { AgencyPurchaseEntry, ArhtiaFirm, ARHTIA_FIRMS, MANDI_LOCATIONS } from '../types/mandi';
import { 
  Printer, 
  X, 
  Calendar, 
  MapPin, 
  Download, 
  Building2, 
  CheckCircle2, 
  FileText, 
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface AllEntryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: AgencyPurchaseEntry[];
  initialFirmId?: string;
  initialMandi?: string;
  initialDate?: string;
}

export const AllEntryPdfModal: React.FC<AllEntryPdfModalProps> = ({
  isOpen,
  onClose,
  entries,
  initialFirmId,
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
    const arr = Array.from(set).sort().reverse();
    return arr;
  }, [entries]);

  // Default to initialDate, or the latest date in entries, or today
  const defaultDate = initialDate || (availableDates.length > 0 ? availableDates[0] : new Date().toISOString().split('T')[0]);

  // Filters State
  const [selectedFirmId, setSelectedFirmId] = useState<string>(initialFirmId || ARHTIA_FIRMS[0].id);
  const [selectedMandi, setSelectedMandi] = useState<string>(initialMandi || 'All');
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [dateFilterMode, setDateFilterMode] = useState<'daily' | 'all'>('daily');
  const [selectedAgency, setSelectedAgency] = useState<string>('All');

  if (!isOpen) return null;

  const currentFirm = ARHTIA_FIRMS.find((f) => f.id === selectedFirmId) || ARHTIA_FIRMS[0];

  // Filter entries based on Firm, Mandi, Date, and Agency
  const filteredEntries = entries.filter((e) => {
    // 1. Firm match
    const matchFirm = !e.firm_id || e.firm_id === currentFirm.id || e.firm_name === currentFirm.name;
    // 2. Mandi match
    const matchMandi = selectedMandi === 'All' || 
      (e.mandi_name && (e.mandi_name.includes(selectedMandi) || selectedMandi.includes(e.mandi_name)));
    // 3. Date match (if daily mode is on)
    const matchDate = dateFilterMode === 'all' || e.date === selectedDate;
    // 4. Agency match
    const matchAgency = selectedAgency === 'All' || 
      (e.purchasing_agency && e.purchasing_agency.toLowerCase().includes(selectedAgency.toLowerCase()));

    return matchFirm && matchMandi && matchDate && matchAgency;
  });

  // Calculate Aggregates
  const totalBags = filteredEntries.reduce((sum, e) => sum + (Number(e.total_bags) || 0), 0);
  const totalNewBags = filteredEntries.reduce((sum, e) => sum + (Number(e.new_jute_bags) || 0), 0);
  const totalOldBags = filteredEntries.reduce((sum, e) => sum + (Number(e.old_jute_bags) || 0), 0);
  const totalWeight = filteredEntries.reduce((sum, e) => sum + (Number(e.weight_quintals) || 0), 0);
  const totalAmount = filteredEntries.reduce((sum, e) => {
    const amt = e.total_amount || (Number(e.weight_quintals || 0) * Number(e.rate_per_quintal || 2461));
    return sum + Number(amt || 0);
  }, 0);

  // Common Agency and Rate for Top Header Box (as requested: "Upar ik jagah MSP Rate and ik Jagah hi agency name")
  const distinctAgencies = Array.from(new Set(filteredEntries.map((e) => e.purchasing_agency).filter(Boolean)));
  const distinctRates = Array.from(new Set(filteredEntries.map((e) => e.rate_per_quintal).filter(Boolean)));
  const distinctVarieties = Array.from(new Set(filteredEntries.map((e) => e.crop_variety || e.crop_type).filter(Boolean)));

  const displayAgency = distinctAgencies.length > 0 
    ? distinctAgencies.join(', ') 
    : (selectedAgency !== 'All' ? selectedAgency : 'Pungrain (ਪਨਗਰੇਨ)');

  const displayRate = distinctRates.length === 1 
    ? `₹${distinctRates[0]}` 
    : distinctRates.length > 1 
    ? distinctRates.map((r) => `₹${r}`).join(', ') 
    : '₹2461.00';

  const displayVariety = distinctVarieties.length > 0 
    ? distinctVarieties.join(' / ') 
    : 'ਝੋਨਾ (Paddy Grade A)';

  // Format Date for Punjabi Display
  const formattedDisplayDate = selectedDate.split('-').reverse().join('/');

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // High-Resolution PDF Download via html-to-image + jsPDF
  const handleDownloadPdf = async () => {
    if (!sheetPrintRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = sheetPrintRef.current;
      
      let imgData: string;
      try {
        imgData = await toJpeg(element, {
          quality: 0.98,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
      } catch (err) {
        console.warn('toJpeg fallback to toPng for purchase sheet:', err);
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
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      const safeFirmName = currentFirm.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Agency_Purchase_${safeFirmName}_${selectedDate}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('PDF ਡਾਊਨਲੋਡ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ, ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਿੰਟ ਬਟਨ ਵਰਤੋ।');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      
      {/* Strict Print CSS for Perfect Single-Page A4 Output */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 6mm 6mm 6mm 6mm;
        }
        @media print {
          html, body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #agency-purchase-sheet {
            width: 198mm !important;
            max-width: 198mm !important;
            margin: 0 auto !important;
            padding: 4mm 5mm !important;
            border: none !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #ffffff !important;
          }
        }
      `}} />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-200 overflow-hidden my-auto print:shadow-none print:border-none print:max-w-none print:w-full">
        
        {/* ======================= CONTROLS TOOLBAR (PRINT:HIDDEN) ======================= */}
        <div className="p-4 bg-gradient-to-r from-gray-950 via-slate-900 to-blue-950 text-white flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/80 rounded-xl text-amber-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  ਰੋਜ਼ਾਨਾ ਸਰਕਾਰੀ ਖਰੀਦ ਸ਼ੀਟ & PDF / ਪ੍ਰਿੰਟ
                </h3>
                <span className="text-[10px] bg-amber-400 text-blue-950 font-black px-2 py-0.5 rounded-full">
                  DAILY PURCHASE SHEET
                </span>
              </div>
              <p className="text-[11px] text-gray-300">
                ਇੱਕੋ ਮਿਤੀ ਦੀਆਂ ਸਾਰੀਆਂ ਐਂਟਰੀਆਂ, ਬਾਰਦਾਨਾ ਵੇਰਵਾ (ਨਵਾਂ+ਪੁਰਾਣਾ), MSP ਰੇਟ, ਫਰਮ ਦੀ ਮੋਹਰ ਤੇ ਦਸਤਖ਼ਤ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-blue-950 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              title="A4 ਪੇਪਰ 'ਤੇ ਪ੍ਰਿੰਟ ਕਰੋ"
            >
              <Printer className="w-4 h-4" />
              <span>ਪ੍ਰਿੰਟ ਕਰੋ (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
              title="ਸਿੱਧੀ PDF ਫਾਈਲ ਡਾਊਨਲੋਡ ਕਰੋ"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>PDF ਬਣ ਰਹੀ ਹੈ...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>PDF ਡਾਊਨਲੋਡ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================= FILTER CONTROLS BAR (PRINT:HIDDEN) ======================= */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs print:hidden">
          
          {/* 1. Firm Selection */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">ਆੜ੍ਹਤ ਫਰਮ ਚੁਣੋ (Arhtia Firm):</label>
            <select
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              {ARHTIA_FIRMS.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name} ({firm.lic_number})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Date Selection (Primary Requirement for User) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-700 font-bold">ਖਰੀਦ ਮਿਤੀ (Purchase Date):</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDateFilterMode('daily')}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                    dateFilterMode === 'daily'
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  ਰੋਜ਼ਾਨਾ
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode('all')}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                    dateFilterMode === 'all'
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  ਸਭ
                </button>
              </div>
            </div>
            <input
              type="date"
              disabled={dateFilterMode === 'all'}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full p-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs ${
                dateFilterMode === 'all' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* 3. Mandi Filter */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">ਦਾਣਾ ਮੰਡੀ (Dana Mandi):</label>
            <select
              value={selectedMandi}
              onChange={(e) => setSelectedMandi(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="All">ਸਾਰੀਆਂ ਮੰਡੀਆਂ (All Mandis)</option>
              {MANDI_LOCATIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Agency Filter */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">ਖਰੀਦ ਏਜੰਸੀ (Agency):</label>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="All">ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)</option>
              <option value="Pungrain">Pungrain (ਪਨਗਰੇਨ)</option>
              <option value="Markfed">Markfed (ਮਾਰਕਫੈੱਡ)</option>
              <option value="Punsup">Punsup (ਪਨਸਪ)</option>
              <option value="PSWC">PSWC (ਵੇਅਰਹਾਊਸ)</option>
              <option value="FCI">FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)</option>
            </select>
          </div>

        </div>

        {/* Quick Date Chips Bar (if multiple dates exist) */}
        {availableDates.length > 0 && dateFilterMode === 'daily' && (
          <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center gap-1.5 flex-wrap text-xs print:hidden">
            <span className="text-[11px] font-bold text-blue-900">ਐਂਟਰੀਆਂ ਵਾਲੀਆਂ ਮਿਤੀਆਂ:</span>
            {availableDates.slice(0, 6).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`text-[11px] px-2.5 py-0.5 rounded-lg font-mono font-bold transition cursor-pointer ${
                  selectedDate === d
                    ? 'bg-blue-800 text-white shadow-xs'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-100'
                }`}
              >
                {d.split('-').reverse().join('/')}
              </button>
            ))}
          </div>
        )}

        {/* ======================= PRINTABLE SHEET VIEWPORT ======================= */}
        <div className="p-3 sm:p-6 bg-gray-200 print:bg-white flex justify-center">
          
          <div
            id="agency-purchase-sheet"
            ref={sheetPrintRef}
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-gray-900 p-6 sm:p-8 relative flex flex-col justify-between border border-gray-300 shadow-xl print:shadow-none print:border-none print:p-4"
            style={{
              fontFamily: "'Noto Sans Gurmukhi', 'Gurmukhi MN', Georgia, serif",
            }}
          >
            
            {/* TOP HEADER SECTION */}
            <div className="space-y-3">
              
              {/* 1. Religious Inscription Top Center */}
              <div className="text-center border-b border-gray-300 pb-1">
                <span className="text-xs sm:text-sm font-bold tracking-widest text-gray-900">
                  ॥ ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ ॥
                </span>
              </div>

              {/* 2. Main Firm Letterhead Header */}
              <div className="text-center space-y-1 pb-2">
                <div className="text-[10px] sm:text-xs font-bold tracking-widest text-blue-900 uppercase">
                  ਪੰਜਾਬ ਰਾਜ ਖੇਤੀਬਾੜੀ ਮੰਡੀਕਰਨ ਬੋਰਡ ਅਧੀਨ ਕਮਿਸ਼ਨ ਏਜੰਟ (ਆੜ੍ਹਤੀਆ)
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight leading-tight uppercase">
                  {currentFirm.name}
                </h1>

                <div className="text-xs sm:text-sm font-bold text-gray-800">
                  {currentFirm.name === 'JAMMU TRADING CO.' ? 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ' : 'ਨਿਊ ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ'} 
                  <span className="text-gray-500 font-normal"> (ਕਮਿਸ਼ਨ ਏਜੰਟ ਤੇ ਅਨਾਜ ਵਪਾਰੀ)</span>
                </div>

                {/* Firm Details Strip */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-gray-800 pt-1">
                  <span><strong>ਮੰਡੀ:</strong> {selectedMandi === 'All' ? currentFirm.address : selectedMandi}</span>
                  <span>•</span>
                  <span><strong>ਲਾਈਸੰਸ ਨੰ:</strong> <span className="font-mono font-bold">{currentFirm.lic_number}</span></span>
                  <span>•</span>
                  <span><strong>PAN:</strong> <span className="font-mono">{currentFirm.pan_number}</span></span>
                  <span>•</span>
                  <span><strong>ਮੋਬਾਈਲ:</strong> <span className="font-mono font-bold">{currentFirm.mobile}</span></span>
                  {currentFirm.proprietor && (
                    <>
                      <span>•</span>
                      <span className="text-blue-950 font-bold">{currentFirm.proprietor}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Document Title Bar */}
              <div className="bg-gray-900 text-white py-1.5 px-3 rounded-lg text-center flex items-center justify-between flex-wrap gap-2 shadow-2xs">
                <span className="text-xs sm:text-sm font-black tracking-wide">
                  ਰੋਜ਼ਾਨਾ ਸਰਕਾਰੀ ਖਰੀਦ ਵੇਰਵਾ ਸ਼ੀਟ (DAILY AGENCY PURCHASE SHEET)
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-300">
                  ਮਿਤੀ: {dateFilterMode === 'daily' ? formattedDisplayDate : 'ਸਮੂਹ ਮਿਤੀਆਂ'}
                </span>
              </div>

              {/* 4. Common Procurement Parameters (One Single Place for MSP Rate, Agency, and Crop) */}
              {/* As explicitly requested: "Upar ik jagah MSP Rate and ik Jagah hi agency name" */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-blue-50/90 border border-blue-200 rounded-xl p-2.5 text-xs text-gray-900">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 font-bold">ਖਰੀਦ ਏਜੰਸੀ (Agency):</span>
                  <span className="font-bold text-blue-950 bg-white px-2 py-0.5 rounded border border-blue-200 font-mono">
                    {displayAgency}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 justify-start sm:justify-center">
                  <span className="text-gray-600 font-bold">ਸਰਕਾਰੀ MSP ਰੇਟ:</span>
                  <span className="font-black text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono">
                    {displayRate} / ਕੁਇੰਟਲ
                  </span>
                </div>

                <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                  <span className="text-gray-600 font-bold">ਫਸਲ (Crop):</span>
                  <span className="font-bold text-gray-950 bg-white px-2 py-0.5 rounded border border-gray-300">
                    {displayVariety}
                  </span>
                </div>
              </div>

            </div>

            {/* ======================= MAIN TABLE (CLEAN, SAFE, SIMPLE) ======================= */}
            <div className="my-3 flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-900 border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-950 font-bold border-b-2 border-gray-900 divide-x divide-gray-900">
                    <th className="py-2.5 px-2 text-center w-10">ਲੜੀ (Sr)</th>
                    <th className="py-2.5 px-3">ਕਿਸਾਨ ਦਾ ਨਾਮ, ਪਿਤਾ ਦਾ ਨਾਮ ਤੇ ਪਿੰਡ (Farmer Details)</th>
                    <th className="py-2.5 px-2.5 text-center">
                      ਬਾਰਦਾਨਾ ਵੇਰਵਾ (ਨਵਾਂ / ਪੁਰਾਣਾ)
                      <span className="block text-[9px] font-normal text-gray-600">New (A) + Old (B)</span>
                    </th>
                    <th className="py-2.5 px-2.5 text-right font-mono">ਕੁੱਲ ਗੱਟੇ (Bags)</th>
                    <th className="py-2.5 px-2.5 text-right font-mono">ਵਜ਼ਨ (ਕੁਇੰਟਲ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-400 italic text-xs">
                        ਚੁਣੀ ਹੋਈ ਮਿਤੀ ({formattedDisplayDate}) ਅਤੇ ਫਰਮ ਲਈ ਕੋਈ ਖਰੀਦ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((item, index) => {
                      const fatherName = item.father_husband_name || '-';
                      const village = item.address_village || item.village || '-';
                      const newB = Number(item.new_jute_bags) || 0;
                      const oldB = Number(item.old_jute_bags) || 0;
                      const totB = Number(item.total_bags) || (newB + oldB);
                      const weightQtl = Number(item.weight_quintals) || 0;
                      
                      // Only show the single selected farmer's name
                      const displayedFarmerName = item.billed_to_name || item.farmer_name;

                      // Format Bardana string as requested: "Jive Himmat singh 200 old 300 new bags and Total bags 500 eda"
                      let bardanaStr = '';
                      if (newB > 0 && oldB > 0) {
                        bardanaStr = `${newB} ਨਵਾਂ (A) + ${oldB} ਪੁਰਾਣਾ (B)`;
                      } else if (newB > 0) {
                        bardanaStr = `${newB} ਨਵਾਂ (A-Class)`;
                      } else if (oldB > 0) {
                        bardanaStr = `${oldB} ਪੁਰਾਣਾ (B-Class)`;
                      } else {
                        bardanaStr = `${totB} ਗੱਟੇ`;
                      }

                      return (
                        <tr key={item.id} className="divide-x divide-gray-300 text-gray-900 hover:bg-gray-50/50">
                          {/* 1. Sr No */}
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-gray-800">
                            {index + 1}
                          </td>

                          {/* 2. Farmer Name & Details (Only single selected farmer) */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-gray-950 text-xs">
                              {displayedFarmerName}
                            </div>
                            <div className="text-[11px] text-gray-600 font-medium">
                              ਪਿਤਾ: ਸ. {fatherName} &bull; ਪਿੰਡ: {village}
                            </div>
                          </td>

                          {/* 3. Bardana Breakdown (New + Old) */}
                          <td className="py-2.5 px-2.5 text-center font-medium text-xs">
                            <span className="inline-block px-2.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-900 font-mono">
                              {bardanaStr}
                            </span>
                          </td>

                          {/* 4. Total Bags */}
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-gray-950 text-xs">
                            {totB}
                          </td>

                          {/* 5. Weight (Qtl) */}
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-gray-950 text-xs">
                            {weightQtl.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* ======================= GRAND TOTAL ROW ======================= */}
                {filteredEntries.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-900 divide-x divide-gray-900 text-gray-950">
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                        ਕੁੱਲ ਜੋੜ (Grand Total - {filteredEntries.length} ਕਿਸਾਨ):
                      </td>
                      <td className="py-2.5 px-2 text-center text-xs font-mono">
                        {totalNewBags > 0 || totalOldBags > 0 ? (
                          <span>ਨਵਾਂ: <strong>{totalNewBags}</strong> | ਪੁਰਾਣਾ: <strong>{totalOldBags}</strong></span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-xs font-black">
                        {totalBags} ਗੱਟੇ
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-xs font-black">
                        {totalWeight.toFixed(2)} ਕੁਇੰਟਲ
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* ======================= FOOTER: FIRM OFFICIAL STAMP (MOHAR) & SIGNATURES ======================= */}
            {/* As explicitly requested: "ik Friam di Mohar ve ve Friam agency Purchase di enty karde time select kite c and Bilkul normal Shot Size ve Sing jiss ve Frim nu select kita ode Pro de" */}
            <div className="pt-4 border-t-2 border-gray-900 space-y-4">
              
              <div className="grid grid-cols-12 gap-4 items-end">
                
                {/* 1. Left: Farmer / Representative Sign */}
                <div className="col-span-4 text-center space-y-1">
                  <div className="h-12 flex items-end justify-center">
                    <div className="border-b border-dashed border-gray-400 w-36 pb-1 text-[10px] text-gray-400 italic">
                      (ਕਿਸਾਨ / ਮੁਖਤਿਆਰ)
                    </div>
                  </div>
                  <div className="text-xs font-bold text-gray-800">
                    ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ / ਅੰਗੂਠਾ
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Farmer's Signature
                  </div>
                </div>

                {/* 2. Center: Procurement Inspector Sign */}
                <div className="col-span-4 text-center space-y-1">
                  <div className="h-12 flex items-end justify-center">
                    <div className="border-b border-dashed border-gray-400 w-40 pb-1 text-[10px] text-gray-400 italic">
                      (ਮੋਹਰ ਤੇ ਦਸਤਖ਼ਤ)
                    </div>
                  </div>
                  <div className="text-xs font-bold text-gray-800">
                    ਖਰੀਦ ਇੰਸਪੈਕਟਰ ({displayAgency.split(' ')[0]})
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Procurement Inspector Sign
                  </div>
                </div>

                {/* 3. Right: Official Firm Rubber Stamp (ਮੋਹਰ) & Short Proprietor Signature */}
                <div className="col-span-4 flex flex-col items-center justify-end text-center space-y-1.5">
                  
                  {/* Official Firm Rubber Stamp (ਮੋਹਰ) */}
                  <div className="relative inline-flex items-center justify-center p-2 rounded-2xl border-2 border-dashed border-indigo-900/80 bg-indigo-50/40 text-indigo-950 shadow-2xs rotate-[-1deg]">
                    <div className="border border-indigo-900/60 rounded-xl px-3 py-1.5 text-center">
                      <div className="text-[9px] font-black tracking-tight text-indigo-900 uppercase">
                        ★ {currentFirm.name} ★
                      </div>
                      <div className="text-[8px] font-bold font-mono text-indigo-800">
                        LIC NO: {currentFirm.lic_number}
                      </div>
                      <div className="text-[7.5px] font-bold text-indigo-900 uppercase tracking-tighter">
                        COMMISSION AGENT • DANA MANDI
                      </div>
                    </div>
                  </div>

                  {/* Short Signature Line */}
                  <div className="w-full pt-1">
                    <div className="border-b border-gray-700 w-36 mx-auto pb-0.5"></div>
                    <div className="text-xs font-black text-gray-950 mt-1">
                      {currentFirm.proprietor || 'PROPRIETOR'}
                    </div>
                    <div className="text-[10px] font-bold text-blue-950">
                      ਵਾਸਤੇ: {currentFirm.name}
                    </div>
                    <div className="text-[9px] text-gray-500">
                      (ਅਧਿਕਾਰਤ ਹਸਤਾਖਰ / Authorized Signatory)
                    </div>
                  </div>

                </div>

              </div>

              {/* Bottom Copyright and Verification Note */}
              <div className="pt-2 border-t border-gray-200 text-center flex items-center justify-between text-[9px] text-gray-500">
                <span>
                  ਰਿਕਾਰਡ ਤਿਆਰ ਕੀਤਾ ਗਿਆ KisanMitra ERP ਦੁਆਰਾ &bull; ਮਿਤੀ: {new Date().toLocaleDateString('en-IN')}
                </span>
                <span>
                  ਫਰਮ: {currentFirm.name} (ਲਾਈਸੰਸ: {currentFirm.lic_number}) &bull; ਦਾਣਾ ਮੰਡੀ
                </span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
