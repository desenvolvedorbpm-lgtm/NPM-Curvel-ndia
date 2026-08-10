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

/**
 * Save collection items to Firestore safely.
 * Only writes to Firestore if the data actually changed compared to the last cached snapshot.
 */
export async function saveCollectionToFirestore<T>(
  key: keyof AppDatabaseState,
  data: T[]
): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    if (lastCache[key] === serialized) {
      // Data is identical to what is already stored/received; skip write
      return;
    }

    lastCache[key] = serialized;

    const docRef = doc(db, COLLECTION_NAME, key);
    await setDoc(docRef, {
      items: data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error saving ${key} to Firestore:`, error);
  }
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
      } else {
        // Document does not exist yet on Firestore, seed it with initial items
        if (initialLocalItems && initialLocalItems.length > 0) {
          const serializedInitial = JSON.stringify(initialLocalItems);
          if (lastCache[key] !== serializedInitial) {
            lastCache[key] = serializedInitial;
            setDoc(docRef, {
              items: initialLocalItems,
              updatedAt: new Date().toISOString()
            }).catch((err) => console.error(`Error seeding ${key} to Firestore:`, err));
          }
        }
      }
    },
    (error) => {
      console.warn(`Firestore subscription notice for ${key}:`, error);
    }
  );

  return unsubscribe;
}
