export type MphPaddyType = 'Hybrid Paddy' | 'Paddy A Gurde';

export interface MphFarmer {
  id: string;
  ownerId?: string;
  name: string;
  fatherName: string;
  village: string;
  mobile: string;
  createdAt: string;
  updatedAt: string;
}

export interface MphArrival {
  id: string;
  ownerId?: string;
  farmerId: string;
  farmerName: string;
  date: string; // YYYY-MM-DD
  paddyType: MphPaddyType;
  ratePerQuintal: number;
  bags: number;
  looseKg: number;
  looseGm: number;
  totalQuintals: number;
  weightQtlPart: number;
  weightKgPart: number;
  weightGmPart: number;
  paddyAmount: number;
  applyDryingLabor: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type MphHolderRelation =
  | 'Self'
  | 'Son'
  | 'Wife'
  | 'Hissedar'
  | 'Father'
  | 'Brother'
  | 'Other';

export interface MphJForm {
  id: string;
  ownerId?: string;
  farmerId: string;
  farmerName: string;
  jFormHolderName?: string; // Self or Son / Wife / Hissedar / Family member name
  holderRelation?: string; // 'Self' | 'Son' | 'Wife' | 'Hissedar' | 'Father' | 'Brother' | 'Other'
  date: string; // YYYY-MM-DD
  jFormNo: string;
  bags: number;
  rate: number;
  jFormAmount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MphOtherEntry {
  id: string;
  ownerId?: string;
  farmerId: string;
  farmerName: string;
  date: string; // YYYY-MM-DD
  entryType: 'add' | 'deduct';
  description: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export type MphInterestBasis = 'daily_30' | 'monthly_30';

export interface MphAdvance {
  id: string;
  ownerId?: string;
  farmerId: string;
  farmerName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number;
  purpose: string;
  principalAmount: number;
  interestRateMonthly: number; // % per month (e.g. 1, 1.5, 2 or custom)
  interestBasis: MphInterestBasis;
  monthlyInterestAmount: number;
  interestAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MphSettings {
  id: string;
  ownerId?: string;
  hybridPaddyRate: number;
  paddyAGurdeRate: number;
  jFormLaborRate: number;
  paddyDryingLaborRate: number;
  updatedAt: string;
}

export const DEFAULT_MPH_SETTINGS: MphSettings = {
  id: 'default',
  hybridPaddyRate: 2350,
  paddyAGurdeRate: 2461,
  jFormLaborRate: 8,
  paddyDryingLaborRate: 10,
  updatedAt: new Date().toISOString(),
};

export interface MphFarmerAccountSummary {
  farmer: MphFarmer;
  arrivals: MphArrival[];
  jForms: MphJForm[];
  otherEntries: MphOtherEntry[];
  advances: MphAdvance[];
  totalArrivalBags: number;
  totalLooseKg: number;
  totalLooseGm: number;
  totalGrams: number;
  totalQuintals: number;
  weightQtlPart: number;
  weightKgPart: number;
  weightGmPart: number;
  totalPaddyAmount: number;
  totalJFormBags: number;
  totalJFormAmount: number;
  totalJFormLabor: number;
  totalDryingBags: number;
  totalDryingLabor: number;
  totalOtherAdditions: number;
  totalOtherDeductions: number;
  totalDeductions: number;
  finalBalance: number; // Paddy Bakaya (before advances & interest, rounded)
  balanceStatus: 'payable' | 'receivable' | 'settled';
  totalAdvancePrincipal: number;
  totalAdvanceInterest: number;
  totalAdvanceWithInterest: number;
  combinedFinalBalance: number; // Paddy Bakaya - (Principal + Interest), rounded
  combinedBalanceStatus: 'payable' | 'receivable' | 'settled';
}
