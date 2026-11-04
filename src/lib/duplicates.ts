import { CropArrivalEntry, AgencyPurchaseEntry, FarmerMaster } from '../types/mandi';

export const cleanCompactStr = (s?: string) =>
  (s || '').toLowerCase().trim().replace(/[^a-z0-9\u0A00-\u0A7F]/g, '');

export interface DuplicateGroup<T> {
  groupKey: string;
  farmerName: string;
  date?: string;
  details: string;
  original: T;
  duplicates: T[];
  allEntries: T[];
}

/**
 * Find duplicate Crop Arrival entries
 * Criteria: Same farmer name + same arrival date + same total bags (or identical parchi number)
 */
export function findDuplicateArrivals(entries: CropArrivalEntry[]): DuplicateGroup<CropArrivalEntry>[] {
  const map = new Map<string, CropArrivalEntry[]>();

  entries.forEach((entry) => {
    const normName = cleanCompactStr(entry.farmer_name);
    const date = entry.date || '';
    const bags = entry.total_bags_arrived || 0;
    const parchi = cleanCompactStr(entry.parchi_no || entry.gate_pass_no || '');

    // Composite signature
    const signature = `${normName}_${date}_${bags}`;
    if (!map.has(signature)) {
      map.set(signature, []);
    }
    map.get(signature)!.push(entry);
  });

  const duplicateGroups: DuplicateGroup<CropArrivalEntry>[] = [];

  map.forEach((items, key) => {
    if (items.length > 1) {
      // Oldest or first created is considered Original
      const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
      const original = sorted[0];
      const duplicates = sorted.slice(1);

      duplicateGroups.push({
        groupKey: key,
        farmerName: original.farmer_name,
        date: original.date,
        details: `${original.total_bags_arrived} ਗੱਟੇ (${original.weight_quintals} Qtl) • ਪਰਚੀ: ${original.parchi_no || original.gate_pass_no || '-'}`,
        original,
        duplicates,
        allEntries: sorted,
      });
    }
  });

  return duplicateGroups;
}

/**
 * Check if an incoming Arrival entry is a duplicate of existing entries
 */
export function checkArrivalDuplicate(
  incoming: Partial<CropArrivalEntry>,
  existingEntries: CropArrivalEntry[]
): CropArrivalEntry | null {
  const normName = cleanCompactStr(incoming.farmer_name);
  const date = incoming.date || '';
  const bags = Number(incoming.total_bags_arrived || 0);
  const parchi = cleanCompactStr(incoming.parchi_no || incoming.gate_pass_no || '');

  return existingEntries.find((e) => {
    if (incoming.id && e.id === incoming.id) return false;
    const eName = cleanCompactStr(e.farmer_name);
    const eDate = e.date || '';
    const eBags = Number(e.total_bags_arrived || 0);
    const eParchi = cleanCompactStr(e.parchi_no || e.gate_pass_no || '');

    // Exact match on farmer + date + bags
    if (normName && eName === normName && date && eDate === date && bags > 0 && eBags === bags) {
      return true;
    }
    // Match on unique parchi number if provided
    if (parchi && eParchi && parchi === eParchi && parchi.length > 4) {
      return true;
    }
    return false;
  }) || null;
}

/**
 * Find duplicate Agency Purchase entries
 * Criteria: Same farmer name + same purchase date + same total bags / weight
 */
export function findDuplicatePurchases(entries: AgencyPurchaseEntry[]): DuplicateGroup<AgencyPurchaseEntry>[] {
  const map = new Map<string, AgencyPurchaseEntry[]>();

  entries.forEach((entry) => {
    const normName = cleanCompactStr(entry.farmer_name);
    const date = entry.date || '';
    const bags = entry.total_bags || 0;
    const agency = cleanCompactStr(entry.purchasing_agency || '');

    const signature = `${normName}_${date}_${bags}_${agency}`;
    if (!map.has(signature)) {
      map.set(signature, []);
    }
    map.get(signature)!.push(entry);
  });

  const duplicateGroups: DuplicateGroup<AgencyPurchaseEntry>[] = [];

  map.forEach((items, key) => {
    if (items.length > 1) {
      const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
      const original = sorted[0];
      const duplicates = sorted.slice(1);

      duplicateGroups.push({
        groupKey: key,
        farmerName: original.farmer_name,
        date: original.date,
        details: `${original.purchasing_agency} • ${original.total_bags} ਗੱਟੇ (${original.weight_quintals} Qtl) • ਰਕਮ: ₹${original.total_amount}`,
        original,
        duplicates,
        allEntries: sorted,
      });
    }
  });

  return duplicateGroups;
}

/**
 * Check if an incoming Agency Purchase entry is a duplicate of existing entries
 */
export function checkPurchaseDuplicate(
  incoming: Partial<AgencyPurchaseEntry>,
  existingEntries: AgencyPurchaseEntry[]
): AgencyPurchaseEntry | null {
  const normName = cleanCompactStr(incoming.farmer_name);
  const date = incoming.date || '';
  const bags = Number(incoming.total_bags || 0);
  const agency = cleanCompactStr(incoming.purchasing_agency || '');

  return existingEntries.find((e) => {
    if (incoming.id && e.id === incoming.id) return false;
    const eName = cleanCompactStr(e.farmer_name);
    const eDate = e.date || '';
    const eBags = Number(e.total_bags || 0);
    const eAgency = cleanCompactStr(e.purchasing_agency || '');

    if (normName && eName === normName && date && eDate === date && bags > 0 && eBags === bags) {
      if (!agency || !eAgency || agency === eAgency) {
        return true;
      }
    }
    return false;
  }) || null;
}

/**
 * Find duplicate registered farmers
 */
export function findDuplicateFarmers(farmers: FarmerMaster[]): DuplicateGroup<FarmerMaster>[] {
  const map = new Map<string, FarmerMaster[]>();

  farmers.forEach((farmer) => {
    const normName = cleanCompactStr(farmer.name_en);
    const father = cleanCompactStr(farmer.father_husband_name_en);
    const village = cleanCompactStr(farmer.village_en);
    const mobile = (farmer.mobile_number || '').replace(/\D/g, '').slice(-10);

    const signature = mobile ? `${normName}_${mobile}` : `${normName}_${father}_${village}`;
    if (!map.has(signature)) {
      map.set(signature, []);
    }
    map.get(signature)!.push(farmer);
  });

  const duplicateGroups: DuplicateGroup<FarmerMaster>[] = [];

  map.forEach((items, key) => {
    if (items.length > 1) {
      const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
      const original = sorted[0];
      const duplicates = sorted.slice(1);

      duplicateGroups.push({
        groupKey: key,
        farmerName: original.name_en,
        details: `ਪਿਤਾ: ${original.father_husband_name_en || '-'} • ਪਿੰਡ: ${original.village_en || '-'} • ਫੋਨ: ${original.mobile_number || '-'}`,
        original,
        duplicates,
        allEntries: sorted,
      });
    }
  });

  return duplicateGroups;
}
