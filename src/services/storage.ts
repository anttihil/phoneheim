// IndexedDB Storage Module

import type { Warband } from '../types';

const DB_NAME = 'phoneheim';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

// Initialize the database
export async function initStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create warbands store
      if (!database.objectStoreNames.contains('warbands')) {
        const warbandStore = database.createObjectStore('warbands', { keyPath: 'id' });
        warbandStore.createIndex('name', 'name', { unique: false });
        warbandStore.createIndex('type', 'type', { unique: false });
      }

      // Create campaigns store
      if (!database.objectStoreNames.contains('campaigns')) {
        database.createObjectStore('campaigns', { keyPath: 'id' });
      }

      // Create settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      console.log('Database schema created');
    };
  });
}

// Save a warband
export async function saveWarband(warband: Warband): Promise<Warband> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    // Ensure warband has an ID
    if (!warband.id) {
      warband.id = generateId();
    }

    warband.updatedAt = new Date().toISOString();

    const transaction = db.transaction(['warbands'], 'readwrite');
    const store = transaction.objectStore('warbands');
    const request = store.put(warband);

    request.onsuccess = () => resolve(warband);
    request.onerror = () => reject(request.error);
  });
}

// Get all warbands
export async function getAllWarbands(): Promise<Warband[]> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['warbands'], 'readonly');
    const store = transaction.objectStore('warbands');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get a single warband by ID
export async function getWarband(id: string): Promise<Warband | undefined> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['warbands'], 'readonly');
    const store = transaction.objectStore('warbands');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete a warband
export async function deleteWarband(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['warbands'], 'readwrite');
    const store = transaction.objectStore('warbands');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Save settings
export async function saveSetting(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get a setting
export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

// Generate a unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export warband as JSON file
export function exportWarband(warband: Warband): void {
  const data = JSON.stringify(warband, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${warband.name || 'warband'}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// Import warband from JSON file
export async function importWarband(file: File): Promise<Warband> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const warband = JSON.parse(e.target?.result as string) as Warband;
        // Generate new ID to avoid conflicts
        warband.id = generateId();
        (warband as Warband & { importedAt?: string }).importedAt = new Date().toISOString();
        await saveWarband(warband);
        resolve(warband);
      } catch (error) {
        reject(new Error('Invalid warband file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
