import * as XLSX from 'xlsx';
import { MphFarmer, MphJForm } from '../types/mandiPaddyHisab';
import {
  displayMphText,
  findDuplicateMphJForm,
  safeNum,
  safeStr,
} from './mandiPaddyHisabUtils';

export interface ExtractedAnaajJForm {
  tempId: string;
  sourceFileName: string;
  jFormNo: string;
  date: string;
  farmerName: string;
  fatherName: string;
  village: string;
  bags: number;
  weightQtl: number;
  rate: number;
  jFormAmount: number;
  agency: string;
  crop: string;
  notes: string;
}

export interface MatchedAnaajJFormRow extends ExtractedAnaajJForm {
  selected: boolean;
  matchedFarmerId: string; // Farmer ID or '__CREATE__'
  holderRelation: string;
  jFormHolderName: string;
  isDuplicate: boolean;
  matchConfidence: 'exact' | 'holder' | 'fuzzy' | 'none';
}

export const CREATE_NEW_FARMER_ID = '__CREATE__';

function normalizeNameKey(str?: unknown): string {
  return safeStr(str)
    .toLowerCase()
    .replace(/\b(sh|shri|smt|s\.|sardar|mr|mrs|late|ji)\b\.?/gi, ' ')
    .replace(/[^a-z0-9\u0A00-\u0A7F\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toPaNormalized(str?: unknown): string {
  const cleaned = normalizeNameKey(str);
  if (!cleaned) return '';
  // Converts English names to Gurmukhi too so English Farmer Master <-> Punjabi J-Form match seamlessly
  return displayMphText(cleaned, 'pa')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenOverlapScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const tokA = a.split(' ').filter((t) => t.length >= 2);
  const tokB = b.split(' ').filter((t) => t.length >= 2);
  if (tokA.length === 0 || tokB.length === 0) return 0;
  let hits = 0;
  for (const t of tokA) {
    if (tokB.includes(t)) hits++;
  }
  return hits / Math.max(tokA.length, tokB.length);
}

function normalizeAnyDateToIso(raw: unknown): string {
  const todayIso = new Date().toISOString().split('T')[0];
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw.toISOString().split('T')[0];
  }
  if (typeof raw === 'number' && raw > 25000 && raw < 90000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(excelEpoch.getTime() + raw * 86400000);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }
  const s = safeStr(raw).trim();
  if (!s) return todayIso;

  const isoMatch = s.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  const dmyMatch = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dmyMatch) {
    const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    const month = dmyMatch[2].padStart(2, '0');
    const day = dmyMatch[1].padStart(2, '0');
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }
  return todayIso;
}

function parseCleanNumber(raw: unknown): number {
  if (typeof raw === 'number') return isFinite(raw) ? raw : 0;
  const cleaned = safeStr(raw).replace(/[₹,\s]/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

function findHeaderColIndex(headers: string[], patterns: RegExp[]): number {
  for (const pat of patterns) {
    const idx = headers.findIndex((h) => pat.test(h));
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function parseAnaajKharidSpreadsheetFile(
  file: File,
  defaultRate: number
): Promise<ExtractedAnaajJForm[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let workbook: XLSX.WorkBook;
  if (ext === 'csv' || file.type === 'text/csv') {
    const text = await file.text();
    workbook = XLSX.read(text, { type: 'string', cellDates: true });
  } else {
    const buf = await file.arrayBuffer();
    workbook = XLSX.read(buf, { type: 'array', cellDates: true, codepage: 65001 });
  }
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Locate header row (governments exports sometimes put 1-4 banner/title rows at the top)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = Array.isArray(rows[i]) ? rows[i].map((c) => safeStr(c).toLowerCase().trim()) : [];
    const joined = row.join(' | ');
    const hasFarmer = /(farmer|seller|kisan|ਕਿਸਾਨ|name)/i.test(joined);
    const hasMetric = /(j[-\s]?form|form\s?no|bag|gatte|bori|amount|payable|weight|qty)/i.test(joined);
    if (hasFarmer && hasMetric) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) headerRowIdx = 0;

  const rawHeaders = (Array.isArray(rows[headerRowIdx]) ? rows[headerRowIdx] : []).map((h) =>
    safeStr(h).toLowerCase().replace(/\s+/g, ' ').trim()
  );

  const colJFormNo = findHeaderColIndex(rawHeaders, [
    /j[\s_-]*form[\s_-]*(no|num|number|id)/i,
    /^(form|serial|sr)[\s_-]*(no|num)/i,
    /jformno/i,
    /ਜੇ-?ਫਾਰਮ.*ਨੰ/i,
  ]);
  const colDate = findHeaderColIndex(rawHeaders, [
    /(j[\s_-]*form|auction|sale|entry)[\s_-]*date/i,
    /^date$/i,
    /ਤਾਰੀਖ|ਮਿਤੀ/i,
  ]);
  const colFarmer = findHeaderColIndex(rawHeaders, [
    /(farmer|seller|kisan)[\s_-]*(name)?/i,
    /ਕਿਸਾਨ.*ਨਾਮ/i,
    /^name$/i,
  ]);
  const colFather = findHeaderColIndex(rawHeaders, [
    /(father|husband|f\/h)[\s_-]*(name)?/i,
    /ਪਿਤਾ/i,
  ]);
  const colVillage = findHeaderColIndex(rawHeaders, [/village|city|address|ਪਿੰਡ/i]);
  const colBags = findHeaderColIndex(rawHeaders, [
    /(no\.?\s*of\s*)?(bags?|bori|gatte|units?|packets?)/i,
    /ਬੈਗ|ਗੱਟੇ|ਬੋਰੀ/i,
  ]);
  const colWeight = findHeaderColIndex(rawHeaders, [
    /(net|actual|total)?[\s_-]*(weight|qty|quantity|qtl|quintal)/i,
    /ਵਜ਼ਨ|ਕੁਇੰਟਲ/i,
  ]);
  const colRate = findHeaderColIndex(rawHeaders, [/rate|msp|price|ਰੇਟ/i]);
  const colAmount = findHeaderColIndex(rawHeaders, [
    /(net|payable|total|j[\s_-]*form|crop)?[\s_-]*(amount|value|payable)/i,
    /ਰਕਮ/i,
  ]);
  const colAgency = findHeaderColIndex(rawHeaders, [/agency|buyer|purchaser|ਏਜੰਸੀ/i]);
  const colCrop = findHeaderColIndex(rawHeaders, [/crop|commodity|variety|ਜਿਣਸ|ਕਿਸਮ/i]);

  if (colFarmer === -1 && colAmount === -1 && colBags === -1) {
    throw new Error(
      `Could not detect Anaaj Kharid columns in "${file.name}". Please ensure headers include Farmer Name, Bags, and Amount.`
    );
  }

  const out: ExtractedAnaajJForm[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = Array.isArray(rows[r]) ? rows[r] : [];
    const farmerName = colFarmer >= 0 ? safeStr(row[colFarmer]).trim() : '';
    const jFormNo = colJFormNo >= 0 ? safeStr(row[colJFormNo]).trim() : '';
    const rawBags = colBags >= 0 ? Math.max(0, Math.round(parseCleanNumber(row[colBags]))) : 0;
    let weightQtl = colWeight >= 0 ? Math.max(0, parseCleanNumber(row[colWeight])) : 0;
    // Detect if weight column header or large value indicates KG instead of Qtl
    const weightHeader = colWeight >= 0 ? rawHeaders[colWeight] : '';
    if (weightQtl > 0 && (/kg|kilogram/i.test(weightHeader) || (rawBags > 0 && weightQtl > rawBags * 5))) {
      weightQtl = weightQtl / 100;
    }

    const bags = rawBags > 0 ? rawBags : weightQtl > 0 ? Math.round(weightQtl / 0.375) : 0;
    let rate = colRate >= 0 ? Math.max(0, parseCleanNumber(row[colRate])) : 0;
    let amount = colAmount >= 0 ? Math.max(0, parseCleanNumber(row[colAmount])) : 0;

    // Skip summary/blank "Total" rows
    if (
      !farmerName ||
      /^(total|grand\s*total|sub\s*total|ਕੁੱਲ)/i.test(farmerName) ||
      (bags === 0 && amount === 0)
    ) {
      continue;
    }

    if (rate === 0 && amount > 0 && weightQtl > 0) {
      rate = Math.round((amount / weightQtl) * 100) / 100;
    } else if (rate === 0 && amount > 0 && bags > 0) {
      rate = Math.round((amount / (bags * 0.375)) * 100) / 100;
    } else if (rate === 0) {
      rate = defaultRate > 0 ? defaultRate : 2461;
    }

    if (amount === 0 && weightQtl > 0 && rate > 0) {
      amount = Math.round(weightQtl * rate * 100) / 100;
    } else if (amount === 0 && bags > 0 && rate > 0) {
      amount = Math.round(bags * 0.375 * rate * 100) / 100;
    }

    const agency = colAgency >= 0 ? safeStr(row[colAgency]).trim() : '';
    const crop = colCrop >= 0 ? safeStr(row[colCrop]).trim() : '';
    const notes = [agency, crop].filter(Boolean).join(' · ') || 'Anaaj Kharid Excel Import';

    out.push({
      tempId: `IMP_${Date.now()}_${r}_${Math.floor(Math.random() * 1000)}`,
      sourceFileName: file.name,
      jFormNo,
      date: colDate >= 0 ? normalizeAnyDateToIso(row[colDate]) : new Date().toISOString().split('T')[0],
      farmerName,
      fatherName: colFather >= 0 ? safeStr(row[colFather]).trim() : '',
      village: colVillage >= 0 ? safeStr(row[colVillage]).trim() : '',
      bags,
      weightQtl: Math.round(weightQtl * 1000) / 1000,
      rate: Math.round(rate * 100) / 100,
      jFormAmount: Math.round(amount * 100) / 100,
      agency,
      crop,
      notes,
    });
  }

  return out;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function getDocMimeType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return '';
}

export async function parseAnaajKharidFiles(
  files: File[],
  defaultRate: number
): Promise<ExtractedAnaajJForm[]> {
  const spreadsheetExts = new Set(['csv', 'xls', 'xlsx']);
  const docFiles: File[] = [];
  const sheetFiles: File[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (spreadsheetExts.has(ext) || file.type === 'text/csv') {
      sheetFiles.push(file);
    } else if (getDocMimeType(file)) {
      docFiles.push(file);
    } else {
      throw new Error(
        `Unsupported file format "${file.name}". Please upload PDF, JPG/PNG photo, or Excel/CSV from Anaaj Kharid.`
      );
    }
  }

  const results: ExtractedAnaajJForm[] = [];

  for (const sf of sheetFiles) {
    const sheetRows = await parseAnaajKharidSpreadsheetFile(sf, defaultRate);
    results.push(...sheetRows);
  }

  if (docFiles.length > 0) {
    // Process documents in batches of up to 4 files so payloads stay crisp and fast
    for (let i = 0; i < docFiles.length; i += 4) {
      const batch = docFiles.slice(i, i + 4);
      const payloadFiles = await Promise.all(
        batch.map(async (f) => ({
          name: f.name,
          mimeType: getDocMimeType(f),
          dataBase64: await fileToBase64(f),
        }))
      );

      const resp = await fetch('/api/mph/parse-jform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles, defaultRate }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(
          data?.error || `Failed to extract J-Form from uploaded file(s) (HTTP ${resp.status}).`
        );
      }

      const entries = Array.isArray(data?.entries) ? data.entries : [];
      entries.forEach((e: any, idx: number) => {
        results.push({
          tempId: `PDF_${Date.now()}_${i}_${idx}_${Math.floor(Math.random() * 1000)}`,
          sourceFileName: safeStr(e.sourceFileName, batch[0]?.name || 'J-Form.pdf'),
          jFormNo: safeStr(e.jFormNo),
          date: safeStr(e.date, new Date().toISOString().split('T')[0]),
          farmerName: safeStr(e.farmerName),
          fatherName: safeStr(e.fatherName),
          village: safeStr(e.village),
          bags: Math.max(0, Math.round(safeNum(e.bags))),
          weightQtl: Math.max(0, safeNum(e.weightQtl)),
          rate: Math.max(0, safeNum(e.rate)),
          jFormAmount: Math.max(0, safeNum(e.jFormAmount)),
          agency: safeStr(e.agency),
          crop: safeStr(e.crop),
          notes: safeStr(e.notes, 'Anaaj Kharid Import'),
        });
      });
    }
  }

  return results;
}

export function matchExtractedJForms(
  extractedList: ExtractedAnaajJForm[],
  farmers: MphFarmer[],
  existingJForms: MphJForm[]
): MatchedAnaajJFormRow[] {
  return extractedList.map((item) => {
    const targetRaw = normalizeNameKey(item.farmerName);
    const targetPa = toPaNormalized(item.farmerName);
    const targetFatherPa = toPaNormalized(item.fatherName);
    const targetVillagePa = toPaNormalized(item.village);

    let matchedFarmerId = CREATE_NEW_FARMER_ID;
    let holderRelation = 'Self';
    const jFormHolderName = item.farmerName || 'Farmer';
    let matchConfidence: 'exact' | 'holder' | 'fuzzy' | 'none' = 'none';

    // 1. Exact or transliterated match against Farmer Master
    let bestFarmer: MphFarmer | null = null;
    let bestScore = 0;

    for (const f of farmers) {
      const fRaw = normalizeNameKey(f.name);
      const fPa = toPaNormalized(f.name);
      if (!fRaw && !fPa) continue;

      if ((targetRaw && fRaw === targetRaw) || (targetPa && fPa === targetPa)) {
        let score = 1.0;
        if (targetFatherPa && toPaNormalized(f.fatherName) === targetFatherPa) score += 0.2;
        if (targetVillagePa && toPaNormalized(f.village) === targetVillagePa) score += 0.15;
        if (score > bestScore) {
          bestScore = score;
          bestFarmer = f;
          matchConfidence = 'exact';
        }
      } else {
        const overlap = Math.max(
          tokenOverlapScore(targetRaw, fRaw),
          tokenOverlapScore(targetPa, fPa)
        );
        if (overlap >= 0.72) {
          let score = overlap * 0.9;
          if (targetFatherPa && toPaNormalized(f.fatherName) === targetFatherPa) score += 0.15;
          if (targetVillagePa && toPaNormalized(f.village) === targetVillagePa) score += 0.1;
          if (score > bestScore) {
            bestScore = score;
            bestFarmer = f;
            matchConfidence = 'fuzzy';
          }
        }
      }
    }

    // 2. Check existing J-Form holder names (links Son/Wife/Hissedar J-Forms automatically!)
    if (!bestFarmer && (targetRaw || targetPa)) {
      for (const ej of existingJForms) {
        const hRaw = normalizeNameKey(ej.jFormHolderName);
        const hPa = toPaNormalized(ej.jFormHolderName);
        if ((targetRaw && hRaw === targetRaw) || (targetPa && hPa === targetPa)) {
          const parentFarmer = farmers.find((f) => f.id === ej.farmerId);
          if (parentFarmer) {
            bestFarmer = parentFarmer;
            holderRelation = ej.holderRelation || 'Other';
            matchConfidence = 'holder';
            break;
          }
        }
      }
    }

    if (bestFarmer) {
      matchedFarmerId = bestFarmer.id;
    }

    const dup =
      matchedFarmerId !== CREATE_NEW_FARMER_ID
        ? findDuplicateMphJForm(
            {
              farmerId: matchedFarmerId,
              jFormHolderName,
              date: item.date,
              bags: item.bags,
              jFormAmount: item.jFormAmount,
              jFormNo: item.jFormNo,
            },
            existingJForms
          )
        : null;

    const isDuplicate = Boolean(dup);

    return {
      ...item,
      selected: !isDuplicate && item.bags > 0 && item.jFormAmount > 0,
      matchedFarmerId,
      holderRelation,
      jFormHolderName,
      isDuplicate,
      matchConfidence,
    };
  });
}
