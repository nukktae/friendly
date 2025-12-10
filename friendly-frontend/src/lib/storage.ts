/**
 * Storage abstraction layer
 * Provides platform-agnostic storage interface
 * Services should use this instead of directly importing AsyncStorage
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiRemove(keys: string[]): Promise<void>;
}

/**
 * Get storage adapter based on platform
 * This will be injected by the UI layer (screens/components)
 */
let storageAdapter: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter): void {
  storageAdapter = adapter;
}

/**
 * Create localStorage adapter for web
 */
function createLocalStorageAdapter(): StorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      if (typeof window === 'undefined') return null;
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.error('[Storage] Error getting item from localStorage:', error);
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.error('[Storage] Error setting item in localStorage:', error);
      }
    },
    async removeItem(key: string): Promise<void> {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.error('[Storage] Error removing item from localStorage:', error);
      }
    },
    async getAllKeys(): Promise<string[]> {
      if (typeof window === 'undefined') return [];
      try {
        return Object.keys(window.localStorage);
      } catch (error) {
        console.error('[Storage] Error getting all keys from localStorage:', error);
        return [];
      }
    },
    async multiRemove(keys: string[]): Promise<void> {
      if (typeof window === 'undefined') return;
      try {
        keys.forEach(key => window.localStorage.removeItem(key));
      } catch (error) {
        console.error('[Storage] Error removing multiple items from localStorage:', error);
      }
    },
  };
}

/**
 * Create AsyncStorage adapter for native
 */
async function createAsyncStorageAdapter(): Promise<StorageAdapter> {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    return {
      async getItem(key: string): Promise<string | null> {
        return await AsyncStorage.default.getItem(key);
      },
      async setItem(key: string, value: string): Promise<void> {
        await AsyncStorage.default.setItem(key, value);
      },
      async removeItem(key: string): Promise<void> {
        await AsyncStorage.default.removeItem(key);
      },
      async getAllKeys(): Promise<string[]> {
        return [...(await AsyncStorage.default.getAllKeys())];
      },
      async multiRemove(keys: string[]): Promise<void> {
        await AsyncStorage.default.multiRemove(keys);
      },
    };
  } catch (error) {
    console.error('[Storage] Error creating AsyncStorage adapter:', error);
    return createMemoryStorage();
  }
}

export function getStorageAdapter(): StorageAdapter {
  if (!storageAdapter) {
    // Auto-initialize based on platform
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Web platform - use localStorage
      console.log('[Storage] 🌐 Initializing localStorage adapter for web');
      console.log('[Storage] localStorage available:', typeof window.localStorage !== 'undefined');
      storageAdapter = createLocalStorageAdapter();
      
      // Test that it works
      try {
        const testKey = '__storage_test__';
        storageAdapter.setItem(testKey, 'test').then(() => {
          storageAdapter!.getItem(testKey).then(value => {
            console.log('[Storage] ✅ Storage test successful, value:', value);
            storageAdapter!.removeItem(testKey);
          });
        });
      } catch (error) {
        console.error('[Storage] ❌ Storage test failed:', error);
      }
    } else {
      // Native platform - try to use AsyncStorage, fallback to memory
      console.log('[Storage] 📱 Initializing AsyncStorage adapter for native');
      // For native, we'll create it lazily when needed
      // For now, use memory storage and let it be replaced when AsyncStorage loads
      storageAdapter = createMemoryStorage();
      
      // Try to load AsyncStorage in the background
      createAsyncStorageAdapter().then(adapter => {
        console.log('[Storage] ✅ AsyncStorage adapter loaded, replacing memory storage');
        storageAdapter = adapter;
      }).catch(error => {
        console.warn('[Storage] ⚠️ Failed to load AsyncStorage, using memory storage:', error);
      });
    }
  }
  return storageAdapter;
}

/**
 * In-memory storage fallback
 */
function createMemoryStorage(): StorageAdapter {
  const storage: Map<string, string> = new Map();
  
  return {
    async getItem(key: string): Promise<string | null> {
      return storage.get(key) || null;
    },
    async setItem(key: string, value: string): Promise<void> {
      storage.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      storage.delete(key);
    },
    async getAllKeys(): Promise<string[]> {
      return Array.from(storage.keys());
    },
    async multiRemove(keys: string[]): Promise<void> {
      keys.forEach(key => storage.delete(key));
    },
  };
}

