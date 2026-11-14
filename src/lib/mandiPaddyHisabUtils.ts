import {
  MphArrival,
  MphFarmer,
  MphFarmerAccountSummary,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../types/mandiPaddyHisab';

// Standard Mandi Bag Packing = 37.5 KG = 37,500 Grams
export const BAG_GRAMS = 37500;
export const QUINTAL_GRAMS = 100000;
export const KG_GRAMS = 1000;

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
  const safeBags = Math.max(0, Math.floor(Number(bags) || 0));
  const safeLooseKg = Math.max(0, Math.floor(Number(looseKg) || 0));
  const safeLooseGm = Math.max(0, Math.floor(Number(looseGm) || 0));

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

  for (const a of arrivals) {
    const b = Math.max(0, Math.floor(Number(a.bags) || 0));
    const lKg = Math.max(0, Math.floor(Number(a.looseKg) || 0));
    const lGm = Math.max(0, Math.floor(Number(a.looseGm) || 0));
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
  const qtl = Math.max(0, Number(totalQuintals) || 0);
  const rate = Math.max(0, Number(ratePerQuintal) || 0);
  return Math.round(qtl * rate * 100) / 100;
}

export function formatWeightQKG(qtl: number, kg: number, gm: number): string {
  return `${qtl} Qtl ${kg} KG ${gm} GM`;
}

export function formatLooseKgGm(kg: number, gm: number): string {
  const safeKg = Math.max(0, Math.floor(Number(kg) || 0));
  const safeGm = Math.max(0, Math.floor(Number(gm) || 0));
  if (safeKg === 0 && safeGm === 0) return '0 KG';
  if (safeGm === 0) return `${safeKg} KG`;
  if (safeKg === 0) return `${safeGm} GM`;
  return `${safeKg} KG ${safeGm} GM`;
}

export function formatINR(value: number, showDecimals = true): string {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

export function formatDateDMY(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function computeFarmerAccountSummary(
  farmer: MphFarmer,
  allArrivals: MphArrival[],
  allJForms: MphJForm[],
  allOtherEntries: MphOtherEntry[],
  settings: MphSettings
): MphFarmerAccountSummary {
  const arrivals = allArrivals
    .filter((a) => a.farmerId === farmer.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  const jForms = allJForms
    .filter((j) => j.farmerId === farmer.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  const otherEntries = allOtherEntries
    .filter((o) => o.farmerId === farmer.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  const weights = sumPaddyWeights(arrivals);
  const totalPaddyAmount =
    Math.round(arrivals.reduce((sum, a) => sum + (Number(a.paddyAmount) || 0), 0) * 100) / 100;

  const totalJFormBags = jForms.reduce((sum, j) => sum + Math.max(0, Math.floor(Number(j.bags) || 0)), 0);
  const totalJFormAmount =
    Math.round(jForms.reduce((sum, j) => sum + (Number(j.jFormAmount) || 0), 0) * 100) / 100;

  const jFormLaborRate = Math.max(0, Number(settings.jFormLaborRate) || 0);
  const dryingLaborRate = Math.max(0, Number(settings.paddyDryingLaborRate) || 0);

  // J-Form Labour applies on total bags arrived in the Mandi (e.g., 1900 Arrival Bags × ₹8)
  const totalJFormLabor = Math.round(weights.totalBags * jFormLaborRate * 100) / 100;

  const totalDryingBags = arrivals
    .filter((a) => a.applyDryingLabor !== false)
    .reduce((sum, a) => sum + Math.max(0, Math.floor(Number(a.bags) || 0)), 0);
  const totalDryingLabor = Math.round(totalDryingBags * dryingLaborRate * 100) / 100;

  const totalOtherAdditions =
    Math.round(
      otherEntries
        .filter((e) => e.entryType === 'add')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0) * 100
    ) / 100;

  const totalOtherDeductions =
    Math.round(
      otherEntries
        .filter((e) => e.entryType === 'deduct')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0) * 100
    ) / 100;

  const totalDeductions =
    Math.round((totalJFormAmount + totalJFormLabor + totalDryingLabor + totalOtherDeductions) * 100) / 100;

  // Final Balance = Total Paddy Amount - J-Form Amount - J-Form Labour - Drying Labour + Other Additions - Other Deductions
  // Rounded off to nearest whole rupee
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

  return {
    farmer,
    arrivals,
    jForms,
    otherEntries,
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
  };
}

// Duplicate prevention helpers
function normalizeText(s?: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePhone(s?: string): string {
  const digits = (s || '').replace(/\D/g, '');
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
    existing.find((f) => {
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
    existing.find((a) => {
      if (excludeId && a.id === excludeId) return false;
      return (
        a.farmerId === candidate.farmerId &&
        a.date === candidate.date &&
        a.paddyType === candidate.paddyType &&
        Number(a.bags) === Number(candidate.bags) &&
        Number(a.looseKg) === Number(candidate.looseKg) &&
        Number(a.looseGm) === Number(candidate.looseGm)
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
    existing.find((j) => {
      if (excludeId && j.id === excludeId) return false;
      if (cNo && normalizeText(j.jFormNo) === cNo && j.farmerId === candidate.farmerId) {
        return true;
      }
      const jHolder = normalizeText(j.jFormHolderName || j.farmerName);
      const sameHolder = !cHolder || !jHolder || cHolder === jHolder;
      return (
        j.farmerId === candidate.farmerId &&
        sameHolder &&
        j.date === candidate.date &&
        Number(j.bags) === Number(candidate.bags) &&
        Math.abs(Number(j.jFormAmount) - Number(candidate.jFormAmount)) < 0.01
      );
    }) || null
  );
}
