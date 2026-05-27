/**
 * Cola offline simple para POSTs de venta usando IndexedDB.
 *
 * Flujo:
 *  1. UI llama enqueueSale(payload) cuando detecta offline (o cuando POST falla con TypeError de red)
 *  2. Al volver la conexion (event "online" o reintento manual) se llama drainQueue(submitFn)
 *  3. submitFn recibe el payload y devuelve la respuesta o lanza error
 *  4. Si exito -> remove del queue. Si falla -> se queda y se reintenta despues.
 */

const DB_NAME = "saas-pos-offline";
const STORE = "pending_sales";
const VERSION = 1;

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async (mode = "readonly") => {
  const db = await openDb();
  return db.transaction(STORE, mode).objectStore(STORE);
};

export const enqueueSale = async (payload) => {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.add({
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const listPending = async () => {
  const store = await tx();
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const removePending = async (id) => {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const updatePending = async (id, patch) => {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result;
      if (!current) return resolve();
      const updated = { ...current, ...patch };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
};

/**
 * Drena la cola enviando cada venta al backend via submitFn(payload).
 * Devuelve { sent, failed }.
 *
 * Si una venta falla con error de red, se queda en la cola.
 * Si falla con error funcional (4xx), tambien se queda y queda registrado
 * el lastError para inspeccion manual.
 */
export const drainQueue = async (submitFn) => {
  const pending = await listPending();
  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await submitFn(item.payload);
      await removePending(item.id);
      sent += 1;
    } catch (error) {
      failed += 1;
      await updatePending(item.id, {
        attempts: (item.attempts || 0) + 1,
        lastError: error?.message || String(error),
      });
    }
  }

  return { sent, failed };
};

export const isNetworkError = (error) => {
  // Axios sin response es error de red
  if (!error?.response && error?.message) {
    return /network|offline|fetch|timeout/i.test(error.message);
  }
  return false;
};
