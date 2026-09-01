export interface SavedVideo {
  id: string;
  title: string;
  blob: Blob;
  duration: number; // in seconds
  size: number; // in bytes
  date: string;
  thumbnail: string; // Base64 URL
}

export interface SavedProject {
  id: string;
  title: string;
  date: string;
  data: string; // JSON serialized EditorProject (clips & titles)
  clipCount: number;
  totalDuration: number;
}

const DB_NAME = 'capt-screen-db';
const DB_VERSION = 2;
const STORE_NAME = 'recordings';
const PROJECTS_STORE_NAME = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
        db.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getAllRecordings(): Promise<SavedVideo[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Sort by date descending
        const results = request.result as SavedVideo[];
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(results);
      };
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return [];
  }
}

export async function saveRecording(video: SavedVideo): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(video);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function renameRecording(id: string, newTitle: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // First get the record
    const getRequest = store.get(id);
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const record = getRequest.result as SavedVideo;
      if (record) {
        record.title = newTitle;
        const putRequest = store.put(record);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        reject(new Error('Record not found'));
      }
    };
  });
}

export async function getAllProjects(): Promise<SavedProject[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROJECTS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result as SavedProject[];
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(results);
      };
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export async function saveProject(project: SavedProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE_NAME);
    const request = store.put(project);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
