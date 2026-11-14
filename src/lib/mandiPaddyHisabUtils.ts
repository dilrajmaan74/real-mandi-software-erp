import {
  DEFAULT_MPH_SETTINGS,
  MphAdvance,
  MphArrival,
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

export function formatWeightQKG(qtl: number, kg: number, gm: number): string {
  return `${Math.floor(safeNum(qtl))} Qtl ${Math.floor(safeNum(kg))} KG ${Math.floor(safeNum(gm))} GM`;
}

export function formatLooseKgGm(kg: number, gm: number): string {
  const safeKg = Math.max(0, Math.floor(safeNum(kg)));
  const safeGm = Math.max(0, Math.floor(safeNum(gm)));
  if (safeKg === 0 && safeGm === 0) return '0 KG';
  if (safeGm === 0) return `${safeKg} KG`;
  if (safeKg === 0) return `${safeGm} GM`;
  return `${safeKg} KG ${safeGm} GM`;
}

export function formatINR(value: number, showDecimals = true): string {
  const num = safeNum(value);
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
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
  const dryingLaborRate = Math.max(0, safeNum(safeSettings.paddyDryingLaborRate));

  // J-Form Labour applies on total bags arrived in the Mandi (e.g., 1900 Arrival Bags × ₹8)
  const totalJFormLabor = Math.round(weights.totalBags * jFormLaborRate * 100) / 100;

  const totalDryingBags = arrivals
    .filter((a) => a.applyDryingLabor !== false)
    .reduce((sum, a) => sum + Math.max(0, Math.floor(safeNum(a.bags))), 0);
  const totalDryingLabor = Math.round(totalDryingBags * dryingLaborRate * 100) / 100;

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
    totalJFormLabor,
    totalDryingBags,
    totalDryingLabor,
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
