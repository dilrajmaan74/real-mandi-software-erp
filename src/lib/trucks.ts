/**
 * Dynamic Truck & Driver Directory Management for Mandi Lifting
 * Saves truck numbers, driver names, driver mobile numbers, and auto-matches by last 4 digits.
 */

import { TruckMaster, LiftingDispatchEntry } from '../types/mandi';

export const DEFAULT_TRUCKS: TruckMaster[] = [
  {
    id: 'TRK-101',
    truck_number: 'PB-19-M-2041',
    driver_name: 'Kuldeep Singh (ਕੁਲਦੀਪ ਸਿੰਘ)',
    driver_mobile: '98140-99887',
    default_destination: 'Guru Nanak Rice Mill Plant',
    count: 10,
    last_used: new Date().toISOString(),
  },
  {
    id: 'TRK-102',
    truck_number: 'PB-19-M-4421',
    driver_name: 'Harwinder Singh (ਹਰਵਿੰਦਰ ਸਿੰਘ)',
    driver_mobile: '98765-11223',
    default_destination: 'Punjab Agro Sheller Yard',
    count: 8,
    last_used: new Date().toISOString(),
  },
  {
    id: 'TRK-103',
    truck_number: 'PB-11-BC-5678',
    driver_name: 'Jaspal Singh (ਜਸਪਾਲ ਸਿੰਘ)',
    driver_mobile: '98141-55443',
    default_destination: 'Kang Khurd Solvex & Rice Mill',
    count: 6,
    last_used: new Date().toISOString(),
  },
];

const STORAGE_KEY = 'kisanmitra_saved_trucks';

/**
 * Normalizes a truck number for matching: removes hyphens, spaces, and uppercases.
 * e.g. "PB-19-M-2041" -> "PB19M2041"
 */
export function normalizeTruckNo(str: string): string {
  return (str || '').replace(/[\s\-_]/g, '').toUpperCase();
}

/**
 * Retrieves saved trucks from localStorage
 */
export function getSavedTrucks(): TruckMaster[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: TruckMaster[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to read saved trucks from localStorage', err);
  }
  return DEFAULT_TRUCKS;
}

/**
 * Persists trucks list to localStorage and notifies listeners
 */
export function persistTrucks(trucks: TruckMaster[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trucks));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kisanmitra_trucks_updated', { detail: trucks }));
    }
  } catch (err) {
    console.warn('Failed to persist trucks to localStorage', err);
  }
}

/**
 * Saves or updates a truck in the master list.
 */
export function saveTruck(
  truckNumber: string,
  driverName?: string,
  driverMobile?: string,
  destination?: string
): TruckMaster | null {
  const cleanTruck = (truckNumber || '').trim().toUpperCase();
  if (!cleanTruck) return null;

  const currentList = getSavedTrucks();
  const normTarget = normalizeTruckNo(cleanTruck);

  const existingIndex = currentList.findIndex(
    (t) => normalizeTruckNo(t.truck_number) === normTarget
  );

  let updatedTruck: TruckMaster;

  if (existingIndex >= 0) {
    const existing = currentList[existingIndex];
    updatedTruck = {
      ...existing,
      truck_number: cleanTruck,
      driver_name: driverName?.trim() || existing.driver_name,
      driver_mobile: driverMobile?.trim() || existing.driver_mobile,
      default_destination: destination?.trim() || existing.default_destination,
      count: (existing.count || 0) + 1,
      last_used: new Date().toISOString(),
    };
    currentList[existingIndex] = updatedTruck;
  } else {
    updatedTruck = {
      id: `TRK-${Date.now().toString().slice(-6)}`,
      truck_number: cleanTruck,
      driver_name: driverName?.trim() || '',
      driver_mobile: driverMobile?.trim() || '',
      default_destination: destination?.trim() || '',
      count: 1,
      last_used: new Date().toISOString(),
    };
    currentList.unshift(updatedTruck);
  }

  // Sort by count and last_used
  currentList.sort((a, b) => (b.count || 0) - (a.count || 0));
  persistTrucks(currentList);
  return updatedTruck;
}

/**
 * Searches trucks by full number, last 4 digits, driver name, or mobile.
 */
export function searchTrucks(query: string): TruckMaster[] {
  if (!query || !query.trim()) return getSavedTrucks();

  const q = query.trim();
  const normQ = normalizeTruckNo(q);
  const trucks = getSavedTrucks();

  return trucks.filter((t) => {
    const normT = normalizeTruckNo(t.truck_number);
    // Match by full or partial normalized number
    if (normT.includes(normQ)) return true;
    // Match by last 4 digits (e.g. "2041")
    if (q.length >= 2 && normT.endsWith(normQ)) return true;
    // Match by driver name
    if (t.driver_name.toLowerCase().includes(q.toLowerCase())) return true;
    // Match by driver mobile
    if (t.driver_mobile.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''))) return true;

    return false;
  });
}

/**
 * Specifically finds a truck match if the user enters 4 digits or a truck number.
 * e.g. "2041" -> returns PB-19-M-2041
 */
export function findTruckBy4DigitsOrNumber(input: string): TruckMaster | null {
  if (!input || input.trim().length < 3) return null;

  const raw = input.trim();
  const digitsOnly = raw.replace(/[^0-9]/g, '');
  const trucks = getSavedTrucks();

  // 1. Exact match on normalized full truck number
  const exact = trucks.find((t) => normalizeTruckNo(t.truck_number) === normalizeTruckNo(raw));
  if (exact) return exact;

  // 2. Exact match on last 4 digits if 4 digits were typed
  if (digitsOnly.length === 4) {
    const digitMatch = trucks.find((t) => {
      const tDigits = t.truck_number.replace(/[^0-9]/g, '');
      return tDigits.endsWith(digitsOnly);
    });
    if (digitMatch) return digitMatch;
  }

  // 3. Partial end match if at least 3 digits
  if (digitsOnly.length >= 3) {
    const partialMatch = trucks.find((t) => {
      const tDigits = t.truck_number.replace(/[^0-9]/g, '');
      return tDigits.endsWith(digitsOnly);
    });
    if (partialMatch) return partialMatch;
  }

  return null;
}

/**
 * Harvests all trucks from existing lifting dispatch entries to ensure full history is preserved.
 */
export function harvestTrucksFromLifting(entries: LiftingDispatchEntry[]): void {
  if (!entries || entries.length === 0) return;

  const currentList = getSavedTrucks();
  let modified = false;

  for (const entry of entries) {
    if (!entry.truck_number) continue;

    const norm = normalizeTruckNo(entry.truck_number);
    const existing = currentList.find((t) => normalizeTruckNo(t.truck_number) === norm);

    if (!existing) {
      currentList.push({
        id: `TRK-HIST-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
        truck_number: entry.truck_number.trim().toUpperCase(),
        driver_name: entry.driver_name || '',
        driver_mobile: entry.driver_mobile || '',
        default_destination: entry.destination_godown || entry.seller_sheller_name || '',
        count: 1,
        last_used: entry.date_time || new Date().toISOString(),
      });
      modified = true;
    }
  }

  if (modified) {
    currentList.sort((a, b) => (b.count || 0) - (a.count || 0));
    persistTrucks(currentList);
  }
}

/**
 * Deletes a truck from the saved list.
 */
export function deleteTruck(id: string): void {
  const currentList = getSavedTrucks();
  const filtered = currentList.filter((t) => t.id !== id);
  persistTrucks(filtered);
}
