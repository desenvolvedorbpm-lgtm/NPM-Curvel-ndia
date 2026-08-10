import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
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

export interface AppDatabaseState {
  unidades: UnidadeTenant[];
  postos: PostoServico[];
  militares: Militar[];
  afastamentos: Afastamento[];
  escalas: EscalaItem[];
  usuarios: UsuarioAuth[];
}

// In-memory serialized cache to prevent feedback loops between Firestore snapshot listeners and local state updates
const lastCache: Record<string, string> = {};
const writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let isQuotaExceeded = false;

/**
 * Save collection items to Firestore safely with debouncing and error handling.
 * Only writes to Firestore if the data actually changed compared to the last cached snapshot.
 */
export async function saveCollectionToFirestore<T>(
  key: keyof AppDatabaseState,
  data: T[]
): Promise<void> {
  if (isQuotaExceeded) {
    // Quota reached on Firestore free tier; operational data remains safely persisted in LocalStorage
    return;
  }

  const serialized = JSON.stringify(data);

  // If first run and cache is empty, seed lastCache to prevent immediate startup write burst
  if (lastCache[key] === undefined) {
    lastCache[key] = serialized;
    return;
  }

  if (lastCache[key] === serialized) {
    // Data is identical to what is already stored/received; skip write
    return;
  }

  // Clear existing debounce timer if any
  if (writeTimers[key]) {
    clearTimeout(writeTimers[key]);
  }

  // Debounce writes by 1000ms
  writeTimers[key] = setTimeout(async () => {
    if (isQuotaExceeded) return;
    lastCache[key] = serialized;

    try {
      const docRef = doc(db, COLLECTION_NAME, key);
      await setDoc(docRef, {
        items: data,
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      if (
        error?.code === "resource-exhausted" ||
        (error?.message && error.message.includes("resource-exhausted"))
      ) {
        if (!isQuotaExceeded) {
          isQuotaExceeded = true;
          console.warn("Firestore write quota reached. System falling back to local storage seamless persistence.");
        }
      } else {
        console.error(`Error saving ${key} to Firestore:`, error);
      }
    }
  }, 1000);
}

/**
 * Subscribe to real-time updates for a given collection from Firestore.
 * If the document doesn't exist in Firestore, initializes it with local initial items.
 */
export function subscribeToCollection<T>(
  key: keyof AppDatabaseState,
  initialLocalItems: T[],
  onUpdate: (items: T[]) => void
): () => void {
  const docRef = doc(db, COLLECTION_NAME, key);

  // Seed lastCache with initial items if not set
  if (lastCache[key] === undefined && initialLocalItems) {
    lastCache[key] = JSON.stringify(initialLocalItems);
  }

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      // Ignore local pending writes to avoid echoing back local state updates
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
      } else if (!isQuotaExceeded) {
        // Document does not exist yet on Firestore, seed it with initial items
        if (initialLocalItems && initialLocalItems.length > 0) {
          const serializedInitial = JSON.stringify(initialLocalItems);
          if (lastCache[key] !== serializedInitial) {
            lastCache[key] = serializedInitial;
            setDoc(docRef, {
              items: initialLocalItems,
              updatedAt: new Date().toISOString()
            }).catch((err: any) => {
              if (
                err?.code === "resource-exhausted" ||
                (err?.message && err.message.includes("resource-exhausted"))
              ) {
                isQuotaExceeded = true;
              } else {
                console.error(`Error seeding ${key} to Firestore:`, err);
              }
            });
          }
        }
      }
    },
    (error: any) => {
      if (
        error?.code === "resource-exhausted" ||
        (error?.message && error.message.includes("resource-exhausted"))
      ) {
        isQuotaExceeded = true;
      } else {
        console.warn(`Firestore subscription notice for ${key}:`, error);
      }
    }
  );

  return unsubscribe;
}
