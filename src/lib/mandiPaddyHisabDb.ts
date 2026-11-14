import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  cleanForFirestore,
  db,
  handleFirestoreError,
  OperationType,
  sanitizeDocId,
} from './firestore';
import {
  DEFAULT_MPH_SETTINGS,
  MphArrival,
  MphFarmer,
  MphJForm,
  MphOtherEntry,
  MphSettings,
} from '../types/mandiPaddyHisab';

// Completely separate localStorage keys for Mandi Paddy Hisab module
export const MPH_STORAGE_KEYS = {
  FARMERS: 'mph_farmers_v1',
  ARRIVALS: 'mph_arrivals_v1',
  JFORMS: 'mph_jforms_v1',
  OTHER_ENTRIES: 'mph_other_entries_v1',
  SETTINGS: 'mph_settings_v1',
} as const;

export function loadLocalMphData(): {
  farmers: MphFarmer[];
  arrivals: MphArrival[];
  jForms: MphJForm[];
  otherEntries: MphOtherEntry[];
  settings: MphSettings;
} {
  const readJson = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`Failed reading ${key}:`, e);
    }
    return fallback;
  };

  return {
    farmers: readJson<MphFarmer[]>(MPH_STORAGE_KEYS.FARMERS, []),
    arrivals: readJson<MphArrival[]>(MPH_STORAGE_KEYS.ARRIVALS, []),
    jForms: readJson<MphJForm[]>(MPH_STORAGE_KEYS.JFORMS, []),
    otherEntries: readJson<MphOtherEntry[]>(MPH_STORAGE_KEYS.OTHER_ENTRIES, []),
    settings: readJson<MphSettings>(MPH_STORAGE_KEYS.SETTINGS, DEFAULT_MPH_SETTINGS),
  };
}

export function saveLocalMphFarmers(items: MphFarmer[]) {
  try {
    localStorage.setItem(MPH_STORAGE_KEYS.FARMERS, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }
}

export function saveLocalMphArrivals(items: MphArrival[]) {
  try {
    localStorage.setItem(MPH_STORAGE_KEYS.ARRIVALS, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }
}

export function saveLocalMphJForms(items: MphJForm[]) {
  try {
    localStorage.setItem(MPH_STORAGE_KEYS.JFORMS, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }
}

export function saveLocalMphOtherEntries(items: MphOtherEntry[]) {
  try {
    localStorage.setItem(MPH_STORAGE_KEYS.OTHER_ENTRIES, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }
}

export function saveLocalMphSettings(settings: MphSettings) {
  try {
    localStorage.setItem(MPH_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn(e);
  }
}

// =========================================================================
// FIRESTORE PERSISTENCE (Strictly scoped to users/{userId}/mph_*)
// =========================================================================

export async function saveMphFarmerToCloud(userId: string, farmer: MphFarmer): Promise<void> {
  const docId = sanitizeDocId(farmer.id);
  const path = `users/${userId}/mph_farmers/${docId}`;
  try {
    const payload: MphFarmer = {
      id: docId,
      ownerId: userId,
      name: farmer.name.trim().slice(0, 160),
      fatherName: farmer.fatherName.trim().slice(0, 160),
      village: farmer.village.trim().slice(0, 160),
      mobile: farmer.mobile.trim().slice(0, 20),
      createdAt: farmer.createdAt,
      updatedAt: farmer.updatedAt,
    };
    await setDoc(doc(db, 'users', userId, 'mph_farmers', docId), cleanForFirestore(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMphFarmerCascadeFromCloud(
  userId: string,
  farmerId: string,
  arrivalIds: string[],
  jFormIds: string[],
  otherIds: string[]
): Promise<void> {
  const fDocId = sanitizeDocId(farmerId);
  const path = `users/${userId}/mph_farmers/${fDocId}`;
  try {
    const batch = writeBatch(db);
    for (const aId of arrivalIds) {
      batch.delete(doc(db, 'users', userId, 'mph_arrivals', sanitizeDocId(aId)));
    }
    for (const jId of jFormIds) {
      batch.delete(doc(db, 'users', userId, 'mph_jforms', sanitizeDocId(jId)));
    }
    for (const oId of otherIds) {
      batch.delete(doc(db, 'users', userId, 'mph_other_entries', sanitizeDocId(oId)));
    }
    batch.delete(doc(db, 'users', userId, 'mph_farmers', fDocId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveMphArrivalToCloud(userId: string, arrival: MphArrival): Promise<void> {
  const docId = sanitizeDocId(arrival.id);
  const path = `users/${userId}/mph_arrivals/${docId}`;
  try {
    const payload: MphArrival = {
      id: docId,
      ownerId: userId,
      farmerId: sanitizeDocId(arrival.farmerId),
      farmerName: arrival.farmerName.trim().slice(0, 160),
      date: arrival.date.slice(0, 32),
      paddyType: arrival.paddyType,
      ratePerQuintal: Number(arrival.ratePerQuintal) || 0,
      bags: Math.max(0, Math.floor(Number(arrival.bags) || 0)),
      looseKg: Math.max(0, Math.floor(Number(arrival.looseKg) || 0)),
      looseGm: Math.max(0, Math.min(999, Math.floor(Number(arrival.looseGm) || 0))),
      totalQuintals: Number(arrival.totalQuintals) || 0,
      weightQtlPart: Math.max(0, Math.floor(Number(arrival.weightQtlPart) || 0)),
      weightKgPart: Math.max(0, Math.min(99, Math.floor(Number(arrival.weightKgPart) || 0))),
      weightGmPart: Math.max(0, Math.min(999, Math.floor(Number(arrival.weightGmPart) || 0))),
      paddyAmount: Number(arrival.paddyAmount) || 0,
      applyDryingLabor: Boolean(arrival.applyDryingLabor),
      notes: (arrival.notes || '').trim().slice(0, 400),
      createdAt: arrival.createdAt,
      updatedAt: arrival.updatedAt,
    };
    await setDoc(doc(db, 'users', userId, 'mph_arrivals', docId), cleanForFirestore(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMphArrivalFromCloud(userId: string, arrivalId: string): Promise<void> {
  const docId = sanitizeDocId(arrivalId);
  const path = `users/${userId}/mph_arrivals/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'mph_arrivals', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveMphJFormToCloud(userId: string, jForm: MphJForm): Promise<void> {
  const docId = sanitizeDocId(jForm.id);
  const path = `users/${userId}/mph_jforms/${docId}`;
  try {
    const payload: MphJForm = {
      id: docId,
      ownerId: userId,
      farmerId: sanitizeDocId(jForm.farmerId),
      farmerName: jForm.farmerName.trim().slice(0, 160),
      jFormHolderName: (jForm.jFormHolderName || jForm.farmerName || '').trim().slice(0, 160),
      holderRelation: (jForm.holderRelation || 'Self').trim().slice(0, 64),
      date: jForm.date.slice(0, 32),
      jFormNo: (jForm.jFormNo || '').trim().slice(0, 64),
      bags: Math.max(0, Math.floor(Number(jForm.bags) || 0)),
      rate: Number(jForm.rate) || 0,
      jFormAmount: Number(jForm.jFormAmount) || 0,
      notes: (jForm.notes || '').trim().slice(0, 400),
      createdAt: jForm.createdAt,
      updatedAt: jForm.updatedAt,
    };
    await setDoc(doc(db, 'users', userId, 'mph_jforms', docId), cleanForFirestore(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMphJFormFromCloud(userId: string, jFormId: string): Promise<void> {
  const docId = sanitizeDocId(jFormId);
  const path = `users/${userId}/mph_jforms/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'mph_jforms', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveMphOtherEntryToCloud(userId: string, entry: MphOtherEntry): Promise<void> {
  const docId = sanitizeDocId(entry.id);
  const path = `users/${userId}/mph_other_entries/${docId}`;
  try {
    const payload: MphOtherEntry = {
      id: docId,
      ownerId: userId,
      farmerId: sanitizeDocId(entry.farmerId),
      farmerName: entry.farmerName.trim().slice(0, 160),
      date: entry.date.slice(0, 32),
      entryType: entry.entryType,
      description: entry.description.trim().slice(0, 300),
      amount: Number(entry.amount) || 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
    await setDoc(doc(db, 'users', userId, 'mph_other_entries', docId), cleanForFirestore(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteMphOtherEntryFromCloud(userId: string, entryId: string): Promise<void> {
  const docId = sanitizeDocId(entryId);
  const path = `users/${userId}/mph_other_entries/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'mph_other_entries', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveMphSettingsToCloud(userId: string, settings: MphSettings): Promise<void> {
  const docId = 'default';
  const path = `users/${userId}/mph_settings/${docId}`;
  try {
    const payload: MphSettings = {
      id: docId,
      ownerId: userId,
      hybridPaddyRate: Math.max(0, Number(settings.hybridPaddyRate) || 0),
      paddyAGurdeRate: Math.max(0, Number(settings.paddyAGurdeRate) || 0),
      jFormLaborRate: Math.max(0, Number(settings.jFormLaborRate) || 0),
      paddyDryingLaborRate: Math.max(0, Number(settings.paddyDryingLaborRate) || 0),
      updatedAt: settings.updatedAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'mph_settings', docId), cleanForFirestore(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Uploads local Mandi Paddy Hisab data to Firestore in batches of <= 450 operations.
 */
export async function syncMphLocalDataToCloud(
  userId: string,
  data: {
    farmers: MphFarmer[];
    arrivals: MphArrival[];
    jForms: MphJForm[];
    otherEntries: MphOtherEntry[];
    settings: MphSettings;
  }
): Promise<number> {
  const ops: Array<{ path: any; payload: any }> = [];

  for (const f of data.farmers) {
    const docId = sanitizeDocId(f.id);
    ops.push({
      path: doc(db, 'users', userId, 'mph_farmers', docId),
      payload: cleanForFirestore({
        id: docId,
        ownerId: userId,
        name: f.name.trim().slice(0, 160),
        fatherName: f.fatherName.trim().slice(0, 160),
        village: f.village.trim().slice(0, 160),
        mobile: f.mobile.trim().slice(0, 20),
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      }),
    });
  }

  const farmerIdSet = new Set(data.farmers.map((f) => sanitizeDocId(f.id)));

  for (const a of data.arrivals) {
    const fId = sanitizeDocId(a.farmerId);
    if (!farmerIdSet.has(fId)) continue;
    const docId = sanitizeDocId(a.id);
    ops.push({
      path: doc(db, 'users', userId, 'mph_arrivals', docId),
      payload: cleanForFirestore({
        ...a,
        id: docId,
        ownerId: userId,
        farmerId: fId,
        farmerName: a.farmerName.trim().slice(0, 160),
        notes: (a.notes || '').trim().slice(0, 400),
      }),
    });
  }

  for (const j of data.jForms) {
    const fId = sanitizeDocId(j.farmerId);
    if (!farmerIdSet.has(fId)) continue;
    const docId = sanitizeDocId(j.id);
    ops.push({
      path: doc(db, 'users', userId, 'mph_jforms', docId),
      payload: cleanForFirestore({
        ...j,
        id: docId,
        ownerId: userId,
        farmerId: fId,
        farmerName: j.farmerName.trim().slice(0, 160),
        jFormHolderName: (j.jFormHolderName || j.farmerName || '').trim().slice(0, 160),
        holderRelation: (j.holderRelation || 'Self').trim().slice(0, 64),
        jFormNo: (j.jFormNo || '').trim().slice(0, 64),
        notes: (j.notes || '').trim().slice(0, 400),
      }),
    });
  }

  for (const o of data.otherEntries) {
    const fId = sanitizeDocId(o.farmerId);
    if (!farmerIdSet.has(fId)) continue;
    const docId = sanitizeDocId(o.id);
    ops.push({
      path: doc(db, 'users', userId, 'mph_other_entries', docId),
      payload: cleanForFirestore({
        ...o,
        id: docId,
        ownerId: userId,
        farmerId: fId,
        farmerName: o.farmerName.trim().slice(0, 160),
        description: o.description.trim().slice(0, 300),
      }),
    });
  }

  ops.push({
    path: doc(db, 'users', userId, 'mph_settings', 'default'),
    payload: cleanForFirestore({
      ...data.settings,
      id: 'default',
      ownerId: userId,
    }),
  });

  try {
    const CHUNK = 400;
    for (let i = 0; i < ops.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + CHUNK)) {
        batch.set(op.path, op.payload);
      }
      await batch.commit();
    }
    return ops.length;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/mph_sync`);
    return 0;
  }
}

/**
 * Subscribes to all Mandi Paddy Hisab collections in Firestore for the signed-in user.
 */
export function subscribeToMphCloudData(
  userId: string,
  callbacks: {
    onFarmers: (farmers: MphFarmer[]) => void;
    onArrivals: (arrivals: MphArrival[]) => void;
    onJForms: (jForms: MphJForm[]) => void;
    onOtherEntries: (entries: MphOtherEntry[]) => void;
    onSettings: (settings: MphSettings) => void;
  }
): () => void {
  const unsubscribers: Array<() => void> = [];

  const farmersPath = `users/${userId}/mph_farmers`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'mph_farmers'), where('ownerId', '==', userId)),
      (snap) => {
        const list: MphFarmer[] = [];
        snap.forEach((d) => list.push(d.data() as MphFarmer));
        callbacks.onFarmers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, farmersPath)
    )
  );

  const arrivalsPath = `users/${userId}/mph_arrivals`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'mph_arrivals'), where('ownerId', '==', userId)),
      (snap) => {
        const list: MphArrival[] = [];
        snap.forEach((d) => list.push(d.data() as MphArrival));
        callbacks.onArrivals(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, arrivalsPath)
    )
  );

  const jFormsPath = `users/${userId}/mph_jforms`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'mph_jforms'), where('ownerId', '==', userId)),
      (snap) => {
        const list: MphJForm[] = [];
        snap.forEach((d) => list.push(d.data() as MphJForm));
        callbacks.onJForms(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, jFormsPath)
    )
  );

  const otherPath = `users/${userId}/mph_other_entries`;
  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'users', userId, 'mph_other_entries'), where('ownerId', '==', userId)),
      (snap) => {
        const list: MphOtherEntry[] = [];
        snap.forEach((d) => list.push(d.data() as MphOtherEntry));
        callbacks.onOtherEntries(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, otherPath)
    )
  );

  const settingsPath = `users/${userId}/mph_settings/default`;
  unsubscribers.push(
    onSnapshot(
      doc(db, 'users', userId, 'mph_settings', 'default'),
      (snap) => {
        if (snap.exists()) {
          callbacks.onSettings(snap.data() as MphSettings);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, settingsPath)
    )
  );

  return () => {
    unsubscribers.forEach((u) => u());
  };
}
