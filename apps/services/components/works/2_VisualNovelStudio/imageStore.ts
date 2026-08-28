const DB_NAME = "vn-studio-images";
const STORE = "images";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadBlobUrls(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const db = await openDB();
  const map = new Map<string, string>();
  await Promise.all(
    ids.map(
      (id) =>
        new Promise<void>((resolve, reject) => {
          const req = db.transaction(STORE).objectStore(STORE).get(id);
          req.onsuccess = () => {
            const blob = req.result as Blob | undefined;
            if (blob) map.set(id, URL.createObjectURL(blob));
            resolve();
          };
          req.onerror = () => reject(req.error);
        }),
    ),
  );
  return map;
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
