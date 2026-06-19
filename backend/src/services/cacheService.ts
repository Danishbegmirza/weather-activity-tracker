import { config } from '../config';
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  expiry: number;
  createdAt: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  coalesced: number;
  evictions: number;
}

const DEFAULT_MAX_ENTRIES = 1000;

export class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private inflight: Map<string, Promise<unknown>> = new Map();
  private defaultTtl: number;
  private maxEntries: number;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, coalesced: 0, evictions: 0 };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTtlSeconds?: number, maxEntries?: number) {
    this.defaultTtl = (defaultTtlSeconds ?? config.cache.defaultTtlSeconds) * 1000;
    this.maxEntries = maxEntries ?? DEFAULT_MAX_ENTRIES;
    
    this.startPeriodicCleanup();
    
    logger.info(
      { defaultTtlSeconds: this.defaultTtl / 1000, maxEntries: this.maxEntries },
      'Cache service initialized with LRU eviction'
    );
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      logger.debug({ key }, 'Cache entry expired');
      return null;
    }

    entry.lastAccessed = Date.now();
    this.stats.hits++;
    logger.debug({ key, age: Date.now() - entry.createdAt }, 'Cache hit');
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.evictIfNeeded();
    
    const duration = ttlMs !== undefined ? ttlMs : this.defaultTtl;
    const now = Date.now();
    const expiry = now + duration;

    this.cache.set(key, { value, expiry, createdAt: now, lastAccessed: now });
    this.stats.size = this.cache.size;

    logger.debug({ key, ttlMs: duration, cacheSize: this.stats.size }, 'Cache entry set');
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    if (deleted) {
      logger.debug({ key }, 'Cache entry deleted');
    }
    return deleted;
  }

  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.inflight.clear();
    this.stats.size = 0;
    logger.info({ clearedEntries: previousSize }, 'Cache cleared');
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Helper to execute a function and cache its result, or return the cached version.
   * Implements single-flight/request coalescing to prevent thundering herd:
   * if multiple concurrent requests arrive for the same key, only one fetch runs
   * and the others wait on the same Promise.
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const existingFlight = this.inflight.get(key);
    if (existingFlight) {
      this.stats.coalesced++;
      logger.debug({ key }, 'Request coalesced - joining in-flight fetch');
      return existingFlight as Promise<T>;
    }

    const fetchPromise = (async () => {
      const startTime = Date.now();
      try {
        const value = await fetchFn();
        const fetchDuration = Date.now() - startTime;

        this.set(key, value, ttlMs);

        logger.debug(
          { key, fetchDuration: `${fetchDuration}ms` },
          'Cache miss - fetched and cached'
        );

        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * LRU eviction: remove least recently accessed entries when cache exceeds maxEntries
   */
  private evictIfNeeded(): void {
    if (this.cache.size < this.maxEntries) {
      return;
    }

    const entriesToEvict = Math.max(1, Math.floor(this.maxEntries * 0.1));
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    for (let i = 0; i < entriesToEvict && i < entries.length; i++) {
      const entry = entries[i];
      if (entry) {
        const [key] = entry;
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }

    this.stats.size = this.cache.size;
    logger.debug(
      { evicted: entriesToEvict, remaining: this.stats.size },
      'LRU eviction completed'
    );
  }

  /**
   * Cleanup expired entries (runs periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.stats.size = this.cache.size;

    if (cleaned > 0) {
      logger.info({ cleaned, remaining: this.stats.size }, 'Cache cleanup completed');
    }

    return cleaned;
  }

  /**
   * Start periodic cleanup of expired entries (every 5 minutes)
   */
  private startPeriodicCleanup(): void {
    const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL_MS);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop periodic cleanup (for graceful shutdown)
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export a singleton instance
export const cacheService = new CacheService();
