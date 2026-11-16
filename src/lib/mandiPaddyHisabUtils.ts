import {
  DEFAULT_MPH_SETTINGS,
  MphAdvance,
  MphArrival,
  MphDryingRateBreakdownItem,
  MphFarmer,
  MphFarmerAccountSummary,
  MphInterestBasis,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../types/mandiPaddyHisab';

// Standard Mandi Bag Packing = 37.5 KG = 37,500 Grams
export const BAG_GRAMS = 37500;
export const QUINTAL_GRAMS = 100000;
export const KG_GRAMS = 1000;

export function safeStr(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

export function safeNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function safeDateStr(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  if (value && typeof value === 'object') {
    const obj = value as { toDate?: () => Date; seconds?: number };
    if (typeof obj.toDate === 'function') {
      try {
        const d = obj.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch {
        // ignore conversion error
      }
    }
    if (typeof obj.seconds === 'number' && Number.isFinite(obj.seconds)) {
      const d = new Date(obj.seconds * 1000);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
  }
  return fallback;
}

function compareSafeStr(a: unknown, b: unknown): number {
  return safeStr(a).localeCompare(safeStr(b));
}

export interface WeightBreakdown {
  totalGrams: number;
  totalQuintals: number;
  weightQtlPart: number;
  weightKgPart: number;
  weightGmPart: number;
}

/**
 * Computes exact paddy weight from bag quantity and separate loose KG/GM.
 * Uses integer grams so calculations like 1539 bags = 577 Qtl 12 KG 500 GM
 * never suffer floating-point rounding drift.
 */
export function calculatePaddyWeight(
  bags: number,
  looseKg: number,
  looseGm: number
): WeightBreakdown {
  const safeBags = Math.max(0, Math.floor(safeNum(bags)));
  const safeLooseKg = Math.max(0, Math.floor(safeNum(looseKg)));
  const safeLooseGm = Math.max(0, Math.floor(safeNum(looseGm)));

  const bagGrams = safeBags * BAG_GRAMS;
  const looseGrams = safeLooseKg * KG_GRAMS + safeLooseGm;
  const totalGrams = bagGrams + looseGrams;

  const weightQtlPart = Math.floor(totalGrams / QUINTAL_GRAMS);
  const remAfterQtl = totalGrams % QUINTAL_GRAMS;
  const weightKgPart = Math.floor(remAfterQtl / KG_GRAMS);
  const weightGmPart = remAfterQtl % KG_GRAMS;
  const totalQuintals = Number((totalGrams / QUINTAL_GRAMS).toFixed(5));

  return {
    totalGrams,
    totalQuintals,
    weightQtlPart,
    weightKgPart,
    weightGmPart,
  };
}

/**
 * Sums bags, loose weight, and total weight across a list of arrivals cleanly in integer grams.
 */
export function sumPaddyWeights(arrivals: MphArrival[]) {
  let totalBags = 0;
  let totalLooseGrams = 0;
  let totalGrams = 0;

  const list = Array.isArray(arrivals) ? arrivals : [];
  for (const a of list) {
    if (!a) continue;
    const b = Math.max(0, Math.floor(safeNum(a.bags)));
    const lKg = Math.max(0, Math.floor(safeNum(a.looseKg)));
    const lGm = Math.max(0, Math.floor(safeNum(a.looseGm)));
    const looseG = lKg * KG_GRAMS + lGm;
    totalBags += b;
    totalLooseGrams += looseG;
    totalGrams += b * BAG_GRAMS + looseG;
  }

  const totalLooseKg = Math.floor(totalLooseGrams / KG_GRAMS);
  const totalLooseGm = totalLooseGrams % KG_GRAMS;

  const weightQtlPart = Math.floor(totalGrams / QUINTAL_GRAMS);
  const remAfterQtl = totalGrams % QUINTAL_GRAMS;
  const weightKgPart = Math.floor(remAfterQtl / KG_GRAMS);
  const weightGmPart = remAfterQtl % KG_GRAMS;
  const totalQuintals = Number((totalGrams / QUINTAL_GRAMS).toFixed(5));

  return {
    totalBags,
    totalLooseKg,
    totalLooseGm,
    totalGrams,
    totalQuintals,
    weightQtlPart,
    weightKgPart,
    weightGmPart,
  };
}

export function calculatePaddyAmount(totalQuintals: number, ratePerQuintal: number): number {
  const qtl = Math.max(0, safeNum(totalQuintals));
  const rate = Math.max(0, safeNum(ratePerQuintal));
  return Math.round(qtl * rate * 100) / 100;
}

export function formatWeightQKG(
  qtl: number,
  kg: number,
  gm: number,
  lang: 'en' | 'pa' = 'en'
): string {
  const q = Math.floor(safeNum(qtl));
  const k = Math.floor(safeNum(kg));
  const g = Math.floor(safeNum(gm));
  if (lang === 'pa') {
    return `${q} ਕੁਇੰ ${k} ਕਿੱਲੋ ${g} ਗ੍ਰਾਮ`;
  }
  return `${q} Qtl ${k} KG ${g} GM`;
}

export function formatLooseKgGm(
  kg: number,
  gm: number,
  lang: 'en' | 'pa' = 'en'
): string {
  const safeKg = Math.max(0, Math.floor(safeNum(kg)));
  const safeGm = Math.max(0, Math.floor(safeNum(gm)));
  if (lang === 'pa') {
    if (safeKg === 0 && safeGm === 0) return '0 ਕਿੱਲੋ';
    if (safeGm === 0) return `${safeKg} ਕਿੱਲੋ`;
    if (safeKg === 0) return `${safeGm} ਗ੍ਰਾਮ`;
    return `${safeKg} ਕਿੱਲੋ ${safeGm} ਗ੍ਰਾਮ`;
  }
  if (safeKg === 0 && safeGm === 0) return '0 KG';
  if (safeGm === 0) return `${safeKg} KG`;
  if (safeKg === 0) return `${safeGm} GM`;
  return `${safeKg} KG ${safeGm} GM`;
}

const PA_WORD_MAP: Record<string, string> = {
  // Common Punjabi names & surnames
  singh: 'ਸਿੰਘ',
  kaur: 'ਕੌਰ',
  kumar: 'ਕੁਮਾਰ',
  kumari: 'ਕੁਮਾਰੀ',
  sharma: 'ਸ਼ਰਮਾ',
  verma: 'ਵਰਮਾ',
  gupta: 'ਗੁਪਤਾ',
  mittal: 'ਮਿੱਤਲ',
  bansal: 'ਬਾਂਸਲ',
  mahajan: 'ਮਹਾਜਨ',
  arora: 'ਅਰੋੜਾ',
  malhotra: 'ਮਲਹੋਤਰਾ',
  chopra: 'ਚੋਪੜਾ',
  bedi: 'ਬੇਦੀ',
  maan: 'ਮਾਨ',
  mann: 'ਮਾਨ',
  gill: 'ਗਿੱਲ',
  sandhu: 'ਸੰਧੂ',
  sidhu: 'ਸਿੱਧੂ',
  dhillon: 'ਢਿੱਲੋਂ',
  brar: 'ਬਰਾੜ',
  virk: 'ਵਿਰਕ',
  cheema: 'ਚੀਮਾ',
  bajwa: 'ਬਾਜਵਾ',
  randhawa: 'ਰੰਧਾਵਾ',
  grewal: 'ਗਰੇਵਾਲ',
  bains: 'ਬੈਂਸ',
  kaler: 'ਕਲੇਰ',
  aujla: 'ਔਜਲਾ',
  bhullar: 'ਭੁੱਲਰ',
  chahal: 'ਚਾਹਲ',
  johal: 'ਜੋਹਲ',
  kang: 'ਕੰਗ',
  saini: 'ਸੈਣੀ',
  kamboj: 'ਕੰਬੋਜ',
  sohi: 'ਸੋਹੀ',
  sekhon: 'ਸੇਖੋਂ',
  deol: 'ਦਿਓਲ',
  tiwana: 'ਟਿਵਾਣਾ',
  dhaliwal: 'ਧਾਲੀਵਾਲ',
  uppal: 'ਉੱਪਲ',
  dosanjh: 'ਦੋਸਾਂਝ',
  heer: 'ਹੀਰ',
  jatt: 'ਜੱਟ',
  ram: 'ਰਾਮ',
  lal: 'ਲਾਲ',
  chand: 'ਚੰਦ',
  devi: 'ਦੇਵੀ',
  rani: 'ਰਾਣੀ',
  bibi: 'ਬੀਬੀ',
  harpreet: 'ਹਰਪ੍ਰੀਤ',
  gurpreet: 'ਗੁਰਪ੍ਰੀਤ',
  manpreet: 'ਮਨਪ੍ਰੀਤ',
  jaspreet: 'ਜਸਪ੍ਰੀਤ',
  lovepreet: 'ਲਵਪ੍ਰੀਤ',
  arshdeep: 'ਅਰਸ਼ਦੀਪ',
  amandeep: 'ਅਮਨਦੀਪ',
  mandeep: 'ਮਨਦੀਪ',
  sandeep: 'ਸੰਦੀਪ',
  navdeep: 'ਨਵਦੀਪ',
  kuldeep: 'ਕੁਲਦੀਪ',
  sukhdev: 'ਸੁਖਦੇਵ',
  baldev: 'ਬਲਦੇਵ',
  gurdev: 'ਗੁਰਦੇਵ',
  hardev: 'ਹਰਦੇਵ',
  harjinder: 'ਹਰਜਿੰਦਰ',
  rajinder: 'ਰਾਜਿੰਦਰ',
  surinder: 'ਸੁਰਿੰਦਰ',
  narinder: 'ਨਰਿੰਦਰ',
  varinder: 'ਵਰਿੰਦਰ',
  parminder: 'ਪਰਮਿੰਦਰ',
  harminder: 'ਹਰਮਿੰਦਰ',
  sukhwinder: 'ਸੁਖਵਿੰਦਰ',
  sukhvinder: 'ਸੁਖਵਿੰਦਰ',
  lakhwinder: 'ਲਖਵਿੰਦਰ',
  balwinder: 'ਬਲਵਿੰਦਰ',
  kulwinder: 'ਕੁਲਵਿੰਦਰ',
  bhupinder: 'ਭੁਪਿੰਦਰ',
  joginder: 'ਜੋਗਿੰਦਰ',
  mohinder: 'ਮੋਹਿੰਦਰ',
  paramjit: 'ਪਰਮਜੀਤ',
  paramjeet: 'ਪਰਮਜੀਤ',
  simranjit: 'ਸਿਮਰਨਜੀਤ',
  simranjeet: 'ਸਿਮਰਨਜੀਤ',
  baljit: 'ਬਲਜੀਤ',
  baljeet: 'ਬਲਜੀਤ',
  manjit: 'ਮਨਜੀਤ',
  manjeet: 'ਮਨਜੀਤ',
  ranjit: 'ਰਣਜੀਤ',
  ranjeet: 'ਰਣਜੀਤ',
  charanjit: 'ਚਰਨਜੀਤ',
  amarjit: 'ਅਮਰਜੀਤ',
  sarabjit: 'ਸਰਬਜੀਤ',
  harjit: 'ਹਰਜੀਤ',
  harjeet: 'ਹਰਜੀਤ',
  gurjit: 'ਗੁਰਜੀਤ',
  gurjeet: 'ਗੁਰਜੀਤ',
  jagjit: 'ਜਗਜੀਤ',
  jagjeet: 'ਜਗਜੀਤ',
  kuljit: 'ਕੁਲਜੀਤ',
  kuljeet: 'ਕੁਲਜੀਤ',
  daljit: 'ਦਲਜੀਤ',
  daljeet: 'ਦਲਜੀਤ',
  baljinder: 'ਬਲਜਿੰਦਰ',
  satwinder: 'ਸਤਵਿੰਦਰ',
  satpal: 'ਸਤਪਾਲ',
  satnam: 'ਸਤਨਾਮ',
  gurmeet: 'ਗੁਰਮੀਤ',
  harmeet: 'ਹਰਮੀਤ',
  darshan: 'ਦਰਸ਼ਨ',
  tarsem: 'ਤਰਸੇਮ',
  jarnail: 'ਜਰਨੈਲ',
  karnail: 'ਕਰਨੈਲ',
  balbir: 'ਬਲਬੀਰ',
  harbans: 'ਹਰਬੰਸ',
  gurbachan: 'ਗੁਰਬਚਨ',
  avtar: 'ਅਵਤਾਰ',
  jagtar: 'ਜਗਤਾਰ',
  dilraj: 'ਦਿਲਰਾਜ',
  gurmej: 'ਗੁਰਮੇਜ',
  gurjant: 'ਗੁਰਜੰਟ',
  jagsir: 'ਜਗਸੀਰ',
  nirmal: 'ਨਿਰਮਲ',
  gursewak: 'ਗੁਰਸੇਵਕ',
  gursevak: 'ਗੁਰਸੇਵਕ',
  jagdish: 'ਜਗਦੀਸ਼',
  harbhajan: 'ਹਰਭਜਨ',
  gurmukh: 'ਗੁਰਮੁਖ',
  piara: 'ਪਿਆਰਾ',
  gian: 'ਗਿਆਨ',
  sewa: 'ਸੇਵਾ',
  banta: 'ਬੰਤਾ',
  santa: 'ਸੰਤਾ',
  sona: 'ਸੋਨਾ',
  kaka: 'ਕਾਕਾ',
  raju: 'ਰਾਜੂ',
  happy: 'ਹੈਪੀ',
  sunny: 'ਸਨੀ',
  vicky: 'ਵਿੱਕੀ',
  // Villages & Towns
  pind: 'ਪਿੰਡ',
  village: 'ਪਿੰਡ',
  mandi: 'ਮੰਡੀ',
  kalan: 'ਕਲਾਂ',
  khurd: 'ਖੁਰਦ',
  chak: 'ਚੱਕ',
  kot: 'ਕੋਟ',
  majra: 'ਮਾਜਰਾ',
  kapurthala: 'ਕਪੂਰਥਲਾ',
  jalandhar: 'ਜਲੰਧਰ',
  ludhiana: 'ਲੁਧਿਆਣਾ',
  amritsar: 'ਅੰਮ੍ਰਿਤਸਰ',
  patiala: 'ਪਟਿਆਲਾ',
  bathinda: 'ਬਠਿੰਡਾ',
  moga: 'ਮੋਗਾ',
  firozpur: 'ਫਿਰੋਜ਼ਪੁਰ',
  ferozepur: 'ਫਿਰੋਜ਼ਪੁਰ',
  hoshiarpur: 'ਹੁਸ਼ਿਆਰਪੁਰ',
  sangrur: 'ਸੰਗਰੂਰ',
  mansa: 'ਮਾਨਸਾ',
  tarn: 'ਤਰਨ',
  taran: 'ਤਾਰਨ',
  muktsar: 'ਮੁਕਤਸਰ',
  faridkot: 'ਫਰੀਦਕੋਟ',
  fazilka: 'ਫਾਜ਼ਿਲਕਾ',
  barnala: 'ਬਰਨਾਲਾ',
  gurdaspur: 'ਗੁਰਦਾਸਪੁਰ',
  pathankot: 'ਪਠਾਨਕੋਟ',
  rupnagar: 'ਰੋਪੜ',
  ropar: 'ਰੋਪੜ',
  mohali: 'ਮੋਹਾਲੀ',
  fatehgarh: 'ਫਤਿਹਗੜ੍ਹ',
  sahib: 'ਸਾਹਿਬ',
  nawanshahr: 'ਨਵਾਂਸ਼ਹਿਰ',
  malerkotla: 'ਮਲੇਰਕੋਟਲਾ',
  sultanpur: 'ਸੁਲਤਾਨਪੁਰ',
  lodhi: 'ਲੋਧੀ',
  nakodar: 'ਨਕੋਦਰ',
  phagwara: 'ਫਗਵਾੜਾ',
  batala: 'ਬਟਾਲਾ',
  khanna: 'ਖੰਨਾ',
  raikot: 'ਰਾਏਕੋਟ',
  jagraon: 'ਜਗਰਾਉਂ',
  jagron: 'ਜਗਰਾਉਂ',
  abohar: 'ਅਬੋਹਰ',
  zira: 'ਜ਼ੀਰਾ',
  bholath: 'ਭੋਲਥ',
  nadala: 'ਨਡਾਲਾ',
  begowal: 'ਬੇਗੋਵਾਲ',
  bhadaur: 'ਭਦੌੜ',
  talwandi: 'ਤਲਵੰਡੀ',
  kala: 'ਕਾਲਾ',
  sanghian: 'ਸੰਘਿਆਂ',
  // Common Mandi / Accounting terms
  'pre-season': 'ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ',
  preseason: 'ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ',
  pre: 'ਪਹਿਲਾਂ',
  season: 'ਸੀਜ਼ਨ',
  advance: 'ਪੇਸ਼ਗੀ',
  cash: 'ਨਕਦ',
  diesel: 'ਡੀਜ਼ਲ',
  petrol: 'ਪੈਟਰੋਲ',
  tractor: 'ਟਰੈਕਟਰ',
  trolley: 'ਟਰਾਲੀ',
  seed: 'ਬੀਜ',
  seeds: 'ਬੀਜ',
  fertilizer: 'ਖਾਦ',
  khaad: 'ਖਾਦ',
  urea: 'ਯੂਰੀਆ',
  dap: 'ਡੀ.ਏ.ਪੀ.',
  spray: 'ਸਪਰੇਅ',
  payment: 'ਅਦਾਇਗੀ',
  payments: 'ਅਦਾਇਗੀਆਂ',
  received: 'ਪ੍ਰਾਪਤ',
  paid: 'ਦਿੱਤੇ',
  given: 'ਦਿੱਤੇ',
  nagad: 'ਨਕਦ',
  kharcha: 'ਖਰਚਾ',
  theka: 'ਠੇਕਾ',
  khad: 'ਖਾਦ',
  beej: 'ਬੀਜ',
  other: 'ਹੋਰ',
  work: 'ਕੰਮ',
  for: 'ਲਈ',
  from: 'ਤੋਂ',
  to: 'ਨੂੰ',
  and: 'ਅਤੇ',
  or: 'ਜਾਂ',
  labour: 'ਲੇਬਰ',
  labor: 'ਲੇਬਰ',
  drying: 'ਸੁਕਾਈ',
  commission: 'ਆੜ੍ਹਤ',
  interest: 'ਵਿਆਜ',
  loan: 'ਕਰਜ਼ਾ',
  bank: 'ਬੈਂਕ',
  transfer: 'ਟਰਾਂਸਫਰ',
  cheque: 'ਚੈੱਕ',
  check: 'ਚੈੱਕ',
  rtgs: 'ਆਰ.ਟੀ.ਜੀ.ਐਸ.',
  neft: 'ਐਨ.ਈ.ਐਫ.ਟੀ.',
  upi: 'ਯੂ.ਪੀ.ਆਈ.',
  account: 'ਖਾਤਾ',
  balance: 'ਬਕਾਇਆ',
  paddy: 'ਝੋਨਾ',
  hybrid: 'ਹਾਈਬ੍ਰਿਡ',
  grade: 'ਗ੍ਰੇਡ',
  gurde: 'ਗ੍ਰੇਡ',
  lot: 'ਲਾਟ',
  bag: 'ਬੈਗ',
  bags: 'ਬੈਗ',
  wife: 'ਪਤਨੀ',
  son: 'ਪੁੱਤਰ',
  father: 'ਪਿਤਾ',
  brother: 'ਭਰਾ',
  hissedar: 'ਹਿੱਸੇਦਾਰ',
  self: 'ਖੁਦ',
  kisan: 'ਕਿਸਾਨ',
  farmer: 'ਕਿਸਾਨ',
  punjab: 'ਪੰਜਾਬ',
  traders: 'ਟ੍ਰੇਡਰਜ਼',
  trading: 'ਟ੍ਰੇਡਿੰਗ',
  company: 'ਕੰਪਨੀ',
  co: 'ਕੰਪਨੀ',
  bill: 'ਬਿੱਲ',
  no: 'ਨੰ.',
  date: 'ਤਾਰੀਖ',
  note: 'ਨੋਟ',
  extra: 'ਵਾਧੂ',
  less: 'ਘੱਟ',
  return: 'ਵਾਪਸੀ',
};

const PA_PHRASE_MAP: Array<[RegExp, string]> = [
  [/\bpre[-\s]*season\s+advance\b/gi, 'ਸੀਜ਼ਨ ਤੋਂ ਪਹਿਲਾਂ ਪੇਸ਼ਗੀ'],
  [/\bother\s+work\s+payment\b/gi, 'ਹੋਰ ਕੰਮ ਲਈ ਰਕਮ'],
  [/\bother\s+payment\b/gi, 'ਹੋਰ ਅਦਾਇਗੀ'],
  [/\bcash\s+advance\b/gi, 'ਨਕਦ ਪੇਸ਼ਗੀ'],
  [/\bcash\s+paid\b/gi, 'ਨਕਦ ਦਿੱਤੇ'],
  [/\bpayment\s+received\b/gi, 'ਅਦਾਇਗੀ ਪ੍ਰਾਪਤ'],
  [/\bfertilizer\s*\/\s*seed\b/gi, 'ਖਾਦ / ਬੀਜ'],
  [/\bdiesel\s*\/\s*tractor\b/gi, 'ਡੀਜ਼ਲ / ਟਰੈਕਟਰ'],
  [/\bhybrid\s+paddy\b/gi, 'ਹਾਈਬ੍ਰਿਡ ਝੋਨਾ'],
  [/\bpaddy\s+a\s+gurde\b/gi, 'ਝੋਨਾ ਏ ਗ੍ਰੇਡ'],
  [/\bpaddy\s+a\s+grade\b/gi, 'ਝੋਨਾ ਏ ਗ੍ਰੇਡ'],
  [/\bs\s*\/\s*o\b/gi, 'ਪੁੱਤਰ'],
  [/\bw\s*\/\s*o\b/gi, 'ਪਤਨੀ'],
  [/\bd\s*\/\s*o\b/gi, 'ਪੁੱਤਰੀ'],
];

const INITIAL_VOWELS: Array<[string, string]> = [
  ['aa', 'ਆ'],
  ['ee', 'ਈ'],
  ['ii', 'ਈ'],
  ['oo', 'ਊ'],
  ['uu', 'ਊ'],
  ['ai', 'ਐ'],
  ['au', 'ਔ'],
  ['ou', 'ਔ'],
  ['a', 'ਅ'],
  ['i', 'ਇ'],
  ['e', 'ਏ'],
  ['u', 'ਉ'],
  ['o', 'ਓ'],
];

const MEDIAL_VOWELS: Array<[string, string]> = [
  ['aa', 'ਾ'],
  ['ee', 'ੀ'],
  ['ii', 'ੀ'],
  ['oo', 'ੂ'],
  ['uu', 'ੂ'],
  ['ai', 'ੈ'],
  ['au', 'ੌ'],
  ['ou', 'ੌ'],
  ['ey', 'ੇ'],
  ['ay', 'ੇ'],
  ['ia', 'ਿਆ'],
  ['ea', 'ੀ'],
  ['a', ''],
  ['i', 'ਿ'],
  ['e', 'ੇ'],
  ['u', 'ੁ'],
  ['o', 'ੋ'],
];

const CONSONANTS: Array<[string, string]> = [
  ['chh', 'ਛ'],
  ['ksh', 'ਕਸ਼'],
  ['sh', 'ਸ਼'],
  ['kh', 'ਖ'],
  ['gh', 'ਘ'],
  ['ch', 'ਚ'],
  ['jh', 'ਝ'],
  ['th', 'ਥ'],
  ['dh', 'ਧ'],
  ['bh', 'ਭ'],
  ['ph', 'ਫ'],
  ['ng', 'ੰਗ'],
  ['nk', 'ੰਕ'],
  ['k', 'ਕ'],
  ['g', 'ਗ'],
  ['c', 'ਕ'],
  ['j', 'ਜ'],
  ['z', 'ਜ਼'],
  ['t', 'ਤ'],
  ['d', 'ਦ'],
  ['n', 'ਨ'],
  ['p', 'ਪ'],
  ['f', 'ਫ'],
  ['b', 'ਬ'],
  ['m', 'ਮ'],
  ['y', 'ਯ'],
  ['r', 'ਰ'],
  ['l', 'ਲ'],
  ['v', 'ਵ'],
  ['w', 'ਵ'],
  ['s', 'ਸ'],
  ['h', 'ਹ'],
  ['q', 'ਕ'],
  ['x', 'ਕਸ'],
];

const VOWEL_CHARS = new Set(['a', 'e', 'i', 'o', 'u']);
const LONG_MATRAS = new Set(['ਾ', 'ੀ', 'ੇ', 'ੈ', 'ੋ', 'ੌ', 'ੂ']);

function transliterateRomanWordToGurmukhi(word: string): string {
  const lower = word.toLowerCase();
  if (!lower) return word;
  if (PA_WORD_MAP[lower]) return PA_WORD_MAP[lower];

  // Handle common village/name suffixes when attached directly (e.g. Gobindpur, Rampura)
  if (lower.endsWith('singh') && lower.length > 5) {
    return `${transliterateRomanWordToGurmukhi(lower.slice(0, -5))} ਸਿੰਘ`;
  }
  if (lower.endsWith('pur') && lower.length > 3) {
    return `${transliterateRomanWordToGurmukhi(lower.slice(0, -3))}ਪੁਰ`;
  }
  if (lower.endsWith('wala') && lower.length > 4) {
    return `${transliterateRomanWordToGurmukhi(lower.slice(0, -4))}ਵਾਲਾ`;
  }
  if (lower.endsWith('wali') && lower.length > 4) {
    return `${transliterateRomanWordToGurmukhi(lower.slice(0, -4))}ਵਾਲੀ`;
  }
  if (lower.endsWith('garh') && lower.length > 4) {
    return `${transliterateRomanWordToGurmukhi(lower.slice(0, -4))}ਗੜ੍ਹ`;
  }

  let out = '';
  let i = 0;
  let lastMatra = '';
  let prevWasConsonant = false;

  while (i < lower.length) {
    const rest = lower.slice(i);

    // Word-initial vowel
    if (i === 0) {
      let matchedVowel = false;
      for (const [pat, g] of INITIAL_VOWELS) {
        if (rest.startsWith(pat)) {
          out += g;
          i += pat.length;
          lastMatra = g;
          prevWasConsonant = false;
          matchedVowel = true;
          break;
        }
      }
      if (matchedVowel) continue;
    }

    // Medial/final vowel after consonant (or another vowel)
    if (VOWEL_CHARS.has(lower[i])) {
      let matched = false;
      for (const [pat, matra] of MEDIAL_VOWELS) {
        if (rest.startsWith(pat)) {
          // Trailing 'a' -> 'ਾ', trailing 'i' -> 'ੀ', trailing 'u' -> 'ੂ'
          if (i + pat.length === lower.length && prevWasConsonant) {
            if (pat === 'a') {
              out += 'ਾ';
              lastMatra = 'ਾ';
            } else if (pat === 'i') {
              out += 'ੀ';
              lastMatra = 'ੀ';
            } else if (pat === 'u') {
              out += 'ੂ';
              lastMatra = 'ੂ';
            } else {
              out += matra;
              lastMatra = matra;
            }
          } else {
            out += matra;
            lastMatra = matra;
          }
          i += pat.length;
          prevWasConsonant = false;
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }

    // Handle doubled identical consonant (e.g., 'll', 'pp', 'kk', 'tt', 'dd', 'ss', 'nn', 'mm', 'bb', 'gg')
    if (
      i + 1 < lower.length &&
      lower[i] === lower[i + 1] &&
      !VOWEL_CHARS.has(lower[i]) &&
      'klptdsmnbg'.includes(lower[i])
    ) {
      out += 'ੱ';
      i += 1;
      prevWasConsonant = false;
      continue;
    }

    // Handle nasal 'n' or 'm' before a stop consonant (nt, nd, nk, mp, mb, nj, nch)
    if (
      (lower[i] === 'n' || lower[i] === 'm') &&
      i > 0 &&
      i + 1 < lower.length &&
      !VOWEL_CHARS.has(lower[i + 1]) &&
      lower[i + 1] !== 'h' &&
      lower[i + 1] !== 'y' &&
      lower[i + 1] !== 'r' &&
      lower[i + 1] !== 'l' &&
      lower[i + 1] !== 'v' &&
      lower[i + 1] !== 'w' &&
      !(lower[i] === 'm' && lower[i + 1] !== 'p' && lower[i + 1] !== 'b')
    ) {
      out += LONG_MATRAS.has(lastMatra) ? 'ਂ' : 'ੰ';
      i += 1;
      prevWasConsonant = false;
      continue;
    }

    // Trailing 'y' after consonant -> 'ੀ' (e.g., Bobby -> ਬੌਬੀ, Happy -> ਹੈਪੀ)
    if (lower[i] === 'y' && i === lower.length - 1 && prevWasConsonant) {
      out += 'ੀ';
      i += 1;
      prevWasConsonant = false;
      continue;
    }

    // Consonant match
    let matchedCons = false;
    for (const [pat, g] of CONSONANTS) {
      if (rest.startsWith(pat)) {
        out += g;
        i += pat.length;
        lastMatra = '';
        prevWasConsonant = true;
        matchedCons = true;
        break;
      }
    }
    if (matchedCons) continue;

    // Fallback: emit char as-is
    out += word[i];
    i += 1;
    prevWasConsonant = false;
  }

  return out;
}

export function transliterateToPunjabi(input: unknown): string {
  const text = safeStr(input);
  if (!text) return '';

  let result = text;
  for (const [regex, replacement] of PA_PHRASE_MAP) {
    result = result.replace(regex, replacement);
  }

  return result.replace(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g, (token) => {
    const lowerToken = token.toLowerCase();
    if (PA_WORD_MAP[lowerToken]) return PA_WORD_MAP[lowerToken];
    if (token.includes('-')) {
      return token
        .split('-')
        .map((part) => transliterateRomanWordToGurmukhi(part))
        .join('-');
    }
    return transliterateRomanWordToGurmukhi(token);
  });
}

export function displayMphText(input: unknown, lang: 'en' | 'pa'): string {
  const str = safeStr(input);
  if (!str || lang !== 'pa') return str;
  return transliterateToPunjabi(str);
}

export function formatINR(value: number, showDecimals = true): string {
  const num = safeNum(value);
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

const EN_ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const EN_TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitsEn(n: number): string {
  if (n === 0) return '';
  if (n < 20) return EN_ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones > 0 ? `${EN_TENS[tens]} ${EN_ONES[ones]}` : EN_TENS[tens];
}

function threeDigitsEn(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${EN_ONES[hundreds]} Hundred`);
  if (rem > 0) parts.push(twoDigitsEn(rem));
  return parts.join(' ');
}

function numberToIndianWordsEn(num: number): string {
  const whole = Math.floor(Math.abs(safeNum(num)));
  if (whole === 0) return 'Zero';

  const parts: string[] = [];
  const arab = Math.floor(whole / 1000000000);
  const afterArab = whole % 1000000000;
  const crore = Math.floor(afterArab / 10000000);
  const afterCrore = afterArab % 10000000;
  const lakh = Math.floor(afterCrore / 100000);
  const afterLakh = afterCrore % 100000;
  const thousand = Math.floor(afterLakh / 1000);
  const rem = afterLakh % 1000;

  if (arab > 0) parts.push(`${numberToIndianWordsEn(arab)} Arab`);
  if (crore > 0) parts.push(`${twoDigitsEn(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigitsEn(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigitsEn(thousand)} Thousand`);
  if (rem > 0) parts.push(threeDigitsEn(rem));

  return parts.join(' ').trim();
}

const PA_0_TO_99 = [
  'ਜ਼ੀਰੋ',
  'ਇੱਕ',
  'ਦੋ',
  'ਤਿੰਨ',
  'ਚਾਰ',
  'ਪੰਜ',
  'ਛੇ',
  'ਸੱਤ',
  'ਅੱਠ',
  'ਨੌਂ',
  'ਦਸ',
  'ਗਿਆਰਾਂ',
  'ਬਾਰਾਂ',
  'ਤੇਰਾਂ',
  'ਚੌਦਾਂ',
  'ਪੰਦਰਾਂ',
  'ਸੋਲ਼ਾਂ',
  'ਸਤਾਰਾਂ',
  'ਅਠਾਰਾਂ',
  'ਉੱਨੀ',
  'ਵੀਹ',
  'ਇੱਕੀ',
  'ਬਾਈ',
  'ਤੇਈ',
  'ਚੌਵੀ',
  'ਪੰਜੀ',
  'ਛੱਬੀ',
  'ਸਤਾਈ',
  'ਅਠਾਈ',
  'ਉਨੱਤੀ',
  'ਤੀਹ',
  'ਇਕੱਤੀ',
  'ਬੱਤੀ',
  'ਤੇਤੀ',
  'ਚੌਂਤੀ',
  'ਪੈਂਤੀ',
  'ਛੱਤੀ',
  'ਸੈਂਤੀ',
  'ਅਠੱਤੀ',
  'ਉਨਤਾਲੀ',
  'ਚਾਲ਼ੀ',
  'ਇਕਤਾਲ਼ੀ',
  'ਬਿਆਲ਼ੀ',
  'ਤਰਤਾਲ਼ੀ',
  'ਚੁਤਾਲ਼ੀ',
  'ਪੰਤਾਲ਼ੀ',
  'ਛਿਆਲ਼ੀ',
  'ਸੰਤਾਲ਼ੀ',
  'ਅਠਤਾਲ਼ੀ',
  'ਉਣੰਜਾ',
  'ਪੰਜਾਹ',
  'ਇਕਵੰਜਾ',
  'ਬਵੰਜਾ',
  'ਤਰਵੰਜਾ',
  'ਚੁਰੰਜਾ',
  'ਪਚਵੰਜਾ',
  'ਛਪੰਜਾ',
  'ਸਤਵੰਜਾ',
  'ਅਠਵੰਜਾ',
  'ਉਣਾਹਠ',
  'ਸੱਠ',
  'ਇਕਾਹਠ',
  'ਬਾਹਠ',
  'ਤ੍ਰੇਹਠ',
  'ਚੌਂਹਠ',
  'ਪੈਂਹਠ',
  'ਛਿਆਹਠ',
  'ਸਤਾਹਠ',
  'ਅਠਾਹਠ',
  'ਉਣੱਤਰ',
  'ਸੱਤਰ',
  'ਇਕੱਤਰ',
  'ਬਹੱਤਰ',
  'ਤਿਹੱਤਰ',
  'ਚੁਹੱਤਰ',
  'ਪੰਜੱਤਰ',
  'ਛਿਹੱਤਰ',
  'ਸਤੱਤਰ',
  'ਅਠੱਤਰ',
  'ਉਣਾਸੀ',
  'ਅੱਸੀ',
  'ਇਕਾਸੀ',
  'ਬਿਆਸੀ',
  'ਤਿਰਾਸੀ',
  'ਚੁਰਾਸੀ',
  'ਪਚਾਸੀ',
  'ਛਿਆਸੀ',
  'ਸਤਾਸੀ',
  'ਅਠਾਸੀ',
  'ਉਣਾਨਵੇਂ',
  'ਨੱਬੇ',
  'ਇਕਾਨਵੇਂ',
  'ਬਾਨਵੇਂ',
  'ਤਿਰਾਨਵੇਂ',
  'ਚੁਰਾਨਵੇਂ',
  'ਪਚਾਨਵੇਂ',
  'ਛਿਆਨਵੇਂ',
  'ਸਤਾਨਵੇਂ',
  'ਅਠਾਨਵੇਂ',
  'ਨੜਿੱਨਵੇਂ',
];

function threeDigitsPa(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${PA_0_TO_99[hundreds]} ਸੌ`);
  if (rem > 0) parts.push(PA_0_TO_99[rem]);
  return parts.join(' ');
}

function numberToIndianWordsPa(num: number): string {
  const whole = Math.floor(Math.abs(safeNum(num)));
  if (whole === 0) return PA_0_TO_99[0];

  const parts: string[] = [];
  const arab = Math.floor(whole / 1000000000);
  const afterArab = whole % 1000000000;
  const crore = Math.floor(afterArab / 10000000);
  const afterCrore = afterArab % 10000000;
  const lakh = Math.floor(afterCrore / 100000);
  const afterLakh = afterCrore % 100000;
  const thousand = Math.floor(afterLakh / 1000);
  const rem = afterLakh % 1000;

  if (arab > 0) parts.push(`${numberToIndianWordsPa(arab)} ਅਰਬ`);
  if (crore > 0) parts.push(`${PA_0_TO_99[crore]} ਕਰੋੜ`);
  if (lakh > 0) parts.push(`${PA_0_TO_99[lakh]} ਲੱਖ`);
  if (thousand > 0) parts.push(`${PA_0_TO_99[thousand]} ਹਜ਼ਾਰ`);
  if (rem > 0) parts.push(threeDigitsPa(rem));

  return parts.join(' ').trim();
}

export function formatRupeesInWords(amount: number, lang: 'en' | 'pa'): string {
  const rounded = Math.round(Math.abs(safeNum(amount)));
  if (lang === 'pa') {
    if (rounded === 0) return 'ਜ਼ੀਰੋ ਰੁਪਏ ਸਿਰਫ਼';
    return `${numberToIndianWordsPa(rounded)} ਰੁਪਏ ਸਿਰਫ਼`;
  }
  if (rounded === 0) return 'Zero Rupees Only';
  return `Rupees ${numberToIndianWordsEn(rounded)} Only`;
}

export function getEffectiveArrivalDryingRate(
  arrival: Pick<MphArrival, 'dryingLaborRate'> | null | undefined,
  farmer: Pick<MphFarmer, 'dryingLaborRate'> | null | undefined,
  settings: Pick<MphSettings, 'paddyDryingLaborRate'> | null | undefined
): number {
  if (
    arrival &&
    typeof arrival.dryingLaborRate === 'number' &&
    Number.isFinite(arrival.dryingLaborRate) &&
    arrival.dryingLaborRate >= 0
  ) {
    return arrival.dryingLaborRate;
  }
  if (
    farmer &&
    typeof farmer.dryingLaborRate === 'number' &&
    Number.isFinite(farmer.dryingLaborRate) &&
    farmer.dryingLaborRate >= 0
  ) {
    return farmer.dryingLaborRate;
  }
  return Math.max(0, safeNum(settings?.paddyDryingLaborRate, DEFAULT_MPH_SETTINGS.paddyDryingLaborRate));
}

export function formatDryingBreakdownText(
  breakdown: MphDryingRateBreakdownItem[],
  lang: 'en' | 'pa',
  totalDryingBags = 0,
  fallbackRate = DEFAULT_MPH_SETTINGS.paddyDryingLaborRate
): string {
  const bagUnit = lang === 'pa' ? 'ਬੈਗ' : 'Bags';
  const perBag = lang === 'pa' ? 'ਬੈਗ' : 'bag';
  if (!Array.isArray(breakdown) || breakdown.length === 0) {
    return `${totalDryingBags} ${bagUnit} × ₹${fallbackRate}/${perBag}`;
  }
  if (breakdown.length === 1) {
    return `${breakdown[0].bags} ${bagUnit} × ₹${breakdown[0].rate}/${perBag}`;
  }
  return breakdown.map((b) => `${b.bags} ${bagUnit} × ₹${b.rate}`).join(' + ');
}

export function formatDateDMY(dateStr?: unknown): string {
  const normalized = safeDateStr(dateStr).trim();
  if (!normalized) return '—';
  const parts = normalized.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return normalized;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseUtcDate(dateStr?: unknown): Date | null {
  const normalized = safeDateStr(dateStr).trim();
  if (!normalized) return null;
  const parts = normalized.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Calculates auto days and interest between startDate and endDate.
 * Example: 1,00,000 @ 1.5%/month = ₹1,500/month.
 * daily_30: uses actual days between dates ÷ 30 × monthly interest.
 * monthly_30: uses 30-day calendar months + remaining days ÷ 30.
 */
export function calculateAdvanceDaysAndInterest(
  principalAmount: number,
  interestRateMonthly: number,
  startDate: string,
  endDate: string,
  basis: MphInterestBasis = 'daily_30'
): {
  days: number;
  monthlyInterestAmount: number;
  interestAmount: number;
  totalAmount: number;
} {
  const principal = Math.max(0, safeNum(principalAmount));
  const rate = Math.max(0, safeNum(interestRateMonthly));
  const monthlyInterestAmount = Math.round(((principal * rate) / 100) * 100) / 100;

  const sDate = parseUtcDate(startDate);
  const eDate = parseUtcDate(endDate);
  if (!sDate || !eDate || eDate.getTime() < sDate.getTime()) {
    return {
      days: 0,
      monthlyInterestAmount,
      interestAmount: 0,
      totalAmount: Math.round(principal * 100) / 100,
    };
  }

  const diffMs = eDate.getTime() - sDate.getTime();
  const days = Math.max(0, Math.round(diffMs / 86400000));

  let monthsEquivalent = days / 30;
  if (basis === 'monthly_30') {
    const sy = sDate.getUTCFullYear();
    const sm = sDate.getUTCMonth();
    const sd = sDate.getUTCDate();
    const ey = eDate.getUTCFullYear();
    const em = eDate.getUTCMonth();
    const ed = eDate.getUTCDate();

    let fullMonths = (ey - sy) * 12 + (em - sm);
    let remDays = ed - sd;
    if (remDays < 0) {
      fullMonths -= 1;
      const prevMonthLastDay = new Date(Date.UTC(ey, em, 0)).getUTCDate();
      remDays = prevMonthLastDay - sd + ed;
    }
    // Treat end of month (e.g., 1st to 31st/30th) cleanly: 30 days = 1 full month
    monthsEquivalent = Math.max(0, fullMonths) + Math.max(0, remDays) / 30;
  }

  const interestAmount = Math.round(monthlyInterestAmount * monthsEquivalent * 100) / 100;
  const totalAmount = Math.round((principal + interestAmount) * 100) / 100;

  return {
    days,
    monthlyInterestAmount,
    interestAmount,
    totalAmount,
  };
}

export function computeFarmerAccountSummary(
  farmer: MphFarmer,
  allArrivals: MphArrival[],
  allJForms: MphJForm[],
  allOtherEntries: MphOtherEntry[],
  settings: MphSettings,
  allAdvances: MphAdvance[] = []
): MphFarmerAccountSummary {
  const safeSettings = {
    ...DEFAULT_MPH_SETTINGS,
    ...(settings || {}),
  };

  const fId = safeStr(farmer?.id);
  const arrivalsList = Array.isArray(allArrivals) ? allArrivals : [];
  const jFormsList = Array.isArray(allJForms) ? allJForms : [];
  const othersList = Array.isArray(allOtherEntries) ? allOtherEntries : [];
  const advancesList = Array.isArray(allAdvances) ? allAdvances : [];

  const arrivals = arrivalsList
    .filter((a) => a && safeStr(a.farmerId) === fId)
    .sort(
      (a, b) =>
        compareSafeStr(safeDateStr(a.date), safeDateStr(b.date)) ||
        compareSafeStr(a.createdAt, b.createdAt)
    );

  const jForms = jFormsList
    .filter((j) => j && safeStr(j.farmerId) === fId)
    .sort(
      (a, b) =>
        compareSafeStr(safeDateStr(a.date), safeDateStr(b.date)) ||
        compareSafeStr(a.createdAt, b.createdAt)
    );

  const otherEntries = othersList
    .filter((o) => o && safeStr(o.farmerId) === fId)
    .sort(
      (a, b) =>
        compareSafeStr(safeDateStr(a.date), safeDateStr(b.date)) ||
        compareSafeStr(a.createdAt, b.createdAt)
    );

  const advances = advancesList
    .filter((adv) => adv && safeStr(adv.farmerId) === fId)
    .sort(
      (a, b) =>
        compareSafeStr(safeDateStr(a.startDate), safeDateStr(b.startDate)) ||
        compareSafeStr(a.createdAt, b.createdAt)
    );

  const weights = sumPaddyWeights(arrivals);
  const totalPaddyAmount =
    Math.round(arrivals.reduce((sum, a) => sum + safeNum(a.paddyAmount), 0) * 100) / 100;

  const totalJFormBags = jForms.reduce(
    (sum, j) => sum + Math.max(0, Math.floor(safeNum(j.bags))),
    0
  );
  const totalJFormAmount =
    Math.round(jForms.reduce((sum, j) => sum + safeNum(j.jFormAmount), 0) * 100) / 100;

  const jFormLaborRate = Math.max(0, safeNum(safeSettings.jFormLaborRate));
  const defaultDryingLaborRate = Math.max(0, safeNum(safeSettings.paddyDryingLaborRate));

  // J-Form Labour applies on total bags arrived in the Mandi (e.g., 1900 Arrival Bags × ₹8)
  const totalJFormLabor = Math.round(weights.totalBags * jFormLaborRate * 100) / 100;

  let totalDryingBags = 0;
  let totalDryingLaborRaw = 0;
  const dryingRateMap = new Map<number, { bags: number; amount: number }>();

  for (const a of arrivals) {
    if (!a || a.applyDryingLabor === false) continue;
    const bagsCount = Math.max(0, Math.floor(safeNum(a.bags)));
    if (bagsCount <= 0) continue;
    const rate = getEffectiveArrivalDryingRate(a, farmer, safeSettings);
    const amt = Math.round(bagsCount * rate * 100) / 100;
    totalDryingBags += bagsCount;
    totalDryingLaborRaw += amt;
    const existingRateBucket = dryingRateMap.get(rate);
    if (existingRateBucket) {
      existingRateBucket.bags += bagsCount;
      existingRateBucket.amount = Math.round((existingRateBucket.amount + amt) * 100) / 100;
    } else {
      dryingRateMap.set(rate, { bags: bagsCount, amount: amt });
    }
  }
  const totalDryingLabor = Math.round(totalDryingLaborRaw * 100) / 100;
  const dryingRateBreakdown: MphDryingRateBreakdownItem[] = Array.from(dryingRateMap.entries())
    .map(([rate, info]) => ({ rate, bags: info.bags, amount: info.amount }))
    .sort((a, b) => a.rate - b.rate);
  if (dryingRateBreakdown.length === 0 && totalDryingBags === 0) {
    void defaultDryingLaborRate;
  }

  const totalOtherAdditions =
    Math.round(
      otherEntries
        .filter((e) => e.entryType === 'add')
        .reduce((sum, e) => sum + safeNum(e.amount), 0) * 100
    ) / 100;

  const totalOtherDeductions =
    Math.round(
      otherEntries
        .filter((e) => e.entryType === 'deduct')
        .reduce((sum, e) => sum + safeNum(e.amount), 0) * 100
    ) / 100;

  const paddyVsJFormDiff = Math.round((totalPaddyAmount - totalJFormAmount) * 100) / 100;

  const totalDeductions =
    Math.round((totalJFormAmount + totalJFormLabor + totalDryingLabor + totalOtherDeductions) * 100) / 100;

  // Final Balance = Total Paddy Amount - J-Form Amount - J-Form Labour - Drying Labour + Other Additions - Other Deductions
  // Rounded off to nearest whole rupee (Paddy Bakaya before Advances & Interest)
  const rawFinalBalance =
    totalPaddyAmount -
    totalJFormAmount -
    totalJFormLabor -
    totalDryingLabor +
    totalOtherAdditions -
    totalOtherDeductions;
  const roundedBalance = Math.round(rawFinalBalance);
  const finalBalance = roundedBalance === 0 ? 0 : roundedBalance;

  let balanceStatus: 'payable' | 'receivable' | 'settled' = 'settled';
  if (finalBalance > 0) {
    balanceStatus = 'payable'; // Farmer Nu Paise Dene Hai (Payable)
  } else if (finalBalance < 0) {
    balanceStatus = 'receivable'; // Farmer Paise Lene Hai (Receivable)
  }

  // Advances (Principal + Interest)
  const totalAdvancePrincipal =
    Math.round(advances.reduce((sum, adv) => sum + safeNum(adv.principalAmount), 0) * 100) / 100;
  const totalAdvanceInterest =
    Math.round(advances.reduce((sum, adv) => sum + safeNum(adv.interestAmount), 0) * 100) / 100;
  const totalAdvanceWithInterest =
    Math.round((totalAdvancePrincipal + totalAdvanceInterest) * 100) / 100;

  // Combined Final Balance = Paddy Bakaya - (Principal + Interest), rounded to whole rupees
  const rawCombined = rawFinalBalance - totalAdvanceWithInterest;
  const roundedCombined = Math.round(rawCombined);
  const combinedFinalBalance = roundedCombined === 0 ? 0 : roundedCombined;

  let combinedBalanceStatus: 'payable' | 'receivable' | 'settled' = 'settled';
  if (combinedFinalBalance > 0) {
    combinedBalanceStatus = 'payable';
  } else if (combinedFinalBalance < 0) {
    combinedBalanceStatus = 'receivable';
  }

  return {
    farmer,
    arrivals,
    jForms,
    otherEntries,
    advances,
    totalArrivalBags: weights.totalBags,
    totalLooseKg: weights.totalLooseKg,
    totalLooseGm: weights.totalLooseGm,
    totalGrams: weights.totalGrams,
    totalQuintals: weights.totalQuintals,
    weightQtlPart: weights.weightQtlPart,
    weightKgPart: weights.weightKgPart,
    weightGmPart: weights.weightGmPart,
    totalPaddyAmount,
    totalJFormBags,
    totalJFormAmount,
    paddyVsJFormDiff,
    totalJFormLabor,
    totalDryingBags,
    totalDryingLabor,
    dryingRateBreakdown,
    totalOtherAdditions,
    totalOtherDeductions,
    totalDeductions,
    finalBalance,
    balanceStatus,
    totalAdvancePrincipal,
    totalAdvanceInterest,
    totalAdvanceWithInterest,
    combinedFinalBalance,
    combinedBalanceStatus,
  };
}

// Duplicate prevention helpers
function normalizeText(s?: unknown): string {
  return safeStr(s).toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePhone(s?: unknown): string {
  const digits = safeStr(s).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function findDuplicateMphFarmer(
  candidate: { name: string; fatherName: string; village: string; mobile: string },
  existing: MphFarmer[],
  excludeId?: string
): MphFarmer | null {
  const cName = normalizeText(candidate.name);
  const cFather = normalizeText(candidate.fatherName);
  const cVillage = normalizeText(candidate.village);
  const cMobile = normalizePhone(candidate.mobile);

  return (
    (existing || []).find((f) => {
      if (!f) return false;
      if (excludeId && f.id === excludeId) return false;
      const sameIdentity =
        normalizeText(f.name) === cName &&
        normalizeText(f.fatherName) === cFather &&
        normalizeText(f.village) === cVillage;
      const sameMobileAndName =
        cMobile.length === 10 && normalizePhone(f.mobile) === cMobile && normalizeText(f.name) === cName;
      return sameIdentity || sameMobileAndName;
    }) || null
  );
}

export function findDuplicateMphArrival(
  candidate: {
    farmerId: string;
    date: string;
    paddyType: string;
    bags: number;
    looseKg: number;
    looseGm: number;
  },
  existing: MphArrival[],
  excludeId?: string
): MphArrival | null {
  return (
    (existing || []).find((a) => {
      if (!a) return false;
      if (excludeId && a.id === excludeId) return false;
      return (
        a.farmerId === candidate.farmerId &&
        safeDateStr(a.date) === candidate.date &&
        a.paddyType === candidate.paddyType &&
        safeNum(a.bags) === safeNum(candidate.bags) &&
        safeNum(a.looseKg) === safeNum(candidate.looseKg) &&
        safeNum(a.looseGm) === safeNum(candidate.looseGm)
      );
    }) || null
  );
}

export function findDuplicateMphJForm(
  candidate: {
    farmerId: string;
    jFormHolderName?: string;
    date: string;
    bags: number;
    jFormAmount: number;
    jFormNo: string;
  },
  existing: MphJForm[],
  excludeId?: string
): MphJForm | null {
  const cNo = normalizeText(candidate.jFormNo);
  const cHolder = normalizeText(candidate.jFormHolderName);
  return (
    (existing || []).find((j) => {
      if (!j) return false;
      if (excludeId && j.id === excludeId) return false;
      if (cNo && normalizeText(j.jFormNo) === cNo && j.farmerId === candidate.farmerId) {
        return true;
      }
      const jHolder = normalizeText(j.jFormHolderName || j.farmerName);
      const sameHolder = !cHolder || !jHolder || cHolder === jHolder;
      return (
        j.farmerId === candidate.farmerId &&
        sameHolder &&
        safeDateStr(j.date) === candidate.date &&
        safeNum(j.bags) === safeNum(candidate.bags) &&
        Math.abs(safeNum(j.jFormAmount) - safeNum(candidate.jFormAmount)) < 0.01
      );
    }) || null
  );
}
