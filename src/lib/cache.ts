/**
 * Server-Side Response Cache for GenAI API
 *
 * Implements a simple in-memory LRU-like cache to avoid duplicate
 * Gemini model invocations for identical or near-identical inputs.
 * Each cache entry expires after a configurable TTL (time-to-live).
 *
 * In production, replace with Redis or a distributed cache layer.
 */

import * as crypto from "crypto";

/* ------------------------------------------------------------------ */
/*  Cache Configuration                                                */
/* ------------------------------------------------------------------ */

/** Maximum number of entries the cache can hold before evicting oldest. */
const MAX_CACHE_SIZE = 50;

/** Default time-to-live for cache entries in milliseconds (5 minutes). */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Cache Entry Type                                                   */
/* ------------------------------------------------------------------ */

/** A single cached response entry with expiration tracking. */
interface CacheEntry {
  /** The cached parsed response data */
  data: unknown;
  /** Unix timestamp (ms) when this entry was created */
  createdAt: number;
  /** Unix timestamp (ms) when this entry expires */
  expiresAt: number;
  /** Number of times this cache entry has been accessed (hit count) */
  hitCount: number;
}

/* ------------------------------------------------------------------ */
/*  Cache Store                                                        */
/* ------------------------------------------------------------------ */

/** In-memory cache store keyed by a SHA-256 hash of the prompt string. */
const cacheStore = new Map<string, CacheEntry>();

/* ------------------------------------------------------------------ */
/*  Helper Functions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Generates a deterministic SHA-256 hash key from a prompt string.
 * This ensures identical prompts always map to the same cache entry
 * regardless of object reference or serialization order.
 *
 * @param prompt — The full Gemini prompt string to hash.
 * @returns A hex-encoded SHA-256 hash string.
 */
function generateCacheKey(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

function evictOldestEntry(): void {
  if (cacheStore.size <= MAX_CACHE_SIZE) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  cacheStore.forEach((entry, key) => {
    if (entry.createdAt < oldestTime) {
      oldestTime = entry.createdAt;
      oldestKey = key;
    }
  });

  if (oldestKey !== null) {
    cacheStore.delete(oldestKey);
  }
}

/**
 * Removes all expired entries from the cache.
 * Called lazily before cache reads to keep the store clean.
 */
function purgeExpiredEntries(): void {
  const now = Date.now();
  cacheStore.forEach((entry, key) => {
    if (now > entry.expiresAt) {
      cacheStore.delete(key);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Retrieves a cached response for the given prompt, if available and not expired.
 *
 * @param prompt — The Gemini prompt string used as the cache key.
 * @returns The cached data if found and valid, or null if cache miss.
 */
export function getCachedResponse(prompt: string): unknown | null {
  purgeExpiredEntries();

  const key = generateCacheKey(prompt);
  const entry = cacheStore.get(key);

  if (!entry) return null;

  // Double-check expiration after purge (race condition safety)
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  entry.hitCount++;
  return entry.data;
}

/**
 * Stores a Gemini response in the cache, keyed by the prompt string.
 *
 * @param prompt — The Gemini prompt string used as the cache key.
 * @param data — The parsed AI response data to cache.
 * @param ttlMs — Optional TTL override in milliseconds (defaults to 5 minutes).
 */
export function setCachedResponse(
  prompt: string,
  data: unknown,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  const key = generateCacheKey(prompt);
  const now = Date.now();

  cacheStore.set(key, {
    data,
    createdAt: now,
    expiresAt: now + ttlMs,
    hitCount: 0,
  });

  // Evict oldest entry if we exceed the maximum cache size
  evictOldestEntry();
}

/**
 * Returns the current number of entries in the cache.
 * Useful for monitoring and debugging.
 *
 * @returns The count of active (possibly expired) cache entries.
 */
export function getCacheSize(): number {
  return cacheStore.size;
}

/**
 * Clears the entire response cache.
 * Typically used during testing or emergency cache invalidation.
 */
export function clearCache(): void {
  cacheStore.clear();
}
