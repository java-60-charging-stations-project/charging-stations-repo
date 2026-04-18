import Redis, { type RedisOptions } from 'ioredis';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('valkey');

let client: Redis | undefined;
let shutdown = false;
let warnedMissingConfig = false;

function buildRedis(): Redis {
  const v = env.valkey;
  const baseOptions: RedisOptions = {
    lazyConnect: true,
    connectTimeout: v.connectTimeoutMs,
    maxRetriesPerRequest: null,
    db: v.db,
    keyPrefix: v.keyPrefix,
  };

  if (v.url) {
    return new Redis(v.url, baseOptions);
  }

  if (!v.host) {
    throw new Error('VALKEY_HOST is required when VALKEY_URL is not set');
  }

  return new Redis({
    ...baseOptions,
    host: v.host,
    port: v.port,
    ...(v.username ? { username: v.username } : {}),
    ...(v.password !== undefined ? { password: v.password } : {}),
    ...(v.tls
      ? { tls: { rejectUnauthorized: v.tlsRejectUnauthorized } }
      : {}),
  });
}

/**
 * Lazily creates a Redis-protocol client (works with Valkey).
 * Returns `undefined` when caching is disabled or misconfigured.
 */
export function getValkey(): Redis | undefined {
  if (!env.valkey.enabled) return undefined;
  if (!env.valkey.url && !env.valkey.host) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      logger.warn(
        'VALKEY_ENABLED is true but neither VALKEY_URL nor VALKEY_HOST is set; Valkey is not used',
      );
    }
    return undefined;
  }
  if (shutdown) return undefined;
  if (!client) {
    client = buildRedis();
    client.on('error', (err) => {
      logger.error('Valkey client error', { message: err.message });
    });
  }
  return client;
}

/** Closes the Valkey connection (call on process shutdown). */
export async function closeValkey(): Promise<void> {
  shutdown = true;
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect(false);
  } finally {
    client = undefined;
  }
}
