import { doc, setDoc, onSnapshot, disableNetwork } from "firebase/firestore";
import { db } from "./firebase";
import {
  UnidadeTenant,
  PostoServico,
  Militar,
  Afastamento,
  EscalaItem,
  UsuarioAuth
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
}

// In-memory serialized cache to prevent feedback loops
const lastCache: Record<string, string> = {};
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};

let isQuotaExceeded = false;

// Check stored quota status on load
try {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(QUOTA_KEY);
    if (stored) {
      const timestamp = parseInt(stored, 10);
      // Reset after 12 hours (43,200,000 ms) to check if quota restored
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
      "Firestore quota limit reached. Network sync disabled; system operating safely via local storage."
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
 * Save collection items to Firestore safely with debouncing and error handling.
 * Only writes to Firestore if the data actually changed compared to the last cached snapshot.
 */
export async function saveCollectionToFirestore<T>(
  key: keyof AppDatabaseState,
  data: T[]
): Promise<void> {
  if (isQuotaExceeded) {
    return;
  }

  const serialized = JSON.stringify(data);

  // If first run and cache is empty, seed lastCache to prevent immediate startup write burst
  if (lastCache[key] === undefined) {
    lastCache[key] = serialized;
    return;
  }

  if (lastCache[key] === serialized) {
    return;
  }

  // Clear existing debounce timer if any
  if (writeTimers[key]) {
    clearTimeout(writeTimers[key]);
  }

  // Debounce writes by 2000ms to minimize API calls
  writeTimers[key] = setTimeout(async () => {
    if (isQuotaExceeded) return;

    try {
      lastCache[key] = serialized;
      const docRef = doc(db, COLLECTION_NAME, key);
      await setDoc(docRef, {
        items: data,
        updatedAt: new Date().toISOString()
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
  }, 2000);
}

/**
 * Subscribe to real-time updates for a given collection from Firestore.
 */
export function subscribeToCollection<T>(
  key: keyof AppDatabaseState,
  initialLocalItems: T[],
  onUpdate: (items: T[]) => void
): () => void {
  if (isQuotaExceeded) {
    return () => {};
  }

  const docRef = doc(db, COLLECTION_NAME, key);

  // Seed lastCache with initial items if not set
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
            const serializedRemote = JSON.stringify(data.items);
            if (lastCache[key] !== serializedRemote) {
              lastCache[key] = serializedRemote;
              onUpdate(data.items as T[]);
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

