import React, { useRef, useState } from 'react';
import { LiftingDispatchEntry, ARHTIA_FIRMS } from '../types/mandi';
import { 
  Printer, 
  Download, 
  X, 
  Truck, 
  Share2, 
  Building, 
  Calendar, 
  Clock, 
  Scale, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Image as ImageIcon,
  Loader2,
  Wheat,
  ShieldCheck,
  Check
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

interface SingleTruckGatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LiftingDispatchEntry | null;
}

export const SingleTruckGatePassModal: React.FC<SingleTruckGatePassModalProps> = ({
  isOpen,
  onClose,
  entry,
}) => {
  const gatePassRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'jpg' | 'share' | null>(null);
  const [activeCopy, setActiveCopy] = useState<'mandi' | 'driver' | 'sheller' | 'all'>('mandi');

  if (!isOpen || !entry) return null;

  // Calculate detailed bags and weights
  const totalBags = entry.bags_lifted || 0;
  const aClassBags = entry.new_bags || (entry.bag_category === 'new' ? totalBags : entry.bag_category === 'old' ? 0 : Math.round(totalBags / 2));
  const bClassBags = entry.old_bags || (entry.bag_category === 'old' ? totalBags : entry.bag_category === 'new' ? 0 : Math.floor(totalBags / 2));
  const autoWeightQtl = entry.weight_quintals || Number((totalBags * 0.375).toFixed(2));
  const totalWeightKg = Math.round(autoWeightQtl * 100);
  const aClassQtl = Number((aClassBags * 0.375).toFixed(2));
  const bClassQtl = Number((bClassBags * 0.375).toFixed(2));
  const pendingYardQtl = Number(((entry.pending_yard_bags || 0) * 0.375).toFixed(2));
  const isDelivered = entry.delivery_status === 'Delivered';

  // Format date and time
  const formattedDateTime = entry.date_time 
    ? new Date(entry.date_time).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : new Date().toLocaleString('en-IN');

  const copyTitle = 
    activeCopy === 'mandi' ? 'ਮੰਡੀ ਆੜ੍ਹਤੀਆ ਕਾਪੀ (Mandi Office Copy)' :
    activeCopy === 'driver' ? 'ਡਰਾਈਵਰ / ਟਰਾਂਸਪੋਰਟਰ ਕਾਪੀ (Driver Copy)' :
    activeCopy === 'sheller' ? 'ਸ਼ੈਲਰ / ਰਾਈਸ ਮਿੱਲ ਕਾਪੀ (Sheller Copy)' :
    'ਅਧਿਕਾਰਤ ਗੇਟ ਪਾਸ (Official Gate Pass)';

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // 100% Perfect Single A4 Page PDF Download Handler
  const handleDownloadPdf = async () => {
    if (!gatePassRef.current) return;
    setIsExporting('pdf');
    try {
      const element = gatePassRef.current;
      const dataUrl = await toJpeg(element, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // A4 Dimensions: 210 x 297 mm
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8; // 8mm margin
      const maxAvailableWidth = pageWidth - (margin * 2); // 194mm
      const maxAvailableHeight = pageHeight - (margin * 2); // 281mm

      const elementHeight = element.offsetHeight || 1;
      const elementWidth = element.offsetWidth || 1;
      const aspectRatio = elementWidth / elementHeight;

      // Scale strictly to fit within single A4 page
      let renderWidth = maxAvailableWidth;
      let renderHeight = renderWidth / aspectRatio;

      if (renderHeight > maxAvailableHeight) {
        renderHeight = maxAvailableHeight;
        renderWidth = renderHeight * aspectRatio;
      }

      const posX = (pageWidth - renderWidth) / 2;
      const posY = (pageHeight - renderHeight) / 2;

      pdf.addImage(dataUrl, 'JPEG', posX, posY, renderWidth, renderHeight);

      const cleanTruck = (entry.truck_number || 'Truck').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanChallan = (entry.challan_no || 'CH').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`GatePass_${cleanChallan}_${cleanTruck}_A4.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('PDF ਬਣਾਉਣ ਵਿੱਚ ਗਲਤੀ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਿੰਟ ਬਟਨ ਵਰਤੋ।');
    } finally {
      setIsExporting(null);
    }
  };

  // Download High-Res JPG Image Handler
  const handleDownloadJpg = async () => {
    if (!gatePassRef.current) return;
    setIsExporting('jpg');
    try {
      const element = gatePassRef.current;
      const dataUrl = await toJpeg(element, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const cleanTruck = (entry.truck_number || 'Truck').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanChallan = (entry.challan_no || 'CH').replace(/[^a-zA-Z0-9]/g, '_');
      const link = document.createElement('a');
      link.download = `GatePass_${cleanChallan}_${cleanTruck}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating JPG:', err);
      alert('JPG ਫੋਟੋ ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ।');
    } finally {
      setIsExporting(null);
    }
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    const text = `🚚 *ਮੰਡੀ ਲਿਫਟਿੰਗ ਗੇਟ ਪਾਸ ਤੇ ਚਲਾਨ (Gate Pass)*
*ਚਲਾਨ ਨੰਬਰ:* ${entry.challan_no}
*ਫਰਮ:* ${entry.firm_name}
*ਦਾਣਾ ਮੰਡੀ:* ${entry.mandi_name}
-----------------------------
*ਟਰੱਕ ਨੰਬਰ:* ${entry.truck_number}
*ਡਰਾਈਵਰ:* ${entry.driver_name || 'N/A'} (ਮੋਬਾਈਲ: ${entry.driver_mobile || 'N/A'})
*ਰਵਾਨਗੀ ਮਿਤੀ ਤੇ ਸਮਾਂ:* ${formattedDateTime}
-----------------------------
*ਖਰੀਦ ਏਜੰਸੀ:* ${entry.purchasing_agency}
*ਫਸਲ ਦੀ ਕਿਸਮ:* ${entry.crop_variety || entry.crop_type || 'Paddy Grade A'}
*ਮੰਜ਼ਿਲ ਸ਼ੈਲਰ:* ${entry.seller_sheller_name}
*ਗੋਦਾਮ / ਪਲਾਂਟ:* ${entry.destination_godown || entry.seller_sheller_name}
-----------------------------
*ਗੱਟਿਆਂ ਦਾ ਪੂਰਾ ਵੇਰਵਾ:*
• ਏ-ਕਲਾਸ ਨਵੇਂ ਗੱਟੇ: ${aClassBags} Bags (${aClassQtl} Qtl)
• ਬੀ-ਕਲਾਸ ਪੁਰਾਣੇ ਗੱਟੇ: ${bClassBags} Bags (${bClassQtl} Qtl)
👉 *ਕੁੱਲ ਲੱਦੇ ਗੱਟੇ:* ${totalBags} Bags
👉 *ਕੁੱਲ ਵਜ਼ਨ:* ${autoWeightQtl} ਕੁਇੰਟਲ (${totalWeightKg.toLocaleString('en-IN')} ਕਿੱਲੋ)
• ਫੜ੍ਹ ਵਿੱਚ ਬਾਕੀ ਸਟਾਕ: ${entry.pending_yard_bags || 0} Bags (${pendingYardQtl} Qtl)
-----------------------------
*ਸਥਿਤੀ:* ${isDelivered ? '✓ ਸ਼ੈਲਰ ਪਹੁੰਚ ਗਿਆ (Delivered)' : '⏳ ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ (In Transit)'}
${entry.delivery_notes ? `*ਨੋਟਸ:* ${entry.delivery_notes}\n` : ''}-----------------------------
JAMMU TRADING CO. & NEW JAMMU TRADING CO.
ਸੰਪਰਕ: ${ARHTIA_FIRMS[0].mobile}, ${ARHTIA_FIRMS[1].mobile}`;

    const encoded = encodeURIComponent(text);
    const targetPhone = entry.driver_mobile ? entry.driver_mobile.replace(/\D/g, '') : '';
    const url = targetPhone.length >= 10 
      ? `https://wa.me/91${targetPhone}?text=${encoded}` 
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Dedicated CSS to guarantee 100% Perfect Single-Page A4 Printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything on the page except the gatepass container */
          body * {
            visibility: hidden !important;
          }

          #single-truck-gatepass-printable,
          #single-truck-gatepass-printable * {
            visibility: visible !important;
          }

          #single-truck-gatepass-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8px 12px !important;
            box-shadow: none !important;
            border: 1.5px solid #000000 !important;
            border-radius: 4px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Force compact height rules for 1-page fit */
          .print-compact-gap {
            gap: 6px !important;
          }
          .print-compact-p {
            padding: 6px !important;
          }
          .print-compact-mb {
            margin-bottom: 6px !important;
          }
          .print-compact-space > * + * {
            margin-top: 6px !important;
          }
        }
      `}</style>

      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-gray-300 overflow-hidden my-auto max-h-[96vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-h-none print:rounded-none print:static"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden border-b border-purple-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-purple-950 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm text-amber-300">
                  ਟਰੱਕ ਲਿਫਟਿੰਗ ਗੇਟ ਪਾਸ (A4 Single-Page Slip)
                </h3>
                <span className="bg-purple-800 text-purple-200 px-2 py-0.5 rounded text-[10.5px] font-mono font-bold">
                  {entry.challan_no}
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded text-[10.5px] font-mono font-black">
                  {entry.truck_number}
                </span>
              </div>
              <p className="text-[11px] text-purple-200 mt-0.5">
                ਇਹ ਗੇਟ ਪਾਸ ਪ੍ਰਿੰਟ ਅਤੇ PDF ਵਿੱਚ ਪੂਰੇ A4 ਪੇਜ ਉੱਤੇ 100% ਪਰਫੈਕਟ ਫਿੱਟ ਆਵੇਗਾ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
            {/* Copy Selector Buttons */}
            <div className="hidden md:flex items-center bg-purple-900/80 p-0.5 rounded-lg border border-purple-700 text-[10.5px] font-bold mr-1">
              <button
                type="button"
                onClick={() => setActiveCopy('mandi')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  activeCopy === 'mandi' ? 'bg-amber-400 text-purple-950 shadow-xs' : 'text-purple-200 hover:text-white'
                }`}
              >
                ਮੰਡੀ ਕਾਪੀ
              </button>
              <button
                type="button"
                onClick={() => setActiveCopy('driver')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  activeCopy === 'driver' ? 'bg-amber-400 text-purple-950 shadow-xs' : 'text-purple-200 hover:text-white'
                }`}
              >
                ਡਰਾਈਵਰ
              </button>
              <button
                type="button"
                onClick={() => setActiveCopy('sheller')}
                className={`px-2 py-1 rounded transition cursor-pointer ${
                  activeCopy === 'sheller' ? 'bg-amber-400 text-purple-950 shadow-xs' : 'text-purple-200 hover:text-white'
                }`}
              >
                ਸ਼ੈਲਰ
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-purple-950 font-black rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
              title="ਗੇਟ ਪਾਸ ਪ੍ਰਿੰਟ ਕਰੋ (ਪੂਰਾ A4 ਪੇਜ 'ਤੇ ਫਿੱਟ)"
            >
              <Printer className="w-3.5 h-3.5 text-purple-950" />
              <span>🖨️ A4 ਪ੍ਰਿੰਟ</span>
            </button>

            {/* PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting !== null}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title="ਸਿੰਗਲ A4 ਪੇਜ PDF ਫਾਈਲ ਡਾਊਨਲੋਡ ਕਰੋ"
            >
              {isExporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" /> : <Download className="w-3.5 h-3.5 text-amber-300" />}
              <span>📄 A4 PDF</span>
            </button>

            {/* JPG Button */}
            <button
              type="button"
              onClick={handleDownloadJpg}
              disabled={isExporting !== null}
              className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title="ਗੇਟ ਪਾਸ ਦੀ ਫੋਟੋ ਡਾਊਨਲੋਡ ਕਰੋ"
            >
              {isExporting === 'jpg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 text-amber-300" />}
              <span>📸 JPG</span>
            </button>

            {/* WhatsApp Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
              title="ਡਰਾਈਵਰ ਜਾਂ ਸ਼ੈਲਰ ਨੂੰ WhatsApp 'ਤੇ ਭੇਜੋ"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer ml-1"
              title="ਬੰਦ ਕਰੋ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Canvas for Screen View */}
        <div className="p-3 sm:p-5 overflow-y-auto bg-slate-100 flex-1 print:bg-white print:p-0 print:overflow-visible">
          
          {/* ============================================================== */}
          {/* PERFECT SINGLE A4 PAGE PRINTABLE GATE PASS SLIP CONTAINER     */}
          {/* ============================================================== */}
          <div 
            ref={gatePassRef}
            id="single-truck-gatepass-printable"
            className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-purple-900/50 shadow-md text-gray-950 max-w-[780px] mx-auto space-y-2.5 print:border-2 print:border-black print:rounded-none print:shadow-none print:p-3 print:max-w-none print:space-y-2"
          >
            {/* 1. Dual Firm Mandi Header */}
            <div className="border-b-2 border-purple-950/80 pb-2 text-center space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-gray-600 flex-wrap gap-1">
                <span className="bg-purple-50 text-purple-950 px-2 py-0.5 rounded border border-purple-200">
                  ਲਾਈਸੰਸ: {ARHTIA_FIRMS[0]?.lic_number}
                </span>
                <span className="bg-amber-400 text-purple-950 font-black px-3 py-0.5 rounded-full text-[10.5px] uppercase tracking-wider shadow-2xs">
                  {copyTitle}
                </span>
                <span className="bg-purple-50 text-purple-950 px-2 py-0.5 rounded border border-purple-200">
                  ਲਾਈਸੰਸ: {ARHTIA_FIRMS[1]?.lic_number}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight uppercase">
                JAMMU TRADING CO. & NEW JAMMU TRADING CO.
              </h1>
              
              <div className="flex items-center justify-center gap-3 text-[11px] text-gray-800 font-bold flex-wrap">
                <span>ਕਮਿਸ਼ਨ ਏਜੰਟ (ਆੜ੍ਹਤੀਏ)</span>
                <span>•</span>
                <span>ਦਾਣਾ ਮੰਡੀ: <b>{entry.mandi_name || 'ਕਮਾਲਪੁਰ / ਮਹਿਰਾਜਵਾਲਾ'} (ਪੰਜਾਬ)</b></span>
                <span>•</span>
                <span>ਮੋਬਾਈਲ: <b>{ARHTIA_FIRMS[0]?.mobile}, {ARHTIA_FIRMS[1]?.mobile}</b></span>
              </div>

              <div className="pt-1 border-t border-purple-200/70 flex items-center justify-between text-[10.5px] font-bold text-purple-950 flex-wrap gap-1">
                <span className="bg-purple-100 text-purple-950 px-2 py-0.5 rounded border border-purple-300">
                  🌾 ਅਧਿਕਾਰਤ ਟਰੱਕ ਲਿਫਟਿੰਗ ਗੇਟ ਪਾਸ ਤੇ ਰਵਾਨਗੀ ਚਲਾਨ (GATE PASS)
                </span>
                <span className="text-gray-600">
                  ਸੀਜ਼ਨ: <b>ਪੈਡੀ ਸੀਜ਼ਨ 2025-26</b> | ਸਿਸਟਮ ID: <b className="font-mono text-purple-900">{entry.id}</b>
                </span>
              </div>
            </div>

            {/* 2. Primary 4-Badges Identification Strip */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-purple-50/80 border border-purple-200 rounded-xl">
                <span className="text-[9.5px] text-gray-500 font-bold block uppercase leading-none">ਚਲਾਨ / ਗੇਟ ਪਾਸ ਨੰ.</span>
                <span className="font-mono font-black text-purple-950 text-xs sm:text-sm block mt-1">
                  {entry.challan_no}
                </span>
              </div>

              <div className="p-2 bg-amber-50/90 border border-amber-300 rounded-xl">
                <span className="text-[9.5px] text-amber-900 font-bold block uppercase leading-none">ਟਰੱਕ / ਗੱਡੀ ਨੰਬਰ</span>
                <span className="font-mono font-black text-amber-950 text-xs sm:text-sm block mt-1 tracking-wider">
                  {entry.truck_number}
                </span>
              </div>

              <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-xl">
                <span className="text-[9.5px] text-blue-900 font-bold block uppercase leading-none">ਰਵਾਨਗੀ ਮਿਤੀ ਤੇ ਸਮਾਂ</span>
                <span className="font-mono font-bold text-gray-900 text-[10.5px] block mt-1 truncate">
                  {formattedDateTime}
                </span>
              </div>

              <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <span className="text-[9.5px] text-emerald-900 font-bold block uppercase leading-none">ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀ</span>
                <span className="font-bold text-emerald-950 text-[11px] block mt-1 truncate">
                  {entry.purchasing_agency}
                </span>
              </div>
            </div>

            {/* 3. Three Detailed Info Sections (Truck/Driver, Commodity/Agency, Destination/Sheller) */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              
              {/* Section 1: Vehicle & Driver (ਵਾਹਨ ਤੇ ਡਰਾਈਵਰ) */}
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <h4 className="font-bold text-purple-950 pb-0.5 border-b border-gray-200 flex items-center gap-1 uppercase text-[10px]">
                  <Truck className="w-3 h-3 text-purple-800" />
                  <span>1. ਵਾਹਨ ਤੇ ਚਾਲਕ</span>
                </h4>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਟਰੱਕ ਨੰਬਰ:</span>
                    <span className="font-mono font-black text-gray-950">{entry.truck_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਡਰਾਈਵਰ:</span>
                    <span className="font-bold text-gray-900 truncate max-w-[100px]">{entry.driver_name || 'ਦਰਜ ਨਹੀਂ'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਮੋਬਾਈਲ:</span>
                    <span className="font-mono font-bold text-gray-900">{entry.driver_mobile || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਸ਼੍ਰੇਣੀ:</span>
                    <span className="text-gray-800 font-medium">ਗੁੱਡਜ਼ ਟਰੱਕ</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Commodity & Arhtia Firm (ਜਿਣਸ ਤੇ ਆੜ੍ਹਤ) */}
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <h4 className="font-bold text-purple-950 pb-0.5 border-b border-gray-200 flex items-center gap-1 uppercase text-[10px]">
                  <Wheat className="w-3 h-3 text-amber-600" />
                  <span>2. ਜਿਣਸ ਤੇ ਆੜ੍ਹਤ</span>
                </h4>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਆੜ੍ਹਤੀਆ ਫਰਮ:</span>
                    <span className="font-bold text-gray-900 truncate max-w-[120px]">{entry.firm_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਦਾਣਾ ਮੰਡੀ:</span>
                    <span className="font-bold text-gray-900">{entry.mandi_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਫਸਲ:</span>
                    <span className="font-bold text-amber-950">{entry.crop_type || 'ਝੋਨਾ (Paddy)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਕਿਸਮ:</span>
                    <span className="font-bold text-amber-900 font-mono bg-amber-100 px-1 rounded">
                      {entry.crop_variety || 'PR-126'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Destination & Sheller (ਮੰਜ਼ਿਲ ਤੇ ਸ਼ੈਲਰ) */}
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <h4 className="font-bold text-purple-950 pb-0.5 border-b border-gray-200 flex items-center gap-1 uppercase text-[10px]">
                  <Building className="w-3 h-3 text-blue-700" />
                  <span>3. ਮੰਜ਼ਿਲ ਤੇ ਸ਼ੈਲਰ</span>
                </h4>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਸ਼ੈਲਰ ਦਾ ਨਾਮ:</span>
                    <span className="font-bold text-blue-950 truncate max-w-[120px]">{entry.seller_sheller_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਗੋਦਾਮ / ਪਲਾਂਟ:</span>
                    <span className="font-medium text-gray-900 truncate max-w-[120px]">{entry.destination_godown || entry.seller_sheller_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਲਿਫਟਿੰਗ ਕਿਸਮ:</span>
                    <span className="font-bold text-gray-900">{entry.lifting_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ਸਥਿਤੀ:</span>
                    <span className={`font-bold px-1 rounded ${
                      isDelivered ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'
                    }`}>
                      {isDelivered ? '✓ ਸ਼ੈਲਰ ਪਹੁੰਚਿਆ' : '⏳ ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* 4. Loaded Bags and Weights Micro-Breakdown Table */}
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-0.5 border-b border-gray-200">
                <h4 className="font-black text-[10.5px] text-purple-950 flex items-center gap-1 uppercase">
                  <Scale className="w-3.5 h-3.5 text-purple-800" />
                  <span>ਗੱਟਿਆਂ ਤੇ ਵਜ਼ਨ ਦਾ ਸੰਪੂਰਨ ਹਿਸਾਬ (Loaded Bags & Weight Micro-Breakdown)</span>
                </h4>
                <span className="font-mono font-bold text-[10.5px] text-emerald-900">
                  ਕੁੱਲ ਲੱਦਿਆ ਵਜ਼ਨ: <b>{autoWeightQtl} ਕੁਇੰਟਲ</b>
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-300">
                <table className="w-full text-left text-[10.5px]">
                  <thead className="bg-purple-50 text-purple-950 font-bold border-b border-purple-200">
                    <tr>
                      <th className="py-1 px-2.5">ਲੜੀ</th>
                      <th className="py-1 px-2.5">ਬਾਰਦਾਨਾ ਸ਼੍ਰੇਣੀ (Bag Category)</th>
                      <th className="py-1 px-2.5 text-center">ਪ੍ਰਤੀ ਬੈਗ ਵਜ਼ਨ</th>
                      <th className="py-1 px-2.5 text-center">ਲੱਦੇ ਗੱਟੇ</th>
                      <th className="py-1 px-2.5 text-right">ਕੁੱਲ ਵਜ਼ਨ (ਕਿਲੋ)</th>
                      <th className="py-1 px-2.5 text-right">ਕੁੱਲ ਵਜ਼ਨ (ਕੁਇੰਟਲ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white font-mono text-[10px]">
                    {/* A-Class New Bags */}
                    <tr>
                      <td className="py-1 px-2.5 font-sans text-gray-500">1</td>
                      <td className="py-1 px-2.5 font-sans">
                        <span className="font-bold text-blue-900">ਏ-ਕਲਾਸ ਬਾਰਦਾਨਾ (A-Class New Jute Bags)</span>
                        <span className="text-[9.5px] text-gray-500 block">ਸਰਕਾਰੀ ਏਜੰਸੀ ਦਾ ਨਵਾਂ ਮਾਰਕਾ ਬਾਰਦਾਨਾ</span>
                      </td>
                      <td className="py-1 px-2.5 text-center text-gray-700">37.5 ਕਿਲੋ</td>
                      <td className="py-1 px-2.5 text-center font-bold text-blue-950">{aClassBags.toLocaleString()} ਗੱਟੇ</td>
                      <td className="py-1 px-2.5 text-right text-gray-800">{Math.round(aClassQtl * 100).toLocaleString('en-IN')} kg</td>
                      <td className="py-1 px-2.5 text-right font-bold text-blue-900">{aClassQtl.toFixed(2)} Qtl</td>
                    </tr>

                    {/* B-Class Old Bags */}
                    <tr>
                      <td className="py-1 px-2.5 font-sans text-gray-500">2</td>
                      <td className="py-1 px-2.5 font-sans">
                        <span className="font-bold text-amber-900">ਬੀ-ਕਲਾਸ ਬਾਰਦਾਨਾ (B-Class Once Used Bags)</span>
                        <span className="text-[9.5px] text-gray-500 block">ਇੱਕ ਵਾਰ ਵਰਤਿਆ ਸਾਫ਼ ਬਾਰਦਾਨਾ</span>
                      </td>
                      <td className="py-1 px-2.5 text-center text-gray-700">37.5 ਕਿਲੋ</td>
                      <td className="py-1 px-2.5 text-center font-bold text-amber-950">{bClassBags.toLocaleString()} ਗੱਟੇ</td>
                      <td className="py-1 px-2.5 text-right text-gray-800">{Math.round(bClassQtl * 100).toLocaleString('en-IN')} kg</td>
                      <td className="py-1 px-2.5 text-right font-bold text-amber-900">{bClassQtl.toFixed(2)} Qtl</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-purple-950 text-white font-bold font-mono text-[10.5px]">
                    <tr>
                      <td colSpan={3} className="py-1.5 px-2.5 font-sans text-right">
                        ਕੁੱਲ ਜੋੜ (Grand Total Loaded):
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-black text-amber-300 text-xs">
                        {totalBags.toLocaleString()} ਗੱਟੇ
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-gray-200">
                        {totalWeightKg.toLocaleString('en-IN')} ਕਿਲੋ
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-black text-amber-300 text-xs">
                        {autoWeightQtl.toFixed(2)} ਕੁਇੰਟਲ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Yard Stock & Formula Single-Line Strip */}
              <div className="flex items-center justify-between p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-600 font-semibold">ਮੰਡੀ ਫੜ੍ਹ ਵਿੱਚ ਬਾਕੀ ਸਟਾਕ:</span>
                  <span className="font-mono font-bold text-amber-950 bg-amber-100 px-1.5 py-0.2 rounded">
                    {entry.pending_yard_bags || 0} ਗੱਟੇ ({pendingYardQtl} ਕੁਇੰਟਲ)
                  </span>
                </div>
                <div className="text-gray-500 font-mono text-[9.5px]">
                  ਮਿਆਰੀ ਪੈਮਾਨਾ: 400 ਗੱਟੇ = 150.00 ਕੁਇੰਟਲ (0.375 Qtl/ਬੈਗ)
                </div>
              </div>
            </div>

            {/* 5. Reconciliation Report Strip (Only if delivered) */}
            {isDelivered && (
              <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-0.5">
                  <h4 className="font-bold text-emerald-950 flex items-center gap-1 uppercase text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>ਸ਼ੈਲਰ ਪਹੁੰਚ ਤੇ ਤਸਦੀਕ ਰਿਪੋਰਟ</span>
                  </h4>
                  <span className="text-[9.5px] text-emerald-800 font-mono">
                    ਪਹੁੰਚ ਸਮਾਂ: {entry.delivered_date_time || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                  <div className="p-1 bg-white rounded border border-emerald-200">
                    <span className="text-[9px] text-gray-500 font-sans block">ਸ਼ਾਰਟੇਜ ਗੱਟੇ</span>
                    <span className="font-bold text-red-700">{entry.shortage_bags || 0}</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-emerald-200">
                    <span className="text-[9px] text-gray-500 font-sans block">ਸ਼ਾਰਟੇਜ ਵਜ਼ਨ</span>
                    <span className="font-bold text-red-700">{entry.shortage_quintals || 0} Q</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-emerald-200">
                    <span className="text-[9px] text-gray-500 font-sans block">ਰੱਦ ਗੱਟੇ</span>
                    <span className="font-bold text-red-700">{entry.rejected_bags || 0}</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-emerald-200">
                    <span className="text-[9px] text-gray-500 font-sans block">ਪਾਸ ਸ਼ੁੱਧ ਗੱਟੇ</span>
                    <span className="font-bold text-emerald-900">
                      {Math.max(0, totalBags - (entry.shortage_bags || 0) - (entry.rejected_bags || 0))}
                    </span>
                  </div>
                </div>

                {entry.delivery_notes && (
                  <p className="text-[9.5px] text-emerald-900 italic pt-0.5">
                    <b>ਸ਼ੈਲਰ ਨੋਟਸ:</b> {entry.delivery_notes}
                  </p>
                )}
              </div>
            )}

            {/* 6. Legal Instructions (Compact 3 Bullets) */}
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[9.5px] text-gray-600 leading-snug space-y-0.5">
              <span className="font-bold text-gray-800 block uppercase text-[9.5px]">
                ਜ਼ਰੂਰੀ ਹਦਾਇਤਾਂ (Instructions):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                <div>• ਦਾਣਾ ਮੰਡੀ ਤੋਂ ਮਾਲ ਰਵਾਨਾ ਕਰਨ ਦਾ ਇਹ ਅਧਿਕਾਰਤ ਦਸਤਾਵੇਜ਼ ਹੈ।</div>
                <div>• ਰਸਤੇ ਵਿੱਚ ਮਾਲ ਨੂੰ ਤਰਪਾਲ ਨਾਲ ਢੱਕਣ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਡਰਾਈਵਰ ਦੀ ਹੋਵੇਗੀ।</div>
                <div>• ਸ਼ੈਲਰ ਪਹੁੰਚ ਕੇ ਕਾਂਟਾ ਵਜ਼ਨ ਕਰਵਾ ਕੇ ਰਸੀਵਿੰਗ ਲੈਣੀ ਲਾਜ਼ਮੀ ਹੈ।</div>
                <div>• ਕਿਸੇ ਵੀ ਤੋਟੇ ਦੀ ਸੂਰਤ ਵਿੱਚ ਤੁਰੰਤ ਆੜ੍ਹਤੀਆ ਫਰਮ ਨੂੰ ਫੋਨ ਕਰੋ।</div>
              </div>
            </div>

            {/* 7. Four Official Signatures & Seal Blocks (Sleek, A4-fitted height) */}
            <div className="pt-2 border-t-2 border-gray-300 grid grid-cols-4 gap-2 text-center text-xs text-gray-800 font-bold">
              <div>
                <div className="h-8 border-b-2 border-gray-400 mb-1"></div>
                <span className="text-gray-950 font-black block text-[10px] leading-tight">ਦਸਤਖ਼ਤ ਆੜ੍ਹਤੀਆ</span>
                <span className="text-[8.5px] text-gray-500 font-normal">KisanMitra Official</span>
              </div>

              <div>
                <div className="h-8 border-b-2 border-gray-400 mb-1"></div>
                <span className="text-gray-950 font-black block text-[10px] leading-tight">ਦਸਤਖ਼ਤ / ਅੰਗੂਠਾ ਡਰਾਈਵਰ</span>
                <span className="text-[8.5px] text-gray-500 font-normal">Driver Signature</span>
              </div>

              <div>
                <div className="h-8 border-b-2 border-gray-400 mb-1"></div>
                <span className="text-gray-950 font-black block text-[10px] leading-tight">ਮੰਡੀ ਗੇਟ ਇੰਚਾਰਜ</span>
                <span className="text-[8.5px] text-gray-500 font-normal">Mandi Gate Pass</span>
              </div>

              <div>
                <div className="h-8 border-b-2 border-gray-400 mb-1"></div>
                <span className="text-gray-950 font-black block text-[10px] leading-tight">ਸ਼ੈਲਰ ਰਸੀਵਰ / ਮੁਨੀਮ</span>
                <span className="text-[8.5px] text-gray-500 font-normal">Mill Munim / Stamp</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Actions Bar (Hidden on print) */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-semibold text-[11px]">
              ਗੇਟ ਪਾਸ ਸਥਿਤੀ:
            </span>
            <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
              isDelivered ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'
            }`}>
              {isDelivered ? '✓ ਸ਼ੈਲਰ ਡਿਲੀਵਰੀ ਤਸਦੀਕ' : '⏳ ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ (In Transit)'}
            </span>
            <span className="text-gray-400 text-[10px] hidden sm:inline">
              | A4 ਸਾਈਜ਼: 210 × 297 mm (1 ਪੇਜ ਫਿੱਟ)
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition cursor-pointer text-xs"
            >
              ਬੰਦ ਕਰੋ (Close)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-1.5 bg-purple-900 hover:bg-purple-950 active:scale-95 text-white font-bold rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>ਪ੍ਰਿੰਟ ਕਰੋ (A4 Print)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting !== null}
              className="px-5 py-1.5 bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs"
            >
              {isExporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <Download className="w-4 h-4 text-amber-300" />}
              <span>A4 PDF ਸੇਵ ਕਰੋ</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
