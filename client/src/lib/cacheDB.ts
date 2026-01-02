const DB_NAME = "AppCacheDB";
const DB_VERSION = 1;

export type CacheKey = "efeed" | "videos" | "groupMessages" | "directMessages" | "professorMessages" | "conversations" | "classes" | "grades" | "events" | "professorConversations";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

class CacheDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache");
        }
      };
    });

    await this.initPromise;
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    try {
      await this.init();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(["cache"], "readonly");
        const store = transaction.objectStore("cache");
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;
          
          if (!entry) {
            resolve(null);
            return;
          }

          // Check if cache is expired
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            // Cache expired, delete it
            this.delete(key);
            resolve(null);
            return;
          }

          resolve(entry.data);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error reading from cache:", error);
      return null;
    }
  }

  async set<T>(key: CacheKey, data: T, ttlMs?: number): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(["cache"], "readwrite");
        const store = transaction.objectStore("cache");
        const request = store.put(entry, key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error writing to cache:", error);
    }
  }

  async delete(key: CacheKey): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(["cache"], "readwrite");
        const store = transaction.objectStore("cache");
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error deleting from cache:", error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(["cache"], "readwrite");
        const store = transaction.objectStore("cache");
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  async getAllKeys(): Promise<CacheKey[]> {
    try {
      await this.init();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(["cache"], "readonly");
        const store = transaction.objectStore("cache");
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result as CacheKey[]);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error getting all keys:", error);
      return [];
    }
  }

  // Get cache metadata (timestamp and expiration info)
  async getCacheInfo(key: CacheKey): Promise<{ timestamp: number; expiresAt?: number } | null> {
    try {
      await this.init();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(["cache"], "readonly");
        const store = transaction.objectStore("cache");
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<any> | undefined;
          if (!entry) {
            resolve(null);
            return;
          }

          resolve({
            timestamp: entry.timestamp,
            expiresAt: entry.expiresAt,
          });
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Error getting cache info:", error);
      return null;
    }
  }
}

// Singleton instance
export const cacheDB = new CacheDB();

// Helper functions for common operations
export const getCachedData = <T>(key: CacheKey) => cacheDB.get<T>(key);
export const setCachedData = <T>(key: CacheKey, data: T, ttlMs?: number) => cacheDB.set(key, data, ttlMs);
export const deleteCachedData = (key: CacheKey) => cacheDB.delete(key);
export const clearCache = () => cacheDB.clear();

