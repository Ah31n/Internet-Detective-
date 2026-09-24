/**
 * In-memory stand-in for AsyncStorage used by persistence tests.
 *
 * The backing map lives on globalThis so that a simulated app relaunch
 * (module registry reset) still sees the data written by the previous launch,
 * exactly like device storage would.
 */

const GLOBAL_KEY = '__internet_detective_memory_storage__';

type GlobalWithStorage = typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, string>;
};

function store(): Map<string, string> {
  const scope = globalThis as GlobalWithStorage;
  scope[GLOBAL_KEY] ??= new Map<string, string>();
  return scope[GLOBAL_KEY];
}

export function resetMemoryStorage() {
  store().clear();
}

export function readMemoryStorage(key: string): string | null {
  return store().get(key) ?? null;
}

export function writeMemoryStorage(key: string, value: string) {
  store().set(key, value);
}

export function memoryStorageKeys(): readonly string[] {
  return [...store().keys()];
}

const memoryAsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store().get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store().set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store().delete(key);
  },
  async clear(): Promise<void> {
    store().clear();
  },
  async getAllKeys(): Promise<readonly string[]> {
    return [...store().keys()];
  },
};

export default memoryAsyncStorage;
