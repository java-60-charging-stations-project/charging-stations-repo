import { getValkey } from './valkeyClient';

/**
 * String value helpers. Logical keys only — `VALKEY_KEY_PREFIX` is applied by the Valkey client.
 */

export async function cacheGet(key: string): Promise<string | null> {
  const r = getValkey();
  if (!r) return null;
  const value = await r.get(key);
  return value;
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const r = getValkey();
  if (!r) return;
  if (ttlSeconds !== undefined && ttlSeconds > 0) {
    await r.set(key, value, 'EX', ttlSeconds);
    return;
  }
  await r.set(key, value);
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const r = getValkey();
  if (!r || keys.length === 0) return;
  await r.del(...keys);
}

export async function cacheGetJson<T>(key: string): Promise<T | undefined> {
  const raw = await cacheGet(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}
