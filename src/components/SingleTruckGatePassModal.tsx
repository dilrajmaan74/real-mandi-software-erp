import React, { useRef, useState, useMemo, useEffect } from 'react';
import { LiftingDispatchEntry, ARHTIA_FIRMS } from '../types/mandi';
import { 
  Printer, 
  Download, 
  X, 
  Truck, 
  Share2, 
  Building, 
  Scale, 
  Wheat, 
  CheckCircle2, 
  Loader2, 
  Check,
  Building2,
  Image as ImageIcon
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

interface SingleTruckGatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LiftingDispatchEntry | null;
  onUpdateEntryFirm?: (entryId: string, newFirmName: string) => void;
}

export const SingleTruckGatePassModal: React.FC<SingleTruckGatePassModalProps> = ({
  isOpen,
  onClose,
  entry,
  onUpdateEntryFirm,
}) => {
  const gatePassRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'pdf' | 'jpg' | 'share' | null>(null);
  const [activeCopy, setActiveCopy] = useState<'mandi' | 'driver' | 'sheller' | 'all'>('mandi');

  // Firm selection state: allows user to select JAMMU TRADING CO., NEW JAMMU TRADING CO., or Both
  const initialFirm = useMemo(() => {
    if (!entry) return 'JAMMU TRADING CO.';
    if (entry.firm_name?.includes('NEW')) return 'NEW JAMMU TRADING CO.';
    if (entry.firm_name?.includes('JAMMU')) return 'JAMMU TRADING CO.';
    return 'All';
  }, [entry]);

  const [selectedFirm, setSelectedFirm] = useState<string>(initialFirm);

  // Sync when entry changes
  useEffect(() => {
    if (entry) {
      if (entry.firm_name?.includes('NEW')) {
        setSelectedFirm('NEW JAMMU TRADING CO.');
      } else if (entry.firm_name?.includes('JAMMU')) {
        setSelectedFirm('JAMMU TRADING CO.');
      } else {
        setSelectedFirm('All');
      }
    }
  }, [entry?.id, entry?.firm_name]);

  if (!isOpen || !entry) return null;

  // Active Firm Details (License, Mobile, Name)
  const firmInfo = useMemo(() => {
    if (selectedFirm === 'JAMMU TRADING CO.') {
      return {
        id: 'FIRM-01',
        name: 'JAMMU TRADING CO.',
        title: 'JAMMU TRADING CO.',
        licNumber: ARHTIA_FIRMS[0].lic_number,
        mobile: ARHTIA_FIRMS[0].mobile,
        pan: ARHTIA_FIRMS[0].pan_number,
        proprietor: ARHTIA_FIRMS[0].proprietor,
        badgeLeft: `ਲਾਈਸੰਸ: ${ARHTIA_FIRMS[0].lic_number}`,
        badgeRight: `ਪ੍ਰੋ: ${ARHTIA_FIRMS[0].proprietor || 'ਹਿੰਮਤ ਸਿੰਘ'}`,
      };
    } else if (selectedFirm === 'NEW JAMMU TRADING CO.') {
      return {
        id: 'FIRM-02',
        name: 'NEW JAMMU TRADING CO.',
        title: 'NEW JAMMU TRADING CO.',
        licNumber: ARHTIA_FIRMS[1].lic_number,
        mobile: ARHTIA_FIRMS[1].mobile,
        pan: ARHTIA_FIRMS[1].pan_number,
        proprietor: undefined,
        badgeLeft: `ਲਾਈਸੰਸ: ${ARHTIA_FIRMS[1].lic_number}`,
        badgeRight: `ਮੋਬਾਈਲ: ${ARHTIA_FIRMS[1].mobile}`,
      };
    } else {
      // Both firms combined
      return {
        id: 'FIRM-BOTH',
        name: 'JAMMU TRADING CO. & NEW JAMMU TRADING CO.',
        title: 'JAMMU TRADING CO. & NEW JAMMU TRADING CO.',
        licNumber: `${ARHTIA_FIRMS[0].lic_number} / ${ARHTIA_FIRMS[1].lic_number}`,
        mobile: `${ARHTIA_FIRMS[0].mobile}, ${ARHTIA_FIRMS[1].mobile}`,
        pan: `${ARHTIA_FIRMS[0].pan_number} / ${ARHTIA_FIRMS[1].pan_number}`,
        proprietor: ARHTIA_FIRMS[0].proprietor,
        badgeLeft: `ਲਾਈਸੰਸ: ${ARHTIA_FIRMS[0].lic_number}`,
        badgeRight: `ਲਾਈਸੰਸ: ${ARHTIA_FIRMS[1].lic_number}`,
      };
    }
  }, [selectedFirm]);

  const handleFirmChange = (newFirm: string) => {
    setSelectedFirm(newFirm);
    if (onUpdateEntryFirm && entry) {
      onUpdateEntryFirm(entry.id, newFirm === 'All' ? 'JAMMU TRADING CO. & NEW JAMMU TRADING CO.' : newFirm);
    }
  };

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

  // 100% Clean Isolated Single A4 Print:
  // Injects ONLY the gate pass into an isolated iframe to guarantee no extra elements,
  // no background leakage, and perfect fit on a single A4 page!
  const handlePrintIsolated = () => {
    const printContent = gatePassRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Collect all styles and stylesheet links from parent document so Tailwind CSS renders identically in iframe
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pa">
      <head>
        <meta charset="utf-8" />
        <title>Gate_Pass_${entry.challan_no}_${entry.truck_number}</title>
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 5mm 6mm;
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 10.5px !important;
            line-height: 1.25 !important;
          }
          .isolated-print-wrapper {
            width: 100% !important;
            max-width: 198mm !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          #single-truck-gatepass-printable {
            border: 2px solid #000000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 10px 12px !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
        </style>
      </head>
      <body>
        <div class="isolated-print-wrapper">
          ${printContent.outerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 150);
          };
        </script>
      </body>
      </html>
    `);
    doc.close();

    // Clean up iframe after printing dialog closes
    setTimeout(() => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {}
    }, 45000);
  };

  // 100% Perfect Single A4 Page PDF Download Handler (Proportional Fit)
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
      const margin = 8;
      const maxAvailableWidth = pageWidth - (margin * 2); // 194mm
      const maxAvailableHeight = pageHeight - (margin * 2); // 281mm

      const elementHeight = element.offsetHeight || 1;
      const elementWidth = element.offsetWidth || 1;
      const aspectRatio = elementWidth / elementHeight;

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
*ਫਰਮ:* ${firmInfo.name}
*ਲਾਈਸੰਸ:* ${firmInfo.licNumber}
*ਚਲਾਨ ਨੰਬਰ:* ${entry.challan_no}
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
${firmInfo.name}
ਸੰਪਰਕ: ${firmInfo.mobile}`;

    const encoded = encodeURIComponent(text);
    const targetPhone = entry.driver_mobile ? entry.driver_mobile.replace(/\D/g, '') : '';
    const url = targetPhone.length >= 10 
      ? `https://wa.me/91${targetPhone}?text=${encoded}` 
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Embedded CSS rules for standard Ctrl+P window print */}
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
            height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything except our printable gate pass */
          body * {
            visibility: hidden !important;
          }

          #single-truck-gatepass-printable,
          #single-truck-gatepass-printable * {
            visibility: visible !important;
          }

          #single-truck-gatepass-printable {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 194mm !important;
            margin: 0 auto !important;
            padding: 8px 12px !important;
            box-shadow: none !important;
            border: 2px solid #000000 !important;
            border-radius: 4px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-gray-300 overflow-hidden my-auto max-h-[96vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-h-none print:rounded-none print:static"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar (Controls, Firm Selector, Print, PDF - Hidden on print) */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white flex flex-col gap-3 shrink-0 print:hidden border-b border-purple-800">
          
          {/* Top Row: Title & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  ਸਿਰਫ਼ ਗੇਟ ਪਾਸ ਦੀ ਹੀ ਜਾਣਕਾਰੀ ਪ੍ਰਿੰਟ ਹੋਵੇਗੀ ਅਤੇ ਪੂਰੇ A4 ਪੇਜ ਉੱਤੇ 100% ਫਿੱਟ ਆਵੇਗੀ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
              {/* Print Button - Isolated 1-Page A4 Print */}
              <button
                type="button"
                onClick={handlePrintIsolated}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-purple-950 font-black rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                title="ਪੂਰੇ A4 ਪੇਜ 'ਤੇ ਫਿੱਟ ਪ੍ਰਿੰਟ ਕਰੋ"
              >
                <Printer className="w-3.5 h-3.5 text-purple-950" />
                <span>🖨️ A4 ਪ੍ਰਿੰਟ</span>
              </button>

              {/* PDF Button - Single Page A4 PDF */}
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

          {/* Bottom Row: FIRM SELECTOR OPTIONS & COPY SELECTOR */}
          <div className="pt-2 border-t border-purple-800/80 flex flex-wrap items-center justify-between gap-2.5">
            
            {/* 1. FIRM SELECTOR (User Request: 'firm selet karan da opation hove') */}
            <div className="flex items-center gap-1.5 bg-purple-900/90 p-1 rounded-xl border border-purple-700 text-xs">
              <span className="text-[10.5px] font-black text-amber-300 px-1.5 flex items-center gap-1 shrink-0">
                <Building2 className="w-3.5 h-3.5" />
                <span>ਆੜ੍ਹਤੀਆ ਫਰਮ ਚੁਣੋ (Select Firm):</span>
              </span>
              
              <button
                type="button"
                onClick={() => handleFirmChange('JAMMU TRADING CO.')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] shrink-0 ${
                  selectedFirm === 'JAMMU TRADING CO.' 
                    ? 'bg-amber-400 text-purple-950 shadow-xs' 
                    : 'text-purple-200 hover:text-white hover:bg-purple-800'
                }`}
              >
                1. JAMMU TRADING CO.
              </button>

              <button
                type="button"
                onClick={() => handleFirmChange('NEW JAMMU TRADING CO.')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] shrink-0 ${
                  selectedFirm === 'NEW JAMMU TRADING CO.' 
                    ? 'bg-amber-400 text-purple-950 shadow-xs' 
                    : 'text-purple-200 hover:text-white hover:bg-purple-800'
                }`}
              >
                2. NEW JAMMU TRADING CO.
              </button>

              <button
                type="button"
                onClick={() => handleFirmChange('All')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-[11px] shrink-0 ${
                  selectedFirm === 'All' 
                    ? 'bg-amber-400 text-purple-950 shadow-xs' 
                    : 'text-purple-200 hover:text-white hover:bg-purple-800'
                }`}
              >
                3. ਦੋਵੇਂ ਫਰਮਾਂ (Both Combined)
              </button>
            </div>

            {/* 2. COPY SELECTOR (Mandi, Driver, Sheller) */}
            <div className="flex items-center bg-purple-900/80 p-1 rounded-xl border border-purple-700 text-[10.5px] font-bold">
              <span className="text-purple-300 px-1.5 hidden sm:inline text-[10px]">ਕਾਪੀ:</span>
              <button
                type="button"
                onClick={() => setActiveCopy('mandi')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  activeCopy === 'mandi' ? 'bg-amber-400 text-purple-950 shadow-xs font-black' : 'text-purple-200 hover:text-white'
                }`}
              >
                ਮੰਡੀ ਕਾਪੀ
              </button>
              <button
                type="button"
                onClick={() => setActiveCopy('driver')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  activeCopy === 'driver' ? 'bg-amber-400 text-purple-950 shadow-xs font-black' : 'text-purple-200 hover:text-white'
                }`}
              >
                ਡਰਾਈਵਰ
              </button>
              <button
                type="button"
                onClick={() => setActiveCopy('sheller')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  activeCopy === 'sheller' ? 'bg-amber-400 text-purple-950 shadow-xs font-black' : 'text-purple-200 hover:text-white'
                }`}
              >
                ਸ਼ੈਲਰ
              </button>
            </div>

          </div>

        </div>

        {/* Scrollable Canvas for Screen View */}
        <div className="p-3 sm:p-5 overflow-y-auto bg-slate-100 flex-1 print:bg-white print:p-0 print:overflow-visible">
          
          {/* ============================================================== */}
          {/* PERFECT SINGLE A4 PAGE PRINTABLE GATE PASS SLIP CONTAINER     */}
          {/* ONLY GATE PASS INFO IS HERE - FITS 100% PERFECTLY ON A4 PAGE  */}
          {/* ============================================================== */}
          <div 
            ref={gatePassRef}
            id="single-truck-gatepass-printable"
            className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-md text-gray-950 max-w-[760px] mx-auto space-y-2.5 print:border-2 print:border-black print:rounded-none print:shadow-none print:p-3 print:max-w-none print:space-y-2"
          >
            {/* 1. Header with Selected Firm, Licenses, Mandi, and Phone */}
            <div className="border-b-2 border-black pb-2 text-center space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-gray-700 flex-wrap gap-1">
                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-400">
                  {firmInfo.badgeLeft}
                </span>
                <span className="bg-black text-white font-black px-3 py-0.5 rounded-full text-[10.5px] uppercase tracking-wider">
                  {copyTitle}
                </span>
                <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-400">
                  {firmInfo.badgeRight}
                </span>
              </div>

              {/* Dynamic Selected Firm Name Heading */}
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase mt-0.5">
                {firmInfo.title}
              </h1>
              
              <div className="flex items-center justify-center gap-2.5 text-[11px] text-gray-900 font-bold flex-wrap">
                <span>ਕਮਿਸ਼ਨ ਏਜੰਟ (ਆੜ੍ਹਤੀਏ)</span>
                <span>•</span>
                <span>ਦਾਣਾ ਮੰਡੀ: <b>{entry.mandi_name || 'ਕਮਾਲਪੁਰ / ਮਹਿਰਾਜਵਾਲਾ'} (ਪੰਜਾਬ)</b></span>
                <span>•</span>
                <span>ਸੰਪਰਕ: <b>{firmInfo.mobile}</b></span>
              </div>

              <div className="pt-1 border-t border-gray-300 flex items-center justify-between text-[10.5px] font-bold text-black flex-wrap gap-1">
                <span className="bg-gray-100 text-black px-2 py-0.5 rounded border border-gray-400">
                  🌾 ਅਧਿਕਾਰਤ ਟਰੱਕ ਲਿਫਟਿੰਗ ਗੇਟ ਪਾਸ ਤੇ ਰਵਾਨਗੀ ਚਲਾਨ (TRUCK OUTWARD GATE PASS)
                </span>
                <span className="text-gray-700">
                  ਸੀਜ਼ਨ: <b>ਪੈਡੀ ਸੀਜ਼ਨ 2025-26</b> | ਆਈ.ਡੀ: <b className="font-mono">{entry.id}</b>
                </span>
              </div>
            </div>

            {/* 2. Primary 4-Badges Identification Strip */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl">
                <span className="text-[9.5px] text-gray-600 font-bold block uppercase leading-none">ਚਲਾਨ / ਗੇਟ ਪਾਸ ਨੰ.</span>
                <span className="font-mono font-black text-black text-xs sm:text-sm block mt-1">
                  {entry.challan_no}
                </span>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-400 rounded-xl">
                <span className="text-[9.5px] text-amber-950 font-bold block uppercase leading-none">ਟਰੱਕ / ਗੱਡੀ ਨੰਬਰ</span>
                <span className="font-mono font-black text-black text-xs sm:text-sm block mt-1 tracking-wider">
                  {entry.truck_number}
                </span>
              </div>

              <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl">
                <span className="text-[9.5px] text-gray-600 font-bold block uppercase leading-none">ਰਵਾਨਗੀ ਮਿਤੀ ਤੇ ਸਮਾਂ</span>
                <span className="font-mono font-bold text-gray-900 text-[10.5px] block mt-1 truncate">
                  {formattedDateTime}
                </span>
              </div>

              <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl">
                <span className="text-[9.5px] text-gray-600 font-bold block uppercase leading-none">ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀ</span>
                <span className="font-bold text-black text-[11px] block mt-1 truncate">
                  {entry.purchasing_agency}
                </span>
              </div>
            </div>

            {/* 3. Three Detailed Info Sections (Truck/Driver, Commodity/Agency, Destination/Sheller) */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              
              {/* Section 1: Vehicle & Driver (ਵਾਹਨ ਤੇ ਡਰਾਈਵਰ) */}
              <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl space-y-1">
                <h4 className="font-bold text-black pb-0.5 border-b border-gray-300 flex items-center gap-1 uppercase text-[10px]">
                  <Truck className="w-3 h-3 text-black" />
                  <span>1. ਵਾਹਨ ਤੇ ਚਾਲਕ</span>
                </h4>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਟਰੱਕ ਨੰਬਰ:</span>
                    <span className="font-mono font-black text-black">{entry.truck_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਡਰਾਈਵਰ:</span>
                    <span className="font-bold text-gray-900 truncate max-w-[100px]">{entry.driver_name || 'ਦਰਜ ਨਹੀਂ'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਮੋਬਾਈਲ:</span>
                    <span className="font-mono font-bold text-black">{entry.driver_mobile || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਸ਼੍ਰੇਣੀ:</span>
                    <span className="text-gray-900 font-medium">ਕਮਰਸ਼ੀਅਲ ਗੁੱਡਜ਼ ਟਰੱਕ</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Commodity & Arhtia Firm (ਜਿਣਸ ਤੇ ਆੜ੍ਹਤ) */}
              <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl space-y-1">
                <h4 className="font-bold text-black pb-0.5 border-b border-gray-300 flex items-center gap-1 uppercase text-[10px]">
                  <Wheat className="w-3 h-3 text-amber-700" />
                  <span>2. ਜਿਣਸ ਤੇ ਆੜ੍ਹਤ</span>
                </h4>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਆੜ੍ਹਤੀਆ ਫਰਮ:</span>
                    <span className="font-bold text-black truncate max-w-[120px]">{firmInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਦਾਣਾ ਮੰਡੀ:</span>
                    <span className="font-bold text-black">{entry.mandi_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਫਸਲ:</span>
                    <span className="font-bold text-black">{entry.crop_type || 'ਝੋਨਾ (Paddy)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਕਿਸਮ:</span>
                    <span className="font-bold text-black font-mono bg-gray-200 px-1 rounded">
                      {entry.crop_variety || 'PR-126'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Destination & Sheller (ਮੰਜ਼ਿਲ ਤੇ ਸ਼ੈਲਰ) */}
              <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl space-y-1">
                <h4 className="font-bold text-black pb-0.5 border-b border-gray-300 flex items-center gap-1 uppercase text-[10px]">
                  <Building className="w-3 h-3 text-black" />
                  <span>3. ਮੰਜ਼ਿਲ ਤੇ ਸ਼ੈਲਰ</span>
                </h4>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਸ਼ੈਲਰ ਦਾ ਨਾਮ:</span>
                    <span className="font-bold text-black truncate max-w-[120px]">{entry.seller_sheller_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਗੋਦਾਮ / ਪਲਾਂਟ:</span>
                    <span className="font-medium text-gray-900 truncate max-w-[120px]">{entry.destination_godown || entry.seller_sheller_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਲਿਫਟਿੰਗ ਕਿਸਮ:</span>
                    <span className="font-bold text-black">{entry.lifting_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ਸਥਿਤੀ:</span>
                    <span className={`font-bold px-1 rounded ${
                      isDelivered ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-amber-100 text-amber-950 border border-amber-300'
                    }`}>
                      {isDelivered ? '✓ ਸ਼ੈਲਰ ਪਹੁੰਚਿਆ' : '⏳ ਮੰਡੀ ਤੋਂ ਰਵਾਨਾ'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* 4. Loaded Bags and Weights Micro-Breakdown Table */}
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-0.5 border-b border-gray-300">
                <h4 className="font-black text-[10.5px] text-black flex items-center gap-1 uppercase">
                  <Scale className="w-3.5 h-3.5 text-black" />
                  <span>ਗੱਟਿਆਂ ਤੇ ਵਜ਼ਨ ਦਾ ਸੰਪੂਰਨ ਹਿਸਾਬ (Loaded Bags & Weight Micro-Breakdown)</span>
                </h4>
                <span className="font-mono font-bold text-[10.5px] text-black">
                  ਕੁੱਲ ਲੱਦਿਆ ਵਜ਼ਨ: <b>{autoWeightQtl} ਕੁਇੰਟਲ</b>
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-black">
                <table className="w-full text-left text-[10.5px]">
                  <thead className="bg-gray-100 text-black font-bold border-b border-black">
                    <tr>
                      <th className="py-1 px-2.5">ਲੜੀ</th>
                      <th className="py-1 px-2.5">ਬਾਰਦਾਨਾ ਸ਼੍ਰੇਣੀ (Bag Category)</th>
                      <th className="py-1 px-2.5 text-center">ਪ੍ਰਤੀ ਬੈਗ ਵਜ਼ਨ</th>
                      <th className="py-1 px-2.5 text-center">ਲੱਦੇ ਗੱਟੇ</th>
                      <th className="py-1 px-2.5 text-right">ਕੁੱਲ ਵਜ਼ਨ (ਕਿਲੋ)</th>
                      <th className="py-1 px-2.5 text-right">ਕੁੱਲ ਵਜ਼ਨ (ਕੁਇੰਟਲ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 bg-white font-mono text-[10px]">
                    {/* A-Class New Bags */}
                    <tr>
                      <td className="py-1 px-2.5 font-sans text-gray-600">1</td>
                      <td className="py-1 px-2.5 font-sans">
                        <span className="font-bold text-black">ਏ-ਕਲਾਸ ਬਾਰਦਾਨਾ (A-Class New Jute Bags)</span>
                        <span className="text-[9.5px] text-gray-500 block">ਸਰਕਾਰੀ ਏਜੰਸੀ ਦਾ ਨਵਾਂ ਮਾਰਕਾ ਬਾਰਦਾਨਾ</span>
                      </td>
                      <td className="py-1 px-2.5 text-center text-gray-800">37.5 ਕਿਲੋ</td>
                      <td className="py-1 px-2.5 text-center font-bold text-black">{aClassBags.toLocaleString()} ਗੱਟੇ</td>
                      <td className="py-1 px-2.5 text-right text-gray-900">{Math.round(aClassQtl * 100).toLocaleString('en-IN')} kg</td>
                      <td className="py-1 px-2.5 text-right font-bold text-black">{aClassQtl.toFixed(2)} Qtl</td>
                    </tr>

                    {/* B-Class Old Bags */}
                    <tr>
                      <td className="py-1 px-2.5 font-sans text-gray-600">2</td>
                      <td className="py-1 px-2.5 font-sans">
                        <span className="font-bold text-black">ਬੀ-ਕਲਾਸ ਬਾਰਦਾਨਾ (B-Class Once Used Bags)</span>
                        <span className="text-[9.5px] text-gray-500 block">ਇੱਕ ਵਾਰ ਵਰਤਿਆ ਸਾਫ਼ ਬਾਰਦਾਨਾ</span>
                      </td>
                      <td className="py-1 px-2.5 text-center text-gray-800">37.5 ਕਿਲੋ</td>
                      <td className="py-1 px-2.5 text-center font-bold text-black">{bClassBags.toLocaleString()} ਗੱਟੇ</td>
                      <td className="py-1 px-2.5 text-right text-gray-900">{Math.round(bClassQtl * 100).toLocaleString('en-IN')} kg</td>
                      <td className="py-1 px-2.5 text-right font-bold text-black">{bClassQtl.toFixed(2)} Qtl</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-black text-white font-bold font-mono text-[10.5px]">
                    <tr>
                      <td colSpan={3} className="py-1.5 px-2.5 font-sans text-right">
                        ਕੁੱਲ ਜੋੜ (Grand Total Loaded on Truck):
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-black text-white text-xs">
                        {totalBags.toLocaleString()} ਗੱਟੇ
                      </td>
                      <td className="py-1.5 px-2.5 text-right text-white">
                        {totalWeightKg.toLocaleString('en-IN')} ਕਿਲੋ
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-black text-white text-xs">
                        {autoWeightQtl.toFixed(2)} ਕੁਇੰਟਲ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Yard Stock & Formula Single-Line Strip */}
              <div className="flex items-center justify-between p-1.5 bg-gray-50 border border-gray-300 rounded-lg text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-700 font-semibold">ਮੰਡੀ ਫੜ੍ਹ ਵਿੱਚ ਬਾਕੀ ਸਟਾਕ:</span>
                  <span className="font-mono font-bold text-black bg-gray-200 px-1.5 py-0.2 rounded border border-gray-400">
                    {entry.pending_yard_bags || 0} ਗੱਟੇ ({pendingYardQtl} ਕੁਇੰਟਲ)
                  </span>
                </div>
                <div className="text-gray-600 font-mono text-[9.5px]">
                  ਮਿਆਰੀ ਪੈਮਾਨਾ: 400 ਗੱਟੇ = 150.00 ਕੁਇੰਟਲ (0.375 Qtl/ਬੈਗ)
                </div>
              </div>
            </div>

            {/* 5. Reconciliation Report Strip (Only if delivered) */}
            {isDelivered && (
              <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between border-b border-gray-300 pb-0.5">
                  <h4 className="font-bold text-black flex items-center gap-1 uppercase text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-black" />
                    <span>ਸ਼ੈਲਰ ਪਹੁੰਚ ਤੇ ਤਸਦੀਕ ਰਿਪੋਰਟ</span>
                  </h4>
                  <span className="text-[9.5px] text-gray-700 font-mono">
                    ਪਹੁੰਚ ਸਮਾਂ: {entry.delivered_date_time || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                  <div className="p-1 bg-white rounded border border-gray-300">
                    <span className="text-[9px] text-gray-500 font-sans block">ਸ਼ਾਰਟੇਜ ਗੱਟੇ</span>
                    <span className="font-bold text-black">{entry.shortage_bags || 0}</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-gray-300">
                    <span className="text-[9px] text-gray-500 font-sans block">ਸ਼ਾਰਟੇਜ ਵਜ਼ਨ</span>
                    <span className="font-bold text-black">{entry.shortage_quintals || 0} Q</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-gray-300">
                    <span className="text-[9px] text-gray-500 font-sans block">ਰੱਦ ਗੱਟੇ</span>
                    <span className="font-bold text-black">{entry.rejected_bags || 0}</span>
                  </div>
                  <div className="p-1 bg-white rounded border border-gray-300">
                    <span className="text-[9px] text-gray-500 font-sans block">ਪਾਸ ਸ਼ੁੱਧ ਗੱਟੇ</span>
                    <span className="font-bold text-black">
                      {Math.max(0, totalBags - (entry.shortage_bags || 0) - (entry.rejected_bags || 0))}
                    </span>
                  </div>
                </div>

                {entry.delivery_notes && (
                  <p className="text-[9.5px] text-gray-800 italic pt-0.5">
                    <b>ਸ਼ੈਲਰ ਨੋਟਸ:</b> {entry.delivery_notes}
                  </p>
                )}
              </div>
            )}

            {/* 6. Legal Instructions (Compact 4 Bullets) */}
            <div className="p-2 bg-gray-50 border border-gray-300 rounded-lg text-[9.5px] text-gray-700 leading-snug space-y-0.5">
              <span className="font-bold text-black block uppercase text-[9.5px]">
                ਜ਼ਰੂਰੀ ਹਦਾਇਤਾਂ (Important Instructions):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                <div>• ਦਾਣਾ ਮੰਡੀ ਤੋਂ ਮਾਲ ਰਵਾਨਾ ਕਰਨ ਦਾ ਇਹ ਅਧਿਕਾਰਤ ਸਰਕਾਰੀ ਦਸਤਾਵੇਜ਼ ਹੈ।</div>
                <div>• ਰਸਤੇ ਵਿੱਚ ਮਾਲ ਨੂੰ ਤਰਪਾਲ ਨਾਲ ਢੱਕਣ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਡਰਾਈਵਰ ਦੀ ਹੋਵੇਗੀ।</div>
                <div>• ਸ਼ੈਲਰ ਪਹੁੰਚ ਕੇ ਕਾਂਟਾ ਵਜ਼ਨ ਕਰਵਾ ਕੇ ਰਸੀਵਿੰਗ ਲੈਣੀ ਲਾਜ਼ਮੀ ਹੈ।</div>
                <div>• ਕਿਸੇ ਵੀ ਤੋਟੇ ਦੀ ਸੂਰਤ ਵਿੱਚ ਤੁਰੰਤ ਆੜ੍ਹਤੀਆ ਫਰਮ ਦੇ ਮੋਬਾਈਲ 'ਤੇ ਫੋਨ ਕਰੋ।</div>
              </div>
            </div>

            {/* 7. Four Official Signatures & Seal Blocks (Sleek, A4-fitted height) */}
            <div className="pt-2 border-t-2 border-black grid grid-cols-4 gap-2 text-center text-xs text-black font-bold">
              <div>
                <div className="h-8 border-b-2 border-gray-500 mb-1"></div>
                <span className="text-black font-black block text-[10px] leading-tight">ਦਸਤਖ਼ਤ ਆੜ੍ਹਤੀਆ</span>
                <span className="text-[8.5px] text-gray-600 font-normal truncate block">{firmInfo.name}</span>
              </div>

              <div>
                <div className="h-8 border-b-2 border-gray-500 mb-1"></div>
                <span className="text-black font-black block text-[10px] leading-tight">ਦਸਤਖ਼ਤ / ਅੰਗੂਠਾ ਡਰਾਈਵਰ</span>
                <span className="text-[8.5px] text-gray-600 font-normal block">Driver Signature</span>
              </div>

              <div>
                <div className="h-8 border-b-2 border-gray-500 mb-1"></div>
                <span className="text-black font-black block text-[10px] leading-tight">ਮੰਡੀ ਗੇਟ ਇੰਚਾਰਜ</span>
                <span className="text-[8.5px] text-gray-600 font-normal block">Mandi Gate Pass</span>
              </div>

              <div>
                <div className="h-8 border-b-2 border-gray-500 mb-1"></div>
                <span className="text-black font-black block text-[10px] leading-tight">ਸ਼ੈਲਰ ਰਸੀਵਰ / ਮੁਨੀਮ</span>
                <span className="text-[8.5px] text-gray-600 font-normal block">Mill Munim / Stamp</span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Actions Bar (Hidden on print) */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-2 text-gray-600 flex-wrap">
            <span className="font-semibold text-[11px]">
              ਚੁਣੀ ਹੋਈ ਫਰਮ:
            </span>
            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-purple-100 text-purple-950 border border-purple-300">
              {firmInfo.name}
            </span>
            <span className="text-gray-400 text-[10px]">
              | ਸਾਈਜ਼: A4 (210 × 297 mm) 1-Page Fit
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
              onClick={handlePrintIsolated}
              className="px-5 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-purple-950 font-black rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Printer className="w-4 h-4 text-purple-950" />
              <span>ਪ੍ਰਿੰਟ ਕਰੋ (A4 Fit Print)</span>
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
