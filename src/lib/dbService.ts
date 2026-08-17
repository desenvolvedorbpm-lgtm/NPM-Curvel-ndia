import { doc, setDoc, onSnapshot, disableNetwork } from "firebase/firestore";
import { db } from "./firebase";
import { getItemIDB, setItemIDB } from "./idbService";
import {
  UnidadeTenant,
  PostoServico,
  Militar,
  Afastamento,
  EscalaItem,
  UsuarioAuth,
  PerfilAcesso,
  RegistroFolga96h
} from "../types";

const COLLECTION_NAME = "app_data";
const QUOTA_KEY = "firestore_quota_exceeded_v2";

export interface AppDatabaseState {
  unidades: UnidadeTenant[];
  postos: PostoServico[];
  militares: Militar[];
  afastamentos: Afastamento[];
  escalas: EscalaItem[];
  usuarios: UsuarioAuth[];
  perfisAcesso: PerfilAcesso[];
  registrosFolga96h: RegistroFolga96h[];
}

// In-memory serialized cache to prevent unnecessary writes
const lastCache: Record<string, string> = {};
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};

let isQuotaExceeded = false;

function getLocalTimestamp(key: string): number {
  try {
    const val = localStorage.getItem(`pmmt_ts_${key}`);
    return val ? parseInt(val, 10) : 0;
  } catch (_) {
    return 0;
  }
}

function setLocalTimestamp(key: string, ts: number): void {
  try {
    localStorage.setItem(`pmmt_ts_${key}`, ts.toString());
  } catch (_) {}
}

// Check stored quota status on load
try {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(QUOTA_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      if (Date.now() - timestamp < 12 * 60 * 60 * 1000) {
        isQuotaExceeded = true;
        disableNetwork(db).catch(() => {});
      } else {
        localStorage.removeItem(QUOTA_KEY);
      }
    }
  }
} catch (_) {}

function markQuotaExceeded() {
  if (!isQuotaExceeded) {
    isQuotaExceeded = true;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(QUOTA_KEY, Date.now().toString());
      }
    } catch (_) {}
    try {
      disableNetwork(db).catch(() => {});
    } catch (_) {}
    console.warn(
      "Firestore quota limit reached. Network sync disabled; system operating safely via IndexedDB local storage."
    );
  }
}

// Global window unhandled error & rejection listener for Firebase resource-exhausted errors
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (
      reason?.code === "resource-exhausted" ||
      (reason?.message &&
        (reason.message.includes("resource-exhausted") ||
          reason.message.includes("Quota limit exceeded") ||
          reason.message.includes("quota")))
    ) {
      markQuotaExceeded();
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener("error", (event) => {
    if (
      event.message &&
      (event.message.includes("resource-exhausted") ||
        event.message.includes("Quota limit exceeded") ||
        event.message.includes("quota"))
    ) {
      markQuotaExceeded();
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

/**
 * Loads stale collection data from IndexedDB or LocalStorage instantly (stale-while-revalidate pattern).
 */
export async function loadStaleCollection<T>(
  key: keyof AppDatabaseState,
  fallback: T[]
): Promise<T[]> {
  try {
    const idbData = await getItemIDB<T>(key);
    if (idbData && idbData.items && idbData.items.length > 0) {
      lastCache[key] = JSON.stringify(idbData.items);
      setLocalTimestamp(key, idbData.updatedAt || Date.now());
      return idbData.items;
    }

    // Fallback to localStorage if IDB is empty
    if (typeof localStorage !== "undefined") {
      const lsVal = localStorage.getItem(`pmmt_app_${key}`);
      if (lsVal) {
        const parsed = JSON.parse(lsVal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          lastCache[key] = lsVal;
          const ts = getLocalTimestamp(key) || Date.now();
          // Seed IndexedDB
          setItemIDB(key, parsed, ts).catch(() => {});
          return parsed;
        }
      }
    }
  } catch (error) {
    console.warn(`Error loading stale data for ${key}:`, error);
  }

  return fallback;
}

/**
 * Recursively removes all `undefined` values and converts objects to Firestore-safe structures.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== "object") {
    return data;
  }
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (_) {
    if (Array.isArray(data)) {
      return data
        .filter((item) => item !== undefined)
        .map((item) => sanitizeForFirestore(item)) as unknown as T;
    }
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as unknown as T;
  }
}

/**
 * Save collection items to IndexedDB & LocalStorage instantly, and Firestore debounced.
 */
export async function saveCollectionToFirestore<T>(
  key: keyof AppDatabaseState,
  data: T[]
): Promise<void> {
  const sanitized = sanitizeForFirestore(data);
  const serialized = JSON.stringify(sanitized);

  if (lastCache[key] === serialized) {
    return;
  }

  const now = Date.now();
  lastCache[key] = serialized;
  setLocalTimestamp(key, now);

  // Instant local persistence to IndexedDB and LocalStorage
  setItemIDB(key, sanitized, now).catch(() => {});
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`pmmt_app_${key}`, serialized);
    }
  } catch (_) {}

  if (isQuotaExceeded) {
    return;
  }

  // Clear existing debounce timer if any
  if (writeTimers[key]) {
    clearTimeout(writeTimers[key]);
  }

  // Debounce cloud write by 1500ms
  writeTimers[key] = setTimeout(async () => {
    if (isQuotaExceeded) return;

    try {
      const docRef = doc(db, COLLECTION_NAME, key);
      await setDoc(docRef, {
        items: sanitized,
        updatedAt: now
      });
    } catch (error: any) {
      if (
        error?.code === "resource-exhausted" ||
        (error?.message &&
          (error.message.includes("resource-exhausted") ||
            error.message.includes("Quota limit exceeded") ||
            error.message.includes("quota")))
      ) {
        markQuotaExceeded();
      } else {
        console.error(`Error saving ${key} to Firestore:`, error);
      }
    }
  }, 1500);
}

/**
 * Subscribe to real-time updates for a given collection from Firestore (revalidation step).
 * Updates local IndexedDB/LocalStorage if remote data is strictly newer.
 */
export function subscribeToCollection<T>(
  key: keyof AppDatabaseState,
  initialLocalItems: T[],
  onUpdate: (items: T[]) => void
): () => void {
  // First, asynchronously populate from IndexedDB/LocalStorage if available (stale-while-revalidate)
  loadStaleCollection<T>(key, initialLocalItems).then((staleItems) => {
    if (staleItems && staleItems.length > 0) {
      const serialized = JSON.stringify(staleItems);
      if (lastCache[key] !== serialized) {
        lastCache[key] = serialized;
        onUpdate(staleItems);
      }
    }
  });

  if (isQuotaExceeded) {
    return () => {};
  }

  const docRef = doc(db, COLLECTION_NAME, key);

  if (lastCache[key] === undefined && initialLocalItems) {
    lastCache[key] = JSON.stringify(initialLocalItems);
  }

  let unsub: (() => void) | null = null;

  try {
    unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (isQuotaExceeded) return;
        if (docSnap.metadata.hasPendingWrites) {
          return;
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.items)) {
            const remoteTs =
              typeof data.updatedAt === "number"
                ? data.updatedAt
                : data.updatedAt
                ? new Date(data.updatedAt).getTime()
                : 0;
            const localTs = getLocalTimestamp(key);

            // Stale-While-Revalidate: Adopt remote items ONLY if remote is strictly newer
            if (remoteTs > localTs) {
              const serializedRemote = JSON.stringify(data.items);
              if (lastCache[key] !== serializedRemote) {
                lastCache[key] = serializedRemote;
                setLocalTimestamp(key, remoteTs);
                setItemIDB(key, data.items as T[], remoteTs).catch(() => {});
                try {
                  if (typeof localStorage !== "undefined") {
                    localStorage.setItem(`pmmt_app_${key}`, serializedRemote);
                  }
                } catch (_) {}
                onUpdate(data.items as T[]);
              }
            }
          }
        }
      },
      (error: any) => {
        if (
          error?.code === "resource-exhausted" ||
          (error?.message &&
            (error.message.includes("resource-exhausted") ||
              error.message.includes("Quota limit exceeded") ||
              error.message.includes("quota")))
        ) {
          markQuotaExceeded();
          if (unsub) {
            try {
              unsub();
            } catch (_) {}
          }
        }
      }
    );
  } catch (err: any) {
    if (
      err?.code === "resource-exhausted" ||
      (err?.message &&
        (err.message.includes("resource-exhausted") ||
          err.message.includes("Quota limit exceeded") ||
          err.message.includes("quota")))
    ) {
      markQuotaExceeded();
    }
  }

  return () => {
    if (unsub) {
      try {
        unsub();
      } catch (_) {}
    }
  };
}



