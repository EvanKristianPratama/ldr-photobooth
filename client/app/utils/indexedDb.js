const DB_NAME = 'LDRPhotoboothDB';
const DB_VERSION = 1;
const STORE_NAME = 'booth_session';

function getDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window not defined'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function saveSessionToIndexedDb({ mergedImage, localBlobs, remoteBlobs, liveFrames, remoteLiveFrames }) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (mergedImage) {
      store.put(mergedImage, 'mergedImage');
    }
    if (localBlobs && localBlobs.length > 0) {
      store.put(localBlobs, 'localBlobs');
    }
    if (remoteBlobs) {
      // remoteBlobs is passed as Map entries: Array.from(remoteBlobsMap.entries())
      store.put(remoteBlobs, 'remoteBlobs');
    }
    if (liveFrames) {
      store.put(liveFrames, 'liveFrames');
    }
    if (remoteLiveFrames) {
      store.put(remoteLiveFrames, 'remoteLiveFrames');
    }
    await new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.error('IndexedDB save failed:', err);
  }
}

export async function loadSessionFromIndexedDb() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const mergedImage = await new Promise((resolve) => {
      const req = store.get('mergedImage');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    const localBlobs = await new Promise((resolve) => {
      const req = store.get('localBlobs');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const remoteBlobs = await new Promise((resolve) => {
      const req = store.get('remoteBlobs');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    const liveFrames = await new Promise((resolve) => {
      const req = store.get('liveFrames');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    const remoteLiveFrames = await new Promise((resolve) => {
      const req = store.get('remoteLiveFrames');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    return { mergedImage, localBlobs, remoteBlobs, liveFrames, remoteLiveFrames };
  } catch (err) {
    console.error('IndexedDB load failed:', err);
    return { mergedImage: null, localBlobs: [], remoteBlobs: null, liveFrames: null, remoteLiveFrames: null };
  }
}

export async function clearSessionFromIndexedDb() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('mergedImage');
    store.delete('localBlobs');
    store.delete('remoteBlobs');
    store.delete('liveFrames');
    store.delete('remoteLiveFrames');
  } catch (err) {
    console.error('IndexedDB clear failed:', err);
  }
}
