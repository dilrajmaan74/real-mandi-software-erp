import React, { useRef, useState } from 'react';
import { CropArrivalEntry } from '../types/mandi';
import { Printer, Download, X, Wheat, CheckCircle2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

interface CropArrivalParchiModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: CropArrivalEntry | null;
}

export const CropArrivalParchiModal: React.FC<CropArrivalParchiModalProps> = ({
  isOpen,
  onClose,
  entry,
}) => {
  const parchiRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !entry) return null;

  const pNo = entry.parchi_no || entry.gate_pass_no || 'PR-000';
  const totBags = entry.total_bags_arrived || 0;
  const newB = entry.new_jute_bags ?? Math.round(totBags / 2);
  const oldB = entry.old_jute_bags ?? Math.floor(totBags / 2);
  const looseKg = entry.loose_weight_kg ?? 0;
  const totalLabor = (entry.labor_total || 0) + (entry.sukhi_kiti_total || 0) + (entry.double_pakha_total || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!parchiRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toJpeg(parchiRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'JPEG', 0, 5, pdfWidth, pdfHeight);
      pdf.save(`Parchi_${pNo}_${entry.farmer_name}.pdf`);
    } catch (err) {
      console.error(err);
      alert('ਪਰਚੀ PDF ਬਣਾਉਣ ਵਿੱਚ ਗਲਤੀ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਿੰਟ ਬਟਨ ਵਰਤੋ।');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-300 overflow-hidden my-auto max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 to-teal-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Wheat className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-sm">ਫਸਲ ਆਵਕ ਪਰਚੀ (Inward Parchi) - {pNo}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>ਪ੍ਰਿੰਟ</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-emerald-950 font-black rounded-lg text-xs transition cursor-pointer disabled:opacity-60 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'PDF...' : 'PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-300 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Parchi Slip Body */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 print:bg-white print:p-0">
          <div 
            ref={parchiRef}
            className="bg-white p-5 rounded-xl border-2 border-dashed border-gray-400 shadow-sm text-black max-w-md mx-auto print:border-solid print:border-black print:rounded-none print:shadow-none"
          >
            {/* Parchi Header */}
            <div className="border-b-2 border-black pb-2 text-center">
              <h2 className="text-base font-black uppercase tracking-wider">PUNJABI MANDI SOFTWARE</h2>
              <p className="text-xs font-bold text-gray-800">JAMMU TRADING CO. & NEW JAMMU TRADING CO.</p>
              <p className="text-[10px] text-gray-700">ਦਾਣਾ ਮੰਡੀ: {entry.mandi_name || 'ਕਮਾਲਪੁਰ / ਮਹਿਰਾਜਵਾਲਾ'}</p>
              
              <div className="mt-1.5 inline-block bg-black text-white px-3 py-0.5 text-[11px] font-black uppercase rounded">
                ਫਸਲ ਆਵਕ ਗੇਟ ਪਾਸ / ਪਰਚੀ
              </div>
            </div>

            {/* Parchi Details */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span><strong>ਪਰਚੀ ਨੰਬਰ:</strong> <span className="font-mono font-black">{pNo}</span></span>
                <span><strong>ਮਿਤੀ:</strong> {entry.date ? entry.date.split('-').reverse().join('/') : '-'}</span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span><strong>ਕਿਸਾਨ ਦਾ ਨਾਮ:</strong> {entry.farmer_name}</span>
                {entry.farmer_name_pa && <span>({entry.farmer_name_pa})</span>}
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span><strong>ਪਿਤਾ/ਪਤੀ:</strong> {entry.father_husband_name || '-'}</span>
                <span><strong>ਪਿੰਡ:</strong> {entry.village || '-'}</span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span><strong>ਮੋਬਾਈਲ:</strong> <span className="font-mono">{entry.mobile || '-'}</span></span>
                <span><strong>ਟਰਾਲੀ ਨੰ.:</strong> <span className="font-mono font-bold">{entry.vehicle_trolley_no || '-'}</span></span>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span><strong>ਫਸਲ ਤੇ ਕਿਸਮ:</strong> {entry.crop_variety || entry.crop_type || 'PR-126'}</span>
                <span><strong>ਨਮੀ:</strong> <span className="font-bold">{entry.moisture_percentage}%</span></span>
              </div>

              {/* Bags Breakdown Box */}
              <div className="mt-2 p-2 bg-gray-50 border border-black rounded text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>ਨਵਾਂ ਜੂਟ (New Bags):</span>
                  <strong>{newB}</strong>
                </div>
                <div className="flex justify-between">
                  <span>ਪੁਰਾਣਾ ਜੂਟ (Old Bags):</span>
                  <strong>{oldB}</strong>
                </div>
                {looseKg > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>ਤੋਟਾ / ਖੁੱਲ੍ਹਾ ਵਜ਼ਨ:</span>
                    <strong>+{looseKg} kg</strong>
                  </div>
                )}
                <div className="flex justify-between border-t border-black pt-1 font-black text-sm">
                  <span>ਕੁੱਲ ਆਏ ਗੱਟੇ (Total):</span>
                  <span>{totBags} Bags</span>
                </div>
                <div className="flex justify-between font-black text-emerald-950 text-sm">
                  <span>ਕੁੱਲ ਵਜ਼ਨ (Weight):</span>
                  <span>{Number(entry.weight_quintals || 0).toFixed(2)} Qtl</span>
                </div>
              </div>

              {/* Labor box if any */}
              {totalLabor > 0 && (
                <div className="p-1.5 bg-red-50/70 border border-red-200 rounded text-[10.5px] flex justify-between text-red-900 font-mono">
                  <span>ਲੇਬਰ ਕਟੌਤੀ (J-Form + ਸੁਕੀ + ਪੱਖਾ):</span>
                  <strong>-₹{totalLabor.toFixed(0)}</strong>
                </div>
              )}
            </div>

            {/* Signature Box */}
            <div className="mt-6 pt-3 border-t border-black flex justify-between text-center text-[10px]">
              <div>
                <div className="h-6"></div>
                <p className="border-t border-gray-400 pt-0.5">ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ</p>
              </div>
              <div>
                <div className="h-6"></div>
                <p className="border-t border-gray-400 pt-0.5">ਮੁਣਸ਼ੀ / ਤੋਲਾ ਦਸਤਖਤ</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-end print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 rounded-xl font-bold text-xs hover:bg-gray-50 cursor-pointer"
          >
            ਬੰਦ ਕਰੋ
          </button>
        </div>
      </div>
    </div>
  );
};
