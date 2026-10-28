/**
 * Dynamic Village / Pind Master Management
 * Remembers all villages typed or saved by the user across the entire application.
 */

import { transliterateToPunjabi } from './transliterate';

export interface VillageItem {
  name_en: string;
  name_pa: string;
  count: number;
  last_used?: string;
}

export const DEFAULT_PUNJAB_VILLAGES: VillageItem[] = [
  { name_en: 'Bhadaur', name_pa: 'ਭਦੌੜ', count: 50 },
  { name_en: 'Kamalpur', name_pa: 'ਕਮਾਲਪੁਰ', count: 45 },
  { name_en: 'Mehrajwala', name_pa: 'ਮਹਿਰਾਜਵਾਲਾ', count: 40 },
  { name_en: 'Kang Khurd', name_pa: 'ਕੰਗ ਖੁਰਦ', count: 35 },
  { name_en: 'Barnala', name_pa: 'ਬਰਨਾਲਾ', count: 30 },
  { name_en: 'Khanna', name_pa: 'ਖੰਨਾ', count: 25 },
  { name_en: 'Moga', name_pa: 'ਮੋਗਾ', count: 20 },
  { name_en: 'Raikot', name_pa: 'ਰਾਏਕੋਟ', count: 18 },
  { name_en: 'Jagraon', name_pa: 'ਜਗਰਾਓਂ', count: 15 },
  { name_en: 'Tapa', name_pa: 'ਤਪਾ', count: 14 },
  { name_en: 'Dhanaula', name_pa: 'ਧਨੌਲਾ', count: 13 },
  { name_en: 'Handiaya', name_pa: 'ਹੰਡਿਆਇਆ', count: 12 },
  { name_en: 'Mehal Kalan', name_pa: 'ਮਹਿਲ ਕਲਾਂ', count: 11 },
  { name_en: 'Sehna', name_pa: 'ਸਹਿਣਾ', count: 10 },
  { name_en: 'Rampura Phul', name_pa: 'ਰਾਮਪੁਰਾ ਫੂਲ', count: 9 },
  { name_en: 'Samrala', name_pa: 'ਸਮਰਾਲਾ', count: 8 },
  { name_en: 'Nihal Singh Wala', name_pa: 'ਨਿਹਾਲ ਸਿੰਘ ਵਾਲਾ', count: 8 },
  { name_en: 'Bagha Purana', name_pa: 'ਬਾਘਾ ਪੁਰਾਣਾ', count: 7 },
  { name_en: 'Kotkapura', name_pa: 'ਕੋਟਕਪੂਰਾ', count: 6 },
  { name_en: 'Faridkot', name_pa: 'ਫਰੀਦਕੋਟ', count: 5 },
  { name_en: 'Mansa', name_pa: 'ਮਾਨਸਾ', count: 5 },
  { name_en: 'Malerkotla', name_pa: 'ਮਲੇਰਕੋਟਲਾ', count: 5 },
  { name_en: 'Nabha', name_pa: 'ਨਾਭਾ', count: 4 },
  { name_en: 'Sangrur', name_pa: 'ਸੰਗਰੂਰ', count: 4 },
  { name_en: 'Sunam', name_pa: 'ਸੁਨਾਮ', count: 4 },
  { name_en: 'Dirba', name_pa: 'ਦਿੜ੍ਹਬਾ', count: 3 },
  { name_en: 'Moonak', name_pa: 'ਮੂਨਕ', count: 3 },
  { name_en: 'Lehragaga', name_pa: 'ਲਹਿਰਾਗਾਗਾ', count: 3 },
  { name_en: 'Ahmedgarh', name_pa: 'ਅਹਿਮਦਗੜ੍ਹ', count: 3 },
  { name_en: 'Doraha', name_pa: 'ਦੋਰਾਹਾ', count: 3 },
  { name_en: 'Payal', name_pa: 'ਪਾਇਲ', count: 3 },
  { name_en: 'Sahnewal', name_pa: 'ਸਾਹਨੇਵਾਲ', count: 3 },
  { name_en: 'Machhiwara', name_pa: 'ਮਾਛੀਵਾੜਾ', count: 3 },
];

const STORAGE_KEY = 'kisanmitra_dynamic_villages';

/**
 * Retrieves the stored list of custom villages from localStorage
 */
export function getSavedVillages(): VillageItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: VillageItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read saved villages from localStorage', err);
  }
  return DEFAULT_PUNJAB_VILLAGES;
}

/**
 * Saves villages list to localStorage and triggers storage event for live updates
 */
export function persistVillages(villages: VillageItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(villages));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kisanmitra_villages_updated', { detail: villages }));
    }
  } catch (err) {
    console.warn('Failed to persist villages to localStorage', err);
  }
}

/**
 * Registers a new village or increments count of an existing village.
 * Handles both English and Punjabi inputs.
 */
export async function registerVillage(enInput: string, paInput?: string): Promise<VillageItem> {
  const enTrimmed = (enInput || '').trim();
  const paTrimmed = (paInput || '').trim();

  if (!enTrimmed && !paTrimmed) {
    return { name_en: '', name_pa: '', count: 1 };
  }

  // Derive missing language representation
  let finalEn = enTrimmed;
  let finalPa = paTrimmed;

  // Check if enInput is actually Gurmukhi Punjabi
  const isEnGurmukhi = /[\u0A00-\u0A7F]/.test(enTrimmed);
  if (isEnGurmukhi && !finalPa) {
    finalPa = enTrimmed;
    finalEn = '';
  }

  if (finalEn && !finalPa) {
    // Check default list first
    const defMatch = DEFAULT_PUNJAB_VILLAGES.find(
      (v) => v.name_en.toLowerCase() === finalEn.toLowerCase()
    );
    if (defMatch) {
      finalPa = defMatch.name_pa;
    } else {
      try {
        finalPa = await transliterateToPunjabi(finalEn);
      } catch {
        finalPa = finalEn;
      }
    }
  } else if (!finalEn && finalPa) {
    const defMatch = DEFAULT_PUNJAB_VILLAGES.find(
      (v) => v.name_pa === finalPa
    );
    if (defMatch) {
      finalEn = defMatch.name_en;
    } else {
      finalEn = finalPa;
    }
  }

  const currentList = getSavedVillages();
  const existingIndex = currentList.findIndex(
    (v) =>
      (finalEn && v.name_en.toLowerCase() === finalEn.toLowerCase()) ||
      (finalPa && v.name_pa === finalPa)
  );

  let updatedVillage: VillageItem;

  if (existingIndex >= 0) {
    const existing = currentList[existingIndex];
    updatedVillage = {
      ...existing,
      name_en: finalEn || existing.name_en,
      name_pa: finalPa || existing.name_pa,
      count: (existing.count || 0) + 1,
      last_used: new Date().toISOString(),
    };
    currentList[existingIndex] = updatedVillage;
  } else {
    updatedVillage = {
      name_en: finalEn,
      name_pa: finalPa || finalEn,
      count: 1,
      last_used: new Date().toISOString(),
    };
    currentList.unshift(updatedVillage);
  }

  // Sort by count and last_used
  currentList.sort((a, b) => (b.count || 0) - (a.count || 0));

  persistVillages(currentList);
  return updatedVillage;
}

/**
 * Harvests villages from existing data arrays (e.g. Farmers Master and Crop Arrivals)
 * to ensure all previously recorded villages are automatically in the master list.
 */
export function harvestVillagesFromRecords(records: { village_en?: string; village_pa?: string; village?: string }[]): void {
  if (!records || records.length === 0) return;

  const currentList = getSavedVillages();
  let modified = false;

  for (const item of records) {
    const en = (item.village_en || item.village || '').trim();
    const pa = (item.village_pa || '').trim();

    if (!en && !pa) continue;

    const exists = currentList.some(
      (v) =>
        (en && v.name_en.toLowerCase() === en.toLowerCase()) ||
        (pa && v.name_pa === pa)
    );

    if (!exists) {
      currentList.push({
        name_en: en || pa,
        name_pa: pa || en,
        count: 1,
        last_used: new Date().toISOString(),
      });
      modified = true;
    }
  }

  if (modified) {
    currentList.sort((a, b) => (b.count || 0) - (a.count || 0));
    persistVillages(currentList);
  }
}

/**
 * Removes a village from the master list (e.g. in case of typos)
 */
export function removeVillage(name: string): void {
  const currentList = getSavedVillages();
  const filtered = currentList.filter(
    (v) =>
      v.name_en.toLowerCase() !== name.toLowerCase() &&
      v.name_pa !== name
  );
  persistVillages(filtered);
}
