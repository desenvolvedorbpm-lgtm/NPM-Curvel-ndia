const DB_NAME = "pmmt_escala_idb";
const DB_VERSION = 1;
const STORE_NAME = "collections";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function getItemIDB<T>(
  key: string
): Promise<{ items: T[]; updatedAt: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            items: request.result.items || [],
            updatedAt: request.result.updatedAt || 0
          });
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.warn(`IndexedDB read error for ${key}:`, error);
    return null;
  }
}

export async function setItemIDB<T>(
  key: string,
  items: T[],
  updatedAt: number
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ id: key, items, updatedAt });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn(`IndexedDB write error for ${key}:`, error);
  }
}
