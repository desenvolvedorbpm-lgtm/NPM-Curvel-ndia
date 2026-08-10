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

/**
 * Save collection items to Firestore safely.
 */
export async function saveCollectionToFirestore<T>(
  key: keyof AppDatabaseState,
  data: T[]
): Promise<void> {
  try {
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
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.items)) {
          onUpdate(data.items as T[]);
        }
      } else {
        // Document does not exist yet on Firestore, seed it with initial items
        if (initialLocalItems && initialLocalItems.length > 0) {
          setDoc(docRef, {
            items: initialLocalItems,
            updatedAt: new Date().toISOString()
          }).catch((err) => console.error(`Error seeding ${key} to Firestore:`, err));
        }
      }
    },
    (error) => {
      console.warn(`Firestore subscription notice for ${key}:`, error);
    }
  );

  return unsubscribe;
}
