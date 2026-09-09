export type MediaType = 'video' | 'image' | 'audio';

export interface SavedMedia {
  id: string;
  title: string;
  blob: Blob;
  type?: MediaType;
  mimeType?: string;
  duration?: number; // in seconds (0 for images)
  size: number; // in bytes
  date: string;
  thumbnail?: string; // Base64 URL or image preview
  projectId?: string | null; // ID of the associated folder/project
  width?: number;
  height?: number;
}

// Backward-compatible alias for existing components
export type SavedVideo = SavedMedia;

export interface MediaProject {
  id: string;
  name: string;
  color: string; // Hex color for project badge/folder tag
  description?: string;
  date: string;
}

export interface SavedProject {
  id: string;
  title: string;
  date: string;
  data: string; // JSON serialized EditorProject (clips & titles)
  clipCount: number;
  totalDuration: number;
}

export interface TeleprompterScript {
  id: string;
  title: string;
  content: string;
  date: string;
  wpm?: number; // target words per minute (e.g. 130)
  fontSize?: number; // text font size in px (e.g. 24)
}

const DB_NAME = 'capt-screen-db';
const DB_VERSION = 4;
const STORE_NAME = 'recordings';
const PROJECTS_STORE_NAME = 'projects';
const MEDIA_PROJECTS_STORE_NAME = 'media_projects';
const SCRIPTS_STORE_NAME = 'teleprompter_scripts';

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
      if (!db.objectStoreNames.contains(MEDIA_PROJECTS_STORE_NAME)) {
        db.createObjectStore(MEDIA_PROJECTS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SCRIPTS_STORE_NAME)) {
        db.createObjectStore(SCRIPTS_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all media items (videos, images, audios) from local storage
 */
export async function getAllMedia(): Promise<SavedMedia[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const rawResults = (request.result as any[]) || [];
        // Ensure default type is 'video' for backward compatibility
        const results: SavedMedia[] = rawResults.map((item) => ({
          ...item,
          type: item.type || (item.mimeType?.startsWith('image/') ? 'image' : item.mimeType?.startsWith('audio/') ? 'audio' : 'video'),
          duration: item.duration ?? 0,
          projectId: item.projectId ?? null
        }));
        // Sort by date descending
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(results);
      };
    });
  } catch (error) {
    console.error('Error fetching media items:', error);
    return [];
  }
}

// Backward-compatible alias
export const getAllRecordings = getAllMedia;

/**
 * Save a media item (recording or imported file)
 */
export async function saveMedia(media: SavedMedia): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const itemToSave = {
      ...media,
      type: media.type || 'video',
      duration: media.duration ?? 0,
      projectId: media.projectId ?? null
    };
    const request = store.put(itemToSave);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Backward-compatible alias
export const saveRecording = saveMedia;

/**
 * Delete a media item by ID
 */
export async function deleteMedia(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Backward-compatible alias
export const deleteRecording = deleteMedia;

/**
 * Rename a media item
 */
export async function renameMedia(id: string, newTitle: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get(id);
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const record = getRequest.result as SavedMedia;
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

// Backward-compatible alias
export const renameRecording = renameMedia;

/**
 * Assign or reassign a media item to a project (or null to unassign)
 */
export async function updateMediaProject(mediaId: string, projectId: string | null): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(mediaId);
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const record = getRequest.result as SavedMedia;
      if (record) {
        record.projectId = projectId;
        const putRequest = store.put(record);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        reject(new Error('Record not found'));
      }
    };
  });
}

/**
 * Fetch all media projects/folders
 */
export async function getAllMediaProjects(): Promise<MediaProject[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIA_PROJECTS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(MEDIA_PROJECTS_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = (request.result as MediaProject[]) || [];
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(results);
      };
    });
  } catch (error) {
    console.error('Error fetching media projects:', error);
    return [];
  }
}

/**
 * Create or update a media project
 */
export async function saveMediaProject(project: MediaProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_PROJECTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(MEDIA_PROJECTS_STORE_NAME);
    const request = store.put(project);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Delete a media project by ID.
 * If unassignMedia is true, resets projectId to null for all associated media.
 */
export async function deleteMediaProject(projectId: string, unassignMedia: boolean = true): Promise<void> {
  const db = await openDB();
  
  if (unassignMedia) {
    try {
      const allMedia = await getAllMedia();
      for (const m of allMedia) {
        if (m.projectId === projectId) {
          await updateMediaProject(m.id, null);
        }
      }
    } catch (e) {
      console.warn('Could not unassign media items:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_PROJECTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(MEDIA_PROJECTS_STORE_NAME);
    const request = store.delete(projectId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Studio Montage Editor Projects
 */
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
    console.error('Error fetching studio projects:', error);
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

/**
 * Teleprompter Scripts CRUD
 */
export async function getAllTeleprompterScripts(): Promise<TeleprompterScript[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SCRIPTS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(SCRIPTS_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = (request.result as TeleprompterScript[]) || [];
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(results);
      };
    });
  } catch (error) {
    console.error('Error fetching teleprompter scripts:', error);
    return [];
  }
}

export async function saveTeleprompterScript(script: TeleprompterScript): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCRIPTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SCRIPTS_STORE_NAME);
    const request = store.put(script);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteTeleprompterScript(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SCRIPTS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SCRIPTS_STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

