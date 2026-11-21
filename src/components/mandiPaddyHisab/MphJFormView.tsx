import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MphFarmer, MphJForm, MphSettings } from '../../types/mandiPaddyHisab';
import {
  findDuplicateMphJForm,
  formatDateDMY,
  formatINR,
  safeStr,
} from '../../lib/mandiPaddyHisabUtils';
import {
  CREATE_NEW_FARMER_ID,
  MatchedAnaajJFormRow,
  matchExtractedJForms,
  parseAnaajKharidFiles,
} from '../../lib/mandiPaddyHisabJFormImport';
import { useMphLang } from '../../lib/mandiPaddyHisabI18n';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface MphJFormViewProps {
  farmers: MphFarmer[];
  jForms: MphJForm[];
  settings: MphSettings;
  onSaveJForm: (jForm: MphJForm) => void;
  onBatchSaveJForms?: (jForms: MphJForm[]) => void;
  onSaveFarmer?: (farmer: MphFarmer) => void;
  onDeleteJForm: (jForm: MphJForm) => void;
  onGoToFarmers: () => void;
  requestConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    tone?: 'danger' | 'warning';
    onConfirm: () => void;
  }) => void;
}

export const MphJFormView: React.FC<MphJFormViewProps> = ({
  farmers,
  jForms,
  settings,
  onSaveJForm,
  onBatchSaveJForms,
  onSaveFarmer,
  onDeleteJForm,
  onGoToFarmers,
  requestConfirm,
}) => {
  const { tr } = useMphLang();
  const trRelation = (rel: string) => {
    switch (rel) {
      case 'Self':
        return tr('Self', 'ਖੁਦ');
      case 'Son':
        return tr('Son', 'ਪੁੱਤਰ');
      case 'Wife':
        return tr('Wife', 'ਪਤਨੀ');
      case 'Hissedar':
        return tr('Hissedar', 'ਹਿੱਸੇਦਾਰ');
      case 'Father':
        return tr('Father', 'ਪਿਤਾ');
      case 'Brother':
        return tr('Brother', 'ਭਰਾ');
      case 'Other':
        return tr('Other', 'ਹੋਰ');
      default:
        return rel;
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string>(farmers[0]?.id || '');
  const [holderRelation, setHolderRelation] = useState<string>('Self');
  const [jFormHolderName, setJFormHolderName] = useState<string>(farmers[0]?.name || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [jFormNo, setJFormNo] = useState<string>('');
  const [bags, setBags] = useState<string>('0');
  const [rate, setRate] = useState<string>(String(settings.paddyAGurdeRate));
  const [jFormAmount, setJFormAmount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterFarmerId, setFilterFarmerId] = useState('all');

  // Anaaj Kharid Direct Upload state
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isParsingUpload, setIsParsingUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importRows, setImportRows] = useState<MatchedAnaajJFormRow[] | null>(null);

  const handleAnaajUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploadError(null);
    setIsParsingUpload(true);
    try {
      const extracted = await parseAnaajKharidFiles(files, settings.paddyAGurdeRate);
      if (extracted.length === 0) {
        setUploadError(
          tr(
            'No J-Form rows could be found inside the uploaded file(s). Please verify the file and try again.',
            'ਅੱਪਲੋਡ ਕੀਤੀ ਫਾਈਲ ਵਿੱਚ ਕੋਈ ਜੇ-ਫਾਰਮ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਫਾਈਲ ਚੈੱਕ ਕਰੋ।'
          )
        );
        return;
      }
      const matched = matchExtractedJForms(extracted, farmers, jForms);
      setImportRows(matched);
    } catch (err: any) {
      setUploadError(
        err?.message ||
          tr(
            'Could not read the uploaded J-Form file.',
            'ਅੱਪਲੋਡ ਕੀਤੀ ਜੇ-ਫਾਰਮ ਫਾਈਲ ਪੜ੍ਹੀ ਨਹੀਂ ਜਾ ਸਕੀ।'
          )
      );
    } finally {
      setIsParsingUpload(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    }
  };

  const updateImportRow = (
    tempId: string,
    patch: Partial<MatchedAnaajJFormRow>
  ) => {
    setImportRows((prev) =>
      prev
        ? prev.map((row) => {
            if (row.tempId !== tempId) return row;
            const next = { ...row, ...patch };
            // Re-check duplicate if farmerId / jFormNo / date / bags / amount changed
            if (
              patch.matchedFarmerId !== undefined ||
              patch.jFormNo !== undefined ||
              patch.date !== undefined ||
              patch.bags !== undefined ||
              patch.jFormAmount !== undefined
            ) {
              const dup =
                next.matchedFarmerId !== CREATE_NEW_FARMER_ID
                  ? findDuplicateMphJForm(
                      {
                        farmerId: next.matchedFarmerId,
                        jFormHolderName: next.jFormHolderName,
                        date: next.date,
                        bags: next.bags,
                        jFormAmount: next.jFormAmount,
                        jFormNo: next.jFormNo,
                      },
                      jForms
                    )
                  : null;
              next.isDuplicate = Boolean(dup);
            }
            return next;
          })
        : null
    );
  };

  const handleConfirmBatchImport = () => {
    if (!importRows) return;
    const chosen = importRows.filter(
      (r) => r.selected && r.bags > 0 && r.jFormAmount > 0 && (r.jFormHolderName.trim() || r.farmerName.trim())
    );
    if (chosen.length === 0) {
      setUploadError(
        tr(
          'Please select at least one valid J-Form row to import.',
          'ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਸਹੀ ਜੇ-ਫਾਰਮ ਚੁਣੋ।'
        )
      );
      return;
    }

    const now = new Date().toISOString();
    const createdFarmerMap = new Map<string, MphFarmer>();
    const newFarmersList: MphFarmer[] = [];
    const newJFormsList: MphJForm[] = [];

    chosen.forEach((row, idx) => {
      let targetFarmer: MphFarmer | undefined = farmers.find(
        (f) => f.id === row.matchedFarmerId
      );

      if (!targetFarmer) {
        const displayName = (row.farmerName || row.jFormHolderName || 'Farmer').trim();
        const key = `${displayName.toLowerCase()}|${row.village.toLowerCase()}`;
        targetFarmer = createdFarmerMap.get(key);
        if (!targetFarmer) {
          targetFarmer = {
            id: `MPHF_${Date.now()}_${idx}_${Math.floor(100 + Math.random() * 900)}`,
            name: displayName,
            fatherName: row.fatherName.trim(),
            village: row.village.trim() || tr('Mandi', 'ਮੰਡੀ'),
            mobile: '',
            createdAt: now,
            updatedAt: now,
          };
          createdFarmerMap.set(key, targetFarmer);
          newFarmersList.push(targetFarmer);
        }
      }

      newJFormsList.push({
        id: `MPHJ_${Date.now()}_${idx}_${Math.floor(100 + Math.random() * 900)}`,
        farmerId: targetFarmer.id,
        farmerName: targetFarmer.name,
        jFormHolderName: (row.jFormHolderName || row.farmerName || targetFarmer.name).trim(),
        holderRelation: row.holderRelation || 'Self',
        date: row.date || now.split('T')[0],
        jFormNo: row.jFormNo.trim(),
        bags: Math.max(0, Math.round(row.bags)),
        rate: Math.max(0, Number(row.rate) || 0),
        jFormAmount: Math.round(Math.max(0, Number(row.jFormAmount) || 0) * 100) / 100,
        notes: row.notes.trim(),
        createdAt: now,
        updatedAt: now,
      });
    });

    if (onSaveFarmer) {
      newFarmersList.forEach((nf) => onSaveFarmer(nf));
    }

    if (onBatchSaveJForms) {
      onBatchSaveJForms(newJFormsList);
    } else {
      newJFormsList.forEach((jf) => onSaveJForm(jf));
    }

    setImportRows(null);
    setUploadError(null);
  };

  const selectedMainFarmer = useMemo(
    () => farmers.find((f) => f.id === farmerId) || null,
    [farmers, farmerId]
  );

  useEffect(() => {
    if (!farmerId && farmers.length > 0) {
      setFarmerId(farmers[0].id);
      setJFormHolderName(farmers[0].name);
      setHolderRelation('Self');
    }
  }, [farmers, farmerId]);

  // Previously saved family/hissedar holder names for this arrival farmer
  const knownHoldersForFarmer = useMemo(() => {
    if (!farmerId) return [] as Array<{ name: string; relation: string }>;
    const map = new Map<string, { name: string; relation: string }>();
    if (selectedMainFarmer) {
      const mName = safeStr(selectedMainFarmer.name);
      map.set(`${mName.toLowerCase()}|self`, {
        name: mName,
        relation: 'Self',
      });
    }
    for (const j of jForms) {
      if (j.farmerId !== farmerId) continue;
      const hName = safeStr(j.jFormHolderName || j.farmerName).trim();
      const hRel = safeStr(j.holderRelation, 'Self').trim() || 'Self';
      if (!hName) continue;
      const key = `${hName.toLowerCase()}|${hRel.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, { name: hName, relation: hRel });
      }
    }
    return Array.from(map.values());
  }, [farmerId, jForms, selectedMainFarmer]);

  const handleMainFarmerChange = (nextFarmerId: string) => {
    setFarmerId(nextFarmerId);
    const nextFarmer = farmers.find((f) => f.id === nextFarmerId);
    if (nextFarmer && holderRelation === 'Self') {
      setJFormHolderName(nextFarmer.name);
    } else if (nextFarmer && !jFormHolderName.trim()) {
      setJFormHolderName(nextFarmer.name);
      setHolderRelation('Self');
    }
  };

  const handleRelationChange = (nextRel: string) => {
    setHolderRelation(nextRel);
    if (nextRel === 'Self' && selectedMainFarmer) {
      setJFormHolderName(selectedMainFarmer.name);
    } else if (
      nextRel !== 'Self' &&
      selectedMainFarmer &&
      jFormHolderName.trim() === selectedMainFarmer.name.trim()
    ) {
      setJFormHolderName('');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setHolderRelation('Self');
    setJFormHolderName(selectedMainFarmer?.name || '');
    setDate(new Date().toISOString().split('T')[0]);
    setJFormNo('');
    setBags('0');
    setRate(String(settings.paddyAGurdeRate));
    setJFormAmount('0');
    setNotes('');
    setErrorMsg(null);
  };

  const handleEditClick = (item: MphJForm) => {
    setEditingId(item.id);
    setFarmerId(item.farmerId);
    setHolderRelation(item.holderRelation || 'Self');
    setJFormHolderName(item.jFormHolderName || item.farmerName || '');
    setDate(item.date);
    setJFormNo(item.jFormNo || '');
    setBags(String(item.bags));
    setRate(String(item.rate));
    setJFormAmount(String(item.jFormAmount));
    setNotes(item.notes || '');
    setErrorMsg(null);
  };

  const parsedBags = Math.max(0, Math.floor(Number(bags) || 0));
  const parsedRate = Math.max(0, Number(rate) || 0);
  const parsedAmount = Math.max(0, Number(jFormAmount) || 0);

  const handleAutoCalculateAmount = () => {
    const qtl = parsedBags * 0.375;
    const calc = Math.round(qtl * parsedRate * 100) / 100;
    setJFormAmount(String(calc));
  };

  const commitSave = (existingItem: MphJForm | null, selectedFarmer: MphFarmer) => {
    const now = new Date().toISOString();
    const resolvedHolderName =
      holderRelation === 'Self'
        ? (jFormHolderName.trim() || selectedFarmer.name)
        : jFormHolderName.trim();
    const record: MphJForm = {
      id: existingItem
        ? existingItem.id
        : `MPHJ_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      jFormHolderName: resolvedHolderName,
      holderRelation: holderRelation || 'Self',
      date,
      jFormNo: jFormNo.trim(),
      bags: parsedBags,
      rate: parsedRate,
      jFormAmount: Math.round(parsedAmount * 100) / 100,
      notes: notes.trim(),
      createdAt: existingItem ? existingItem.createdAt : now,
      updatedAt: now,
    };
    onSaveJForm(record);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedFarmer = farmers.find((f) => f.id === farmerId);
    if (!selectedFarmer) {
      setErrorMsg(tr('Please select a farmer.', 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਚੁਣੋ।'));
      return;
    }
    const resolvedHolder =
      holderRelation === 'Self'
        ? (jFormHolderName.trim() || selectedFarmer.name)
        : jFormHolderName.trim();
    if (!resolvedHolder) {
      setErrorMsg(
        tr(
          'Please enter J-Form Holder Name (Son / Wife / Hissedar).',
          'ਕਿਰਪਾ ਕਰਕੇ ਜੇ-ਫਾਰਮ ਧਾਰਕ ਦਾ ਨਾਮ (ਪੁੱਤਰ / ਪਤਨੀ / ਹਿੱਸੇਦਾਰ) ਦਰਜ ਕਰੋ।'
        )
      );
      return;
    }
    if (!date) {
      setErrorMsg(tr('Please enter J-Form Date.', 'ਕਿਰਪਾ ਕਰਕੇ ਜੇ-ਫਾਰਮ ਤਾਰੀਖ ਦਰਜ ਕਰੋ।'));
      return;
    }
    if (parsedBags <= 0) {
      setErrorMsg(tr('Number of bags must be greater than 0.', 'ਬੈਗਾਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।'));
      return;
    }
    if (parsedAmount <= 0) {
      setErrorMsg(tr('J-Form Amount must be greater than 0.', 'ਜੇ-ਫਾਰਮ ਰਕਮ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।'));
      return;
    }

    const existingItem = editingId ? jForms.find((j) => j.id === editingId) || null : null;
    const dup = findDuplicateMphJForm(
      {
        farmerId: selectedFarmer.id,
        jFormHolderName: resolvedHolder,
        date,
        bags: parsedBags,
        jFormAmount: parsedAmount,
        jFormNo,
      },
      jForms,
      editingId || undefined
    );

    if (dup) {
      requestConfirm({
        title: tr('Duplicate J-Form Warning', 'ਡੁਪਲੀਕੇਟ ਜੇ-ਫਾਰਮ ਚੇਤਾਵਨੀ'),
        message: tr(
          `Farmer "${selectedFarmer.name}" (J-Form Name: ${resolvedHolder}) already has a matching J-Form entry on ${formatDateDMY(date)} (${parsedBags} Bags, ${formatINR(parsedAmount)}).\n\nDo you still want to save this J-Form?`,
          `ਕਿਸਾਨ "${selectedFarmer.name}" (ਜੇ-ਫਾਰਮ ਨਾਮ: ${resolvedHolder}) ਦਾ ${formatDateDMY(date)} ਨੂੰ ਇਹੀ ਜੇ-ਫਾਰਮ (${parsedBags} ਬੈਗ, ${formatINR(parsedAmount)}) ਪਹਿਲਾਂ ਹੀ ਦਰਜ ਹੈ।\n\nਕੀ ਤੁਸੀਂ ਫਿਰ ਵੀ ਇਹ ਜੇ-ਫਾਰਮ ਸੇਵ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?`
        ),
        confirmLabel: tr('Save Anyway', 'ਫਿਰ ਵੀ ਸੇਵ ਕਰੋ'),
        tone: 'warning',
        onConfirm: () => commitSave(existingItem, selectedFarmer),
      });
      return;
    }

    commitSave(existingItem, selectedFarmer);
  };

  const filteredJForms = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...jForms]
      .sort(
        (a, b) =>
          safeStr(b.date).localeCompare(safeStr(a.date)) ||
          safeStr(b.createdAt).localeCompare(safeStr(a.createdAt))
      )
      .filter((j) => {
        if (filterFarmerId !== 'all' && j.farmerId !== filterFarmerId) return false;
        if (!q) return true;
        return (
          safeStr(j.farmerName).toLowerCase().includes(q) ||
          safeStr(j.jFormHolderName).toLowerCase().includes(q) ||
          safeStr(j.holderRelation).toLowerCase().includes(q) ||
          safeStr(j.jFormNo).toLowerCase().includes(q) ||
          safeStr(j.date).includes(q) ||
          safeStr(j.notes).toLowerCase().includes(q)
        );
      });
  }, [jForms, filterFarmerId, search]);

  const filteredTotals = useMemo(() => {
    const totalBags = filteredJForms.reduce((s, j) => s + (Number(j.bags) || 0), 0);
    const totalAmount =
      Math.round(filteredJForms.reduce((s, j) => s + (Number(j.jFormAmount) || 0), 0) * 100) / 100;
    const totalLabor =
      Math.round(totalBags * (Number(settings.jFormLaborRate) || 0) * 100) / 100;
    return { totalBags, totalAmount, totalLabor };
  }, [filteredJForms, settings.jFormLaborRate]);

  const selectedImportCount = importRows ? importRows.filter((r) => r.selected).length : 0;

  return (
    <div className="space-y-4">
      {/* Direct Anaaj Kharid J-Form Upload Banner */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          handleAnaajUploadFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
          isDraggingFile
            ? 'border-blue-600 bg-blue-50'
            : 'border-blue-300 bg-gradient-to-r from-blue-50/80 via-white to-emerald-50/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
              {isParsingUpload ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                {tr(
                  'Direct Upload J-Forms Downloaded from Anaaj Kharid (PDF / Photo / Excel / CSV)',
                  'ਅਨਾਜ ਖਰੀਦ (Anaaj Kharid) ਤੋਂ ਡਾਊਨਲੋਡ ਕੀਤੇ ਜੇ-ਫਾਰਮ ਸਿੱਧੇ ਅੱਪਲੋਡ ਕਰੋ (PDF / ਫੋਟੋ / Excel)'
                )}
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {tr(
                  'Select or drag & drop single or multiple J-Form PDFs, photos, or Excel/CSV files — Farmer Name, J-Form No., Date, Bags, Rate & Amount fill automatically.',
                  'ਇੱਕ ਜਾਂ ਕਈ ਜੇ-ਫਾਰਮ PDF, ਫੋਟੋ ਜਾਂ Excel/CSV ਫਾਈਲ ਇੱਥੇ ਚੁਣੋ — ਕਿਸਾਨ ਦਾ ਨਾਮ, ਜੇ-ਫਾਰਮ ਨੰਬਰ, ਤਾਰੀਖ, ਬੈਗ, ਰੇਟ ਅਤੇ ਰਕਮ ਆਪਣੇ-ਆਪ ਭਰ ਜਾਣਗੇ।'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xls,.xlsx"
              multiple
              onChange={(e) => handleAnaajUploadFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              disabled={isParsingUpload}
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-60 shadow-xs cursor-pointer whitespace-nowrap"
            >
              {isParsingUpload ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{tr('Reading J-Form...', 'ਜੇ-ਫਾਰਮ ਪੜ੍ਹਿਆ ਜਾ ਰਿਹਾ ਹੈ...')}</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{tr('Upload Anaaj Kharid J-Form', 'ਅਨਾਜ ਖਰੀਦ ਜੇ-ਫਾਰਮ ਅੱਪਲੋਡ ਕਰੋ')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center justify-between gap-2">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-rose-600 hover:text-rose-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Form: J-Form Entry */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? tr('Edit J-Form', 'ਜੇ-ਫਾਰਮ ਸੋਧੋ') : tr('New J-Form Entry', 'ਨਵਾਂ ਜੇ-ਫਾਰਮ')}
            </h3>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{tr('Cancel', 'ਰੱਦ ਕਰੋ')}</span>
            </button>
          )}
        </div>

        {farmers.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-xs text-slate-600">
              {tr(
                'Please add a farmer in Farmer Master before recording J-Form entries.',
                'ਜੇ-ਫਾਰਮ ਦਰਜ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਕਿਸਾਨ ਸੂਚੀ ਵਿੱਚ ਕਿਸਾਨ ਜੋੜੋ।'
              )}
            </p>
            <button
              type="button"
              onClick={onGoToFarmers}
              className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              {tr('Go to Farmer Master', 'ਕਿਸਾਨ ਸੂਚੀ ਵਿੱਚ ਜਾਓ')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('Arrival Farmer Account *', 'ਕਿਸਾਨ ਖਾਤਾ (ਜੋ ਝੋਨਾ ਲਿਆਇਆ) *')}
              </label>
              <select
                value={farmerId}
                onChange={(e) => handleMainFarmerChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {`${safeStr(f.name, 'Farmer')}${f.village ? ` (${safeStr(f.village)})` : ''}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Multi-Farmer / Family / Hissedar J-Form Name */}
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
              <div className="text-[11px] font-bold text-blue-950">
                {tr(
                  'J-Form Name (Self / Son / Wife / Hissedar)',
                  'ਜੇ-ਫਾਰਮ ਕਿਸ ਦੇ ਨਾਮ ਬਣਿਆ (ਆਪ / ਪੁੱਤਰ / ਪਤਨੀ / ਹਿੱਸੇਦਾਰ)'
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    {tr('Relation', 'ਰਿਸ਼ਤਾ')}
                  </label>
                  <select
                    value={holderRelation}
                    onChange={(e) => handleRelationChange(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Self">{tr('Self', 'ਆਪਣੇ ਨਾਮ')}</option>
                    <option value="Son">{tr('Son', 'ਪੁੱਤਰ')}</option>
                    <option value="Wife">{tr('Wife', 'ਪਤਨੀ')}</option>
                    <option value="Hissedar">{tr('Hissedar', 'ਹਿੱਸੇਦਾਰ')}</option>
                    <option value="Father">{tr('Father', 'ਪਿਤਾ')}</option>
                    <option value="Brother">{tr('Brother', 'ਭਰਾ')}</option>
                    <option value="Other">{tr('Other', 'ਹੋਰ')}</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    {tr('J-Form Holder Name *', 'ਜੇ-ਫਾਰਮ ਧਾਰਕ ਦਾ ਨਾਮ *')}
                  </label>
                  <input
                    type="text"
                    value={jFormHolderName}
                    onChange={(e) => setJFormHolderName(e.target.value)}
                    placeholder={
                      holderRelation === 'Self'
                        ? selectedMainFarmer?.name || tr('Farmer Name', 'ਕਿਸਾਨ ਦਾ ਨਾਮ')
                        : tr(`Enter ${holderRelation} name...`, 'ਧਾਰਕ ਦਾ ਨਾਮ ਲਿਖੋ...')
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              {knownHoldersForFarmer.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-500 mr-1">
                    {tr('Quick select:', 'ਤੁਰੰਤ ਚੁਣੋ:')}
                  </span>
                  {knownHoldersForFarmer.map((h) => (
                    <button
                      key={`${h.name}|${h.relation}`}
                      type="button"
                      onClick={() => {
                        setHolderRelation(h.relation);
                        setJFormHolderName(h.name);
                      }}
                      className={`px-2 py-0.5 text-[10.5px] font-semibold rounded border transition-colors cursor-pointer ${
                        jFormHolderName.trim().toLowerCase() === h.name.toLowerCase() &&
                        holderRelation === h.relation
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {h.name} ({trRelation(h.relation)})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr('J-Form Date *', 'ਜੇ-ਫਾਰਮ ਤਾਰੀਖ *')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr('J-Form No.', 'ਜੇ-ਫਾਰਮ ਨੰਬਰ')}
                </label>
                <input
                  type="text"
                  value={jFormNo}
                  onChange={(e) => setJFormNo(e.target.value)}
                  placeholder={tr('Optional e.g. JF-102', 'ਵਿਕਲਪਿਕ ਜਿਵੇਂ JF-102')}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr('Number of Bags *', 'ਬੈਗਾਂ ਦੀ ਗਿਣਤੀ *')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={bags}
                  onChange={(e) => setBags(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tr('Rate / Quintal (₹)', 'ਰੇਟ / ਕੁਇੰਟਲ (₹)')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {tr('J-Form Amount (₹) *', 'ਜੇ-ਫਾਰਮ ਰਕਮ (₹) *')}
                </label>
                <button
                  type="button"
                  onClick={handleAutoCalculateAmount}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                  title={tr('Calculate Bags × 0.375 Qtl × Rate', 'ਬੈਗ × 0.375 ਕੁਇੰਟਲ × ਰੇਟ ਹਿਸਾਬ ਕਰੋ')}
                >
                  <Calculator className="w-3 h-3" />
                  <span>
                    {tr('Auto Calc', 'ਆਟੋ ਹਿਸਾਬ')} ({(parsedBags * 0.375).toFixed(2)} {tr('Qtl', 'ਕੁਇੰ')})
                  </span>
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={jFormAmount}
                onChange={(e) => setJFormAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums font-bold border border-blue-300 bg-blue-50/40 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {tr('Notes', 'ਨੋਟ')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={tr('Agency / remarks...', 'ਏਜੰਸੀ / ਟਿੱਪਣੀ...')}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingId ? tr('Update J-Form', 'ਜੇ-ਫਾਰਮ ਅੱਪਡੇਟ ਕਰੋ') : tr('Save J-Form', 'ਜੇ-ਫਾਰਮ ਸੇਵ ਕਰੋ')}</span>
            </button>
          </form>
        )}
      </div>

      {/* Right Table: J-Form Register */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {tr('J-Form Register', 'ਜੇ-ਫਾਰਮ ਰਜਿਸਟਰ')} ({filteredJForms.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              {tr(
                `Separate date-wise J-Form ledger · Labour ₹${settings.jFormLaborRate}/bag`,
                `ਵੱਖਰਾ ਤਾਰੀਖ-ਵਾਰ ਜੇ-ਫਾਰਮ ਖਾਤਾ · ਲੇਬਰ ₹${settings.jFormLaborRate}/ਬੈਗ`
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('Search farmer, J-Form...', 'ਕਿਸਾਨ ਜਾਂ ਜੇ-ਫਾਰਮ ਖੋਜੋ...')}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
            <select
              value={filterFarmerId}
              onChange={(e) => setFilterFarmerId(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">{tr('All Farmers', 'ਸਾਰੇ ਕਿਸਾਨ')}</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredJForms.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {tr(
              'No J-Form entries recorded matching the current filter.',
              'ਚੁਣੇ ਹੋਏ ਫਿਲਟਰ ਮੁਤਾਬਕ ਕੋਈ ਜੇ-ਫਾਰਮ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">{tr('J-Form Date', 'ਤਾਰੀਖ')}</th>
                  <th className="py-2.5 px-3 font-semibold">{tr('Arrival Farmer / J-Form Name', 'ਆਵਕ ਕਿਸਾਨ / ਜੇ-ਫਾਰਮ ਨਾਮ')}</th>
                  <th className="py-2.5 px-3 font-semibold">{tr('J-Form No.', 'ਨੰਬਰ')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tr('Bags', 'ਬੈਗ')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tr('Rate', 'ਰੇਟ')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tr('J-Form Amount', 'ਜੇ-ਫਾਰਮ ਰਕਮ')}</th>
                  <th className="py-2.5 px-3 font-semibold text-right">
                    {tr('Labour', 'ਲੇਬਰ')} (₹{settings.jFormLaborRate}/{tr('bag', 'ਬੈਗ')})
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right">{tr('Actions', 'ਕਾਰਵਾਈ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJForms.map((j, idx) => {
                  const labor = Math.round(j.bags * (Number(settings.jFormLaborRate) || 0) * 100) / 100;
                  const holderName = safeStr(j.jFormHolderName || j.farmerName);
                  const holderRel = safeStr(j.holderRelation, 'Self') || 'Self';
                  const isDifferentHolder =
                    holderRel !== 'Self' ||
                    holderName.trim().toLowerCase() !==
                      safeStr(j.farmerName).trim().toLowerCase();
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap text-slate-700">
                        {formatDateDMY(j.date)}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{j.farmerName}</div>
                        <div
                          className={`text-[10.5px] ${
                            isDifferentHolder ? 'text-blue-700 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          {tr('J-Form', 'ਜੇ-ਫਾਰਮ')}: {holderName} ({trRelation(holderRel)})
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {j.jFormNo || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                        {j.bags}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-700">
                        ₹{j.rate}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-blue-800 whitespace-nowrap">
                        {formatINR(j.jFormAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-rose-700 whitespace-nowrap">
                        -{formatINR(labor)}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditClick(j)}
                            className="p-1 text-blue-700 hover:bg-blue-50 rounded cursor-pointer"
                            title={tr('Edit J-Form', 'ਜੇ-ਫਾਰਮ ਸੋਧੋ')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteJForm(j)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title={tr('Delete J-Form', 'ਜੇ-ਫਾਰਮ ਹਟਾਓ')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3">
                    {tr(`Total (${filteredJForms.length} J-Forms)`, `ਕੁੱਲ ਜੋੜ (${filteredJForms.length} ਜੇ-ਫਾਰਮ)`)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {filteredTotals.totalBags.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right">—</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-900 whitespace-nowrap">
                    {formatINR(filteredTotals.totalAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-800 whitespace-nowrap">
                    -{formatINR(filteredTotals.totalLabor)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>

      {/* Review & Confirm Extracted Anaaj Kharid J-Forms Modal */}
      {importRows && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-4 py-3 bg-blue-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {tr(
                    `Review Anaaj Kharid J-Forms (${importRows.length} Found)`,
                    `ਅਨਾਜ ਖਰੀਦ ਤੋਂ ਮਿਲੇ ਜੇ-ਫਾਰਮ ਚੈੱਕ ਕਰੋ (${importRows.length} ਮਿਲੇ)`
                  )}
                </h3>
                <p className="text-[11px] text-blue-100">
                  {tr(
                    'Verify farmer matching, bags, rate and amount below, then click Save Selected J-Forms.',
                    'ਹੇਠਾਂ ਕਿਸਾਨ ਖਾਤਾ, ਬੈਗ, ਰੇਟ ਅਤੇ ਰਕਮ ਚੈੱਕ ਕਰਕੇ "ਚੁਣੇ ਹੋਏ ਜੇ-ਫਾਰਮ ਸੇਵ ਕਰੋ" ਦਬਾਓ।'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportRows(null)}
                className="p-1.5 rounded-lg hover:bg-blue-900 text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setImportRows((prev) =>
                        prev ? prev.map((r) => ({ ...r, selected: true })) : null
                      )
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 cursor-pointer"
                  >
                    {tr('Select All', 'ਸਾਰੇ ਚੁਣੋ')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImportRows((prev) =>
                        prev ? prev.map((r) => ({ ...r, selected: false })) : null
                      )
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 cursor-pointer"
                  >
                    {tr('Unselect All', 'ਸਾਰੇ ਹਟਾਓ')}
                  </button>
                </div>
                <span className="text-slate-600 font-medium">
                  {tr(
                    `${selectedImportCount} of ${importRows.length} selected for import`,
                    `${importRows.length} ਵਿੱਚੋਂ ${selectedImportCount} ਸੇਵ ਕਰਨ ਲਈ ਚੁਣੇ ਗਏ`
                  )}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5 w-8">✓</th>
                      <th className="py-2 px-2.5 font-semibold">{tr('Date & No.', 'ਤਾਰੀਖ / ਨੰਬਰ')}</th>
                      <th className="py-2 px-2.5 font-semibold">{tr('Arrival Farmer Account', 'ਕਿਸਾਨ ਖਾਤਾ')}</th>
                      <th className="py-2 px-2.5 font-semibold">{tr('J-Form Holder & Relation', 'ਜੇ-ਫਾਰਮ ਨਾਮ / ਰਿਸ਼ਤਾ')}</th>
                      <th className="py-2 px-2.5 font-semibold text-right">{tr('Bags', 'ਬੈਗ')}</th>
                      <th className="py-2 px-2.5 font-semibold text-right">{tr('Rate (₹)', 'ਰੇਟ (₹)')}</th>
                      <th className="py-2 px-2.5 font-semibold text-right">{tr('Amount (₹)', 'ਰਕਮ (₹)')}</th>
                      <th className="py-2 px-2.5 font-semibold">{tr('Status', 'ਸਥਿਤੀ')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.map((row) => (
                      <tr
                        key={row.tempId}
                        className={
                          row.isDuplicate
                            ? 'bg-amber-50/50'
                            : row.selected
                            ? 'bg-white'
                            : 'bg-slate-50/70 opacity-70'
                        }
                      >
                        <td className="py-2 px-2.5 align-top">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              updateImportRow(row.tempId, { selected: e.target.checked })
                            }
                            className="mt-1 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-2.5 align-top space-y-1 min-w-[130px]">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) =>
                              updateImportRow(row.tempId, { date: e.target.value })
                            }
                            className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded bg-white"
                          />
                          <input
                            type="text"
                            value={row.jFormNo}
                            onChange={(e) =>
                              updateImportRow(row.tempId, { jFormNo: e.target.value })
                            }
                            placeholder={tr('J-Form No.', 'ਜੇ-ਫਾਰਮ ਨੰ.')}
                            className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded bg-white"
                          />
                        </td>
                        <td className="py-2 px-2.5 align-top min-w-[210px] space-y-1">
                          <select
                            value={row.matchedFarmerId}
                            onChange={(e) =>
                              updateImportRow(row.tempId, {
                                matchedFarmerId: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] font-semibold border border-slate-300 rounded bg-white"
                          >
                            <option value={CREATE_NEW_FARMER_ID}>
                              {tr(
                                `+ Create New Farmer: ${row.farmerName || 'Farmer'}`,
                                `+ ਨਵਾਂ ਕਿਸਾਨ ਬਣਾਓ: ${row.farmerName || 'ਕਿਸਾਨ'}`
                              )}
                            </option>
                            {farmers.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                                {f.village ? ` (${f.village})` : ''}
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-500">
                            {tr('On J-Form:', 'ਜੇ-ਫਾਰਮ ਤੇ ਨਾਮ:')} {row.farmerName || '—'}
                            {row.fatherName ? ` · ${row.fatherName}` : ''}
                            {row.village ? ` · ${row.village}` : ''}
                          </div>
                        </td>
                        <td className="py-2 px-2.5 align-top min-w-[180px] space-y-1">
                          <input
                            type="text"
                            value={row.jFormHolderName}
                            onChange={(e) =>
                              updateImportRow(row.tempId, {
                                jFormHolderName: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                          />
                          <select
                            value={row.holderRelation}
                            onChange={(e) =>
                              updateImportRow(row.tempId, {
                                holderRelation: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded bg-white"
                          >
                            <option value="Self">{tr('Self', 'ਆਪਣੇ ਨਾਮ')}</option>
                            <option value="Son">{tr('Son', 'ਪੁੱਤਰ')}</option>
                            <option value="Wife">{tr('Wife', 'ਪਤਨੀ')}</option>
                            <option value="Hissedar">{tr('Hissedar', 'ਹਿੱਸੇਦਾਰ')}</option>
                            <option value="Father">{tr('Father', 'ਪਿਤਾ')}</option>
                            <option value="Brother">{tr('Brother', 'ਭਰਾ')}</option>
                            <option value="Other">{tr('Other', 'ਹੋਰ')}</option>
                          </select>
                        </td>
                        <td className="py-2 px-2.5 align-top w-20">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.bags}
                            onChange={(e) =>
                              updateImportRow(row.tempId, {
                                bags: Math.max(0, Math.round(Number(e.target.value) || 0)),
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] text-right font-mono font-bold border border-slate-300 rounded bg-white"
                          />
                        </td>
                        <td className="py-2 px-2.5 align-top w-24">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.rate}
                            onChange={(e) =>
                              updateImportRow(row.tempId, {
                                rate: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] text-right font-mono border border-slate-300 rounded bg-white"
                          />
                        </td>
                        <td className="py-2 px-2.5 align-top w-28">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.jFormAmount}
                            onChange={(e) =>
                              updateImportRow(row.tempId, {
                                jFormAmount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] text-right font-mono font-bold text-blue-800 border border-blue-300 rounded bg-blue-50/40"
                          />
                        </td>
                        <td className="py-2 px-2.5 align-top whitespace-nowrap">
                          {row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{tr('Duplicate', 'ਪਹਿਲਾਂ ਤੋਂ ਦਰਜ')}</span>
                            </span>
                          ) : row.matchedFarmerId === CREATE_NEW_FARMER_ID ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 rounded">
                              <Plus className="w-3 h-3" />
                              <span>{tr('New Farmer', 'ਨਵਾਂ ਕਿਸਾਨ')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>
                                {row.matchConfidence === 'holder'
                                  ? tr('Hissedar Linked', 'ਹਿੱਸੇਦਾਰ ਜੁੜਿਆ')
                                  : tr('Matched', 'ਮਿਲਾਨ ਹੋਇਆ')}
                              </span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-600">
                {tr('Total Selected Amount:', 'ਚੁਣੀ ਹੋਈ ਕੁੱਲ ਰਕਮ:')}{' '}
                <span className="font-mono font-bold text-blue-900">
                  {formatINR(
                    importRows
                      .filter((r) => r.selected)
                      .reduce((s, r) => s + (Number(r.jFormAmount) || 0), 0)
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportRows(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  {tr('Cancel', 'ਰੱਦ ਕਰੋ')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchImport}
                  disabled={selectedImportCount === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {tr(
                      `Save Selected J-Forms (${selectedImportCount})`,
                      `ਚੁਣੇ ਹੋਏ ਜੇ-ਫਾਰਮ ਸੇਵ ਕਰੋ (${selectedImportCount})`
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
