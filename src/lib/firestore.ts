import { 
  getFirestore, 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { auth } from './auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  FarmerMaster, 
  CropArrivalEntry, 
  BardanaEntry, 
  AgencyPurchaseEntry, 
  LiftingDispatchEntry, 
  GoogleSheetConfig 
} from '../types/mandi';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection() {
  try {
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline / check network connection');
    }
  }
}

// Sanitize ID for Firestore document path
export function sanitizeDocId(rawId: string): string {
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// User master sheet config
export async function saveMasterSheetConfigToCloud(userId: string, config: GoogleSheetConfig): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        email: auth.currentUser?.email || '',
        displayName: auth.currentUser?.displayName || '',
        sheetConfig: config,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getMasterSheetConfigFromCloud(userId: string): Promise<GoogleSheetConfig | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data();
      return (data.sheetConfig as GoogleSheetConfig) || null;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

// Save individual entities to Firestore
export async function saveFarmerToCloud(userId: string, farmer: FarmerMaster): Promise<void> {
  const docId = sanitizeDocId(farmer.id);
  const path = `users/${userId}/farmers/${docId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'farmers', docId), farmer);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteFarmerFromCloud(userId: string, farmerId: string): Promise<void> {
  const docId = sanitizeDocId(farmerId);
  const path = `users/${userId}/farmers/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'farmers', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveCropArrivalToCloud(userId: string, arrival: CropArrivalEntry): Promise<void> {
  const docId = sanitizeDocId(arrival.id);
  const path = `users/${userId}/crop_arrivals/${docId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'crop_arrivals', docId), arrival);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveBardanaToCloud(userId: string, entry: BardanaEntry): Promise<void> {
  const docId = sanitizeDocId(entry.id);
  const path = `users/${userId}/bardana_entries/${docId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'bardana_entries', docId), entry);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveAgencyPurchaseToCloud(userId: string, purchase: AgencyPurchaseEntry): Promise<void> {
  const docId = sanitizeDocId(purchase.id);
  const path = `users/${userId}/agency_purchases/${docId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'agency_purchases', docId), purchase);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveLiftingDispatchToCloud(userId: string, dispatch: LiftingDispatchEntry): Promise<void> {
  const docId = sanitizeDocId(dispatch.id);
  const path = `users/${userId}/lifting_dispatches/${docId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'lifting_dispatches', docId), dispatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Bulk sync from Local Storage to Cloud (Used when logging in on laptop so existing data is uploaded to Cloud)
export async function syncLocalDataToCloud(
  userId: string,
  data: {
    farmers?: FarmerMaster[];
    cropArrivals?: CropArrivalEntry[];
    bardanaEntries?: BardanaEntry[];
    agencyPurchases?: AgencyPurchaseEntry[];
    liftingDispatches?: LiftingDispatchEntry[];
    sheetConfig?: GoogleSheetConfig | null;
  }
): Promise<{ success: boolean; count: number }> {
  let count = 0;
  try {
    const batch = writeBatch(db);

    // Save sheet config if present
    if (data.sheetConfig) {
      const userDocRef = doc(db, 'users', userId);
      batch.set(
        userDocRef,
        {
          email: auth.currentUser?.email || '',
          displayName: auth.currentUser?.displayName || '',
          sheetConfig: data.sheetConfig,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      count++;
    }

    if (data.farmers) {
      for (const f of data.farmers) {
        const ref = doc(db, 'users', userId, 'farmers', sanitizeDocId(f.id));
        batch.set(ref, f);
        count++;
      }
    }

    if (data.cropArrivals) {
      for (const a of data.cropArrivals) {
        const ref = doc(db, 'users', userId, 'crop_arrivals', sanitizeDocId(a.id));
        batch.set(ref, a);
        count++;
      }
    }

    if (data.bardanaEntries) {
      for (const b of data.bardanaEntries) {
        const ref = doc(db, 'users', userId, 'bardana_entries', sanitizeDocId(b.id));
        batch.set(ref, b);
        count++;
      }
    }

    if (data.agencyPurchases) {
      for (const p of data.agencyPurchases) {
        const ref = doc(db, 'users', userId, 'agency_purchases', sanitizeDocId(p.id));
        batch.set(ref, p);
        count++;
      }
    }

    if (data.liftingDispatches) {
      for (const l of data.liftingDispatches) {
        const ref = doc(db, 'users', userId, 'lifting_dispatches', sanitizeDocId(l.id));
        batch.set(ref, l);
        count++;
      }
    }

    await batch.commit();
    return { success: true, count };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    return { success: false, count: 0 };
  }
}

// Real-time synchronization listeners
export function subscribeToUserCloudData(
  userId: string,
  callbacks: {
    onSheetConfig?: (config: GoogleSheetConfig | null) => void;
    onFarmers?: (farmers: FarmerMaster[]) => void;
    onCropArrivals?: (arrivals: CropArrivalEntry[]) => void;
    onBardana?: (bardana: BardanaEntry[]) => void;
    onPurchases?: (purchases: AgencyPurchaseEntry[]) => void;
    onLifting?: (lifting: LiftingDispatchEntry[]) => void;
  }
): () => void {
  const unsubscribers: (() => void)[] = [];

  // Listen to User Profile & Master Sheet Config
  const userDocPath = `users/${userId}`;
  const unsubUser = onSnapshot(
    doc(db, 'users', userId),
    (snap) => {
      if (snap.exists() && callbacks.onSheetConfig) {
        const data = snap.data();
        if (data?.sheetConfig) {
          callbacks.onSheetConfig(data.sheetConfig as GoogleSheetConfig);
        }
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, userDocPath);
    }
  );
  unsubscribers.push(unsubUser);

  // Listen to Farmers
  if (callbacks.onFarmers) {
    const path = `users/${userId}/farmers`;
    const unsub = onSnapshot(
      collection(db, 'users', userId, 'farmers'),
      (snapshot) => {
        const items: FarmerMaster[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as FarmerMaster));
        callbacks.onFarmers!(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
    unsubscribers.push(unsub);
  }

  // Listen to Crop Arrivals
  if (callbacks.onCropArrivals) {
    const path = `users/${userId}/crop_arrivals`;
    const unsub = onSnapshot(
      collection(db, 'users', userId, 'crop_arrivals'),
      (snapshot) => {
        const items: CropArrivalEntry[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as CropArrivalEntry));
        callbacks.onCropArrivals!(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
    unsubscribers.push(unsub);
  }

  // Listen to Bardana
  if (callbacks.onBardana) {
    const path = `users/${userId}/bardana_entries`;
    const unsub = onSnapshot(
      collection(db, 'users', userId, 'bardana_entries'),
      (snapshot) => {
        const items: BardanaEntry[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as BardanaEntry));
        callbacks.onBardana!(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
    unsubscribers.push(unsub);
  }

  // Listen to Agency Purchases
  if (callbacks.onPurchases) {
    const path = `users/${userId}/agency_purchases`;
    const unsub = onSnapshot(
      collection(db, 'users', userId, 'agency_purchases'),
      (snapshot) => {
        const items: AgencyPurchaseEntry[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as AgencyPurchaseEntry));
        callbacks.onPurchases!(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
    unsubscribers.push(unsub);
  }

  // Listen to Lifting Dispatches
  if (callbacks.onLifting) {
    const path = `users/${userId}/lifting_dispatches`;
    const unsub = onSnapshot(
      collection(db, 'users', userId, 'lifting_dispatches'),
      (snapshot) => {
        const items: LiftingDispatchEntry[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as LiftingDispatchEntry));
        callbacks.onLifting!(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
    unsubscribers.push(unsub);
  }

  return () => {
    unsubscribers.forEach((fn) => fn());
  };
}
