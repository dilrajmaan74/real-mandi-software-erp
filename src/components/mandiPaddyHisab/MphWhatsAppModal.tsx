import React, { useEffect, useMemo, useState } from 'react';
import {
  MphFarmerAccountSummary,
  MphOtherEntry,
  MphSettings,
} from '../../types/mandiPaddyHisab';
import { MphLang, useMphLang } from '../../lib/mandiPaddyHisabI18n';
import {
  buildFarmerPaymentReceiptWhatsAppText,
  buildFarmerPuraHisabWhatsAppText,
  buildWhatsAppUrl,
  exportOrShareStatementJpg,
  MphWhatsappMessageMode,
  normalizeWhatsAppPhone,
} from '../../lib/mandiPaddyHisabWhatsapp';
import { displayMphText, formatDateDMY, formatINR } from '../../lib/mandiPaddyHisabUtils';
import {
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RotateCcw,
  X,
} from 'lucide-react';

interface MphWhatsAppModalProps {
  open: boolean;
  summary: MphFarmerAccountSummary | null;
  settings: MphSettings;
  statementElement?: HTMLElement | null;
  initialMode?: MphWhatsappMessageMode;
  receiptEntry?: MphOtherEntry | null;
  onClose: () => void;
}

export const MphWhatsAppModal: React.FC<MphWhatsAppModalProps> = ({
  open,
  summary,
  settings,
  statementElement,
  initialMode = 'full',
  receiptEntry = null,
  onClose,
}) => {
  const { lang, tr } = useMphLang();
  const [msgLang, setMsgLang] = useState<MphLang>(lang);
  const [mode, setMode] = useState<MphWhatsappMessageMode>(initialMode);
  const [selectedReceiptEntryId, setSelectedReceiptEntryId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [isEdited, setIsEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jpgStatus, setJpgStatus] = useState<string | null>(null);
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);

  useEffect(() => {
    if (open && summary) {
      setMsgLang(lang);
      setMode(initialMode);
      const entries = summary.otherEntries || [];
      const afterEntries = entries.filter((o) => o.impactStage === 'after_paddy');
      const fallback =
        afterEntries.length > 0
          ? afterEntries[afterEntries.length - 1]
          : entries.length > 0
          ? entries[entries.length - 1]
          : null;
      setSelectedReceiptEntryId(receiptEntry?.id || fallback?.id || '');
      setPhone(summary.farmer.mobile || '');
      setIsEdited(false);
      setCopied(false);
      setJpgStatus(null);
    }
  }, [open, summary, lang, initialMode, receiptEntry]);

  const activeReceiptEntry = useMemo(() => {
    if (!summary) return receiptEntry || null;
    if (receiptEntry && (!selectedReceiptEntryId || receiptEntry.id === selectedReceiptEntryId)) {
      return receiptEntry;
    }
    return (
      summary.otherEntries.find((o) => o.id === selectedReceiptEntryId) ||
      receiptEntry ||
      null
    );
  }, [summary, receiptEntry, selectedReceiptEntryId]);

  const generatedText = useMemo(() => {
    if (!open || !summary) return '';
    if (mode === 'receipt') {
      return buildFarmerPaymentReceiptWhatsAppText(
        summary,
        settings,
        msgLang,
        activeReceiptEntry
      );
    }
    return buildFarmerPuraHisabWhatsAppText(summary, settings, msgLang, mode);
  }, [open, summary, settings, msgLang, mode, activeReceiptEntry]);

  useEffect(() => {
    if (!isEdited) {
      setMessageText(generatedText);
    }
  }, [generatedText, isEdited]);

  if (!open || !summary) return null;

  const waUrl = buildWhatsAppUrl(phone, messageText);
  const normalizedPhone = normalizeWhatsAppPhone(phone);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback textarea copy
      const el = document.createElement('textarea');
      el.value = messageText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareJpg = async () => {
    if (!statementElement) return;
    setIsGeneratingJpg(true);
    setJpgStatus(null);
    try {
      const result = await exportOrShareStatementJpg(statementElement, summary, msgLang);
      setJpgStatus(
        result === 'shared'
          ? tr('Statement image shared!', 'ਸਟੇਟਮੈਂਟ ਫੋਟੋ ਭੇਜੀ ਗਈ!')
          : tr('JPG Slip downloaded — attach in WhatsApp!', 'JPG ਪਰਚੀ ਡਾਊਨਲੋਡ ਹੋ ਗਈ — WhatsApp ਵਿੱਚ ਭੇਜੋ!')
      );
    } catch (err) {
      console.error('JPG share failed:', err);
      setJpgStatus(tr('Could not create JPG image.', 'JPG ਫੋਟੋ ਤਿਆਰ ਨਹੀਂ ਹੋ ਸਕੀ।'));
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {mode === 'receipt'
                  ? tr(
                      'Send Payment Receipt & Closing Balance on WhatsApp',
                      'ਅਦਾਇਗੀ ਰਸੀਦ + ਬਕਾਇਆ WhatsApp ਤੇ ਭੇਜੋ'
                    )
                  : tr('Send Pura Hisab on WhatsApp', 'ਪੂਰਾ ਹਿਸਾਬ WhatsApp ਤੇ ਭੇਜੋ')}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {displayMphText(summary.farmer.name, lang)} ·{' '}
                {displayMphText(summary.farmer.village, lang)} ·{' '}
                {tr('Final Balance:', 'ਅੰਤਿਮ ਬਕਾਇਆ:')}{' '}
                {formatINR(Math.abs(summary.combinedFinalBalance), false)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-800 text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {tr('WhatsApp Mobile Number', 'ਵਟਸਐਪ ਮੋਬਾਈਲ ਨੰਬਰ')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={tr('10-digit mobile (optional)', '10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ (ਵਿਕਲਪਿਕ)')}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                {normalizedPhone
                  ? `${tr('Sending to:', 'ਭੇਜਿਆ ਜਾਵੇਗਾ:')} +${normalizedPhone}`
                  : tr('Blank = Choose contact in WhatsApp', 'ਖਾਲੀ = WhatsApp ਵਿੱਚ ਖੁਦ ਨੰਬਰ ਚੁਣੋ')}
              </p>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {tr('Message Format', 'ਹਿਸਾਬ ਵੇਰਵਾ ਕਿਸਮ')}
              </label>
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('full');
                    setIsEdited(false);
                  }}
                  className={`py-1.5 px-1 text-[10.5px] font-semibold rounded-md cursor-pointer ${
                    mode === 'full' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {tr('Pura Hisab', 'ਪੂਰਾ ਹਿਸਾਬ')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('summary');
                    setIsEdited(false);
                  }}
                  className={`py-1.5 px-1 text-[10.5px] font-semibold rounded-md cursor-pointer ${
                    mode === 'summary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {tr('Short', 'ਸੰਖੇਪ')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('receipt');
                    setIsEdited(false);
                  }}
                  className={`py-1.5 px-1 text-[10.5px] font-semibold rounded-md cursor-pointer ${
                    mode === 'receipt'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  {tr('Receipt Slip', 'ਸਿਰਫ਼ ਰਸੀਦ')}
                </button>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {tr('Message Language', 'ਮੈਸੇਜ ਭਾਸ਼ਾ')}
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMsgLang('en');
                    setIsEdited(false);
                  }}
                  className={`py-1.5 text-[11px] font-semibold rounded-md cursor-pointer ${
                    msgLang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMsgLang('pa');
                    setIsEdited(false);
                  }}
                  className={`py-1.5 text-[11px] font-semibold rounded-md cursor-pointer ${
                    msgLang === 'pa' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ਪੰਜਾਬੀ
                </button>
              </div>
            </div>
          </div>

          {mode === 'receipt' && summary.otherEntries.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {tr('Select Entry for Receipt Slip', 'ਰਸੀਦ ਲਈ ਅਦਾਇਗੀ ਐਂਟਰੀ ਚੁਣੋ')}
              </label>
              <select
                value={activeReceiptEntry?.id || ''}
                onChange={(e) => {
                  setSelectedReceiptEntryId(e.target.value);
                  setIsEdited(false);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 rounded-lg bg-emerald-50/40 text-slate-800 font-medium"
              >
                {[...summary.otherEntries].reverse().map((o) => (
                  <option key={o.id} value={o.id}>
                    {formatDateDMY(o.date)} · {o.entryType === 'add' ? '+' : '-'}
                    {formatINR(o.amount)} · {displayMphText(o.description, msgLang)}
                    {o.impactStage === 'after_paddy'
                      ? msgLang === 'pa'
                        ? ' [ਹਿਸਾਬ ਤੋਂ ਬਾਅਦ]'
                        : ' [After Paddy]'
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Editable Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">
                {tr('WhatsApp Message Preview (Editable)', 'WhatsApp ਮੈਸੇਜ ਪ੍ਰੀਵਿਊ (ਤੁਸੀਂ ਬਦਲ ਸਕਦੇ ਹੋ)')}
              </label>
              {isEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEdited(false);
                    setMessageText(generatedText);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{tr('Reset Auto Text', 'ਦੁਬਾਰਾ ਭਰੋ')}</span>
                </button>
              )}
            </div>
            <textarea
              rows={11}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                setIsEdited(true);
              }}
              className="w-full px-3 py-2.5 text-xs font-mono leading-relaxed border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600"
            />
          </div>

          {jpgStatus && (
            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
              {jpgStatus}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? tr('Copied!', 'ਕਾਪੀ ਹੋ ਗਿਆ!') : tr('Copy Message', 'ਮੈਸੇਜ ਕਾਪੀ ਕਰੋ')}</span>
            </button>

            {statementElement && (
              <button
                type="button"
                onClick={handleShareJpg}
                disabled={isGeneratingJpg}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-60 cursor-pointer"
              >
                {isGeneratingJpg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{tr('Share / Save JPG Slip', 'ਫੋਟੋ (JPG) ਪਰਚੀ ਭੇਜੋ')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              {tr('Close', 'ਬੰਦ ਕਰੋ')}
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{tr('Send on WhatsApp', 'WhatsApp ਤੇ ਭੇਜੋ')}</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
