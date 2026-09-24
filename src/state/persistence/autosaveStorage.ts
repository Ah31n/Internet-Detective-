import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local-only autosave transport.
 *
 * Responsibilities:
 * - coalesce frequent writes (board drags, viewport changes) into one write;
 * - flush immediately for meaningful progress and app-lifecycle events;
 * - keep a rolling backup of the last readable payload;
 * - quarantine unreadable payloads instead of erasing progress.
 *
 * There is no server, API, authentication, or remote database involved.
 */

export interface AsyncStorageLike {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export type SaveHealthStatus = 'unknown' | 'healthy' | 'recovered' | 'quarantined';

export interface SaveHealthRecord {
  key: string;
  status: SaveHealthStatus;
  detail: string | null;
  quarantineKey: string | null;
  checkedAtEpochMs: number;
}

const BACKUP_SUFFIX = '.backup';
const QUARANTINE_SUFFIX = '.corrupt';

const healthByKey = new Map<string, SaveHealthRecord>();
const healthListeners = new Set<(records: readonly SaveHealthRecord[]) => void>();

export function getSaveHealth(): readonly SaveHealthRecord[] {
  return [...healthByKey.values()];
}

export function subscribeToSaveHealth(
  listener: (records: readonly SaveHealthRecord[]) => void,
): () => void {
  healthListeners.add(listener);
  return () => healthListeners.delete(listener);
}

function reportHealth(record: SaveHealthRecord) {
  healthByKey.set(record.key, record);
  const snapshot = getSaveHealth();
  healthListeners.forEach((listener) => listener(snapshot));
}

interface PendingWrite {
  value: string;
  timer: ReturnType<typeof setTimeout> | null;
  resolvers: (() => void)[];
}

export interface AutosaveStorageOptions {
  /** Trailing debounce window for coalesced writes. */
  debounceMs?: number;
  /** Hard ceiling between the first pending change and a forced write. */
  maxDelayMs?: number;
  backend?: AsyncStorageLike;
  now?: () => number;
}

export interface AutosaveStorage extends AsyncStorageLike {
  /** Writes every pending value immediately (backgrounding, termination). */
  flush: () => Promise<void>;
  /** Number of keys waiting to be written. */
  pendingCount: () => number;
  lastWriteAtEpochMs: () => number | null;
  /** Restores the rolling backup for a key when a payload was quarantined. */
  restoreBackup: (key: string) => Promise<string | null>;
}

function isReadableJson(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

export function createAutosaveStorage(
  options: AutosaveStorageOptions = {},
): AutosaveStorage {
  const backend = options.backend ?? AsyncStorage;
  const debounceMs = options.debounceMs ?? 450;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const now = options.now ?? (() => Date.now());

  const pending = new Map<string, PendingWrite>();
  const firstPendingAt = new Map<string, number>();
  let lastWriteAt: number | null = null;

  const write = async (key: string) => {
    const entry = pending.get(key);
    if (!entry) return;
    pending.delete(key);
    firstPendingAt.delete(key);
    if (entry.timer) clearTimeout(entry.timer);

    try {
      const previous = await backend.getItem(key);
      if (previous && isReadableJson(previous)) {
        await backend.setItem(`${key}${BACKUP_SUFFIX}`, previous);
      }
      await backend.setItem(key, entry.value);
      lastWriteAt = now();
      reportHealth({
        key,
        status: 'healthy',
        detail: null,
        quarantineKey: null,
        checkedAtEpochMs: lastWriteAt,
      });
    } catch (error) {
      reportHealth({
        key,
        status: 'quarantined',
        detail:
          error instanceof Error
            ? `Save failed: ${error.message}`
            : 'Save failed for an unknown reason.',
        quarantineKey: null,
        checkedAtEpochMs: now(),
      });
    } finally {
      entry.resolvers.forEach((resolve) => resolve());
    }
  };

  return {
    async getItem(key) {
      const pendingEntry = pending.get(key);
      if (pendingEntry) return pendingEntry.value;

      let raw: string | null = null;
      try {
        raw = await backend.getItem(key);
      } catch (error) {
        reportHealth({
          key,
          status: 'quarantined',
          detail:
            error instanceof Error
              ? `Save could not be read: ${error.message}`
              : 'Save could not be read.',
          quarantineKey: null,
          checkedAtEpochMs: now(),
        });
        return null;
      }

      if (raw === null) return null;
      if (isReadableJson(raw)) {
        reportHealth({
          key,
          status: 'healthy',
          detail: null,
          quarantineKey: null,
          checkedAtEpochMs: now(),
        });
        return raw;
      }

      // Unreadable payload: quarantine it, never delete it, and try the backup.
      const quarantineKey = `${key}${QUARANTINE_SUFFIX}`;
      try {
        await backend.setItem(quarantineKey, raw);
      } catch {
        // Quarantine is best effort; recovery continues either way.
      }

      let backup: string | null = null;
      try {
        backup = await backend.getItem(`${key}${BACKUP_SUFFIX}`);
      } catch {
        backup = null;
      }

      if (backup && isReadableJson(backup)) {
        reportHealth({
          key,
          status: 'recovered',
          detail:
            'The most recent save could not be read. The previous good save was restored and the damaged copy was kept for recovery.',
          quarantineKey,
          checkedAtEpochMs: now(),
        });
        return backup;
      }

      reportHealth({
        key,
        status: 'quarantined',
        detail:
          'The save could not be read and no earlier backup was available. The damaged copy was kept instead of being erased.',
        quarantineKey,
        checkedAtEpochMs: now(),
      });
      return null;
    },

    setItem(key, value) {
      const existing = pending.get(key);
      if (existing?.timer) clearTimeout(existing.timer);

      const entry: PendingWrite = {
        value,
        timer: null,
        resolvers: existing?.resolvers ?? [],
      };
      pending.set(key, entry);

      const startedAt = firstPendingAt.get(key) ?? now();
      firstPendingAt.set(key, startedAt);
      const elapsed = now() - startedAt;
      const delay = Math.max(0, Math.min(debounceMs, maxDelayMs - elapsed));

      return new Promise<void>((resolve) => {
        entry.resolvers.push(resolve);
        entry.timer = setTimeout(() => {
          void write(key);
        }, delay);
      });
    },

    async removeItem(key) {
      const entry = pending.get(key);
      if (entry?.timer) clearTimeout(entry.timer);
      pending.delete(key);
      firstPendingAt.delete(key);
      await backend.removeItem(key);
    },

    async flush() {
      const keys = [...pending.keys()];
      await Promise.all(keys.map((key) => write(key)));
    },

    pendingCount: () => pending.size,
    lastWriteAtEpochMs: () => lastWriteAt,

    async restoreBackup(key) {
      const backup = await backend.getItem(`${key}${BACKUP_SUFFIX}`);
      if (!backup || !isReadableJson(backup)) return null;
      await backend.setItem(key, backup);
      reportHealth({
        key,
        status: 'recovered',
        detail: 'The previous good save was restored on request.',
        quarantineKey: `${key}${QUARANTINE_SUFFIX}`,
        checkedAtEpochMs: now(),
      });
      return backup;
    },
  };
}

/** Shared transport so every persisted store flushes together. */
export const autosaveStorage = createAutosaveStorage();

export async function flushAutosave(): Promise<void> {
  await autosaveStorage.flush();
}
