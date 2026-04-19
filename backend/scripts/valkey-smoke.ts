/**
 * Quick check that Valkey/Redis is reachable with current env.
 *
 * Usage (PowerShell), from directory `backend`:
 *   npm run valkey:smoke
 *
 * Requires `VALKEY_*` in `.env` or environment; Valkey must listen on host:port from config.
 */
import { env } from '../src/config/env';
import { cacheDel, cacheGet, cacheSet } from '../src/cache';
import { closeValkey } from '../src/cache/valkeyClient';

const OPERATION_TIMEOUT_MS = 15_000;

function withTimeout<T>(label: string, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} exceeded ${OPERATION_TIMEOUT_MS}ms — is Valkey running? Check VALKEY_HOST/VALKEY_URL, Docker Desktop, firewall, ElastiCache SG.`,
        ),
      );
    }, OPERATION_TIMEOUT_MS);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function main(): Promise<void> {
  if (!env.valkey.enabled) {
    console.error(
      '[valkey-smoke] VALKEY_ENABLED is not true. Set in backend/.env: VALKEY_ENABLED=true and VALKEY_HOST=127.0.0.1',
    );
    process.exitCode = 1;
    return;
  }
  if (!env.valkey.url && !env.valkey.host) {
    console.error('[valkey-smoke] Set VALKEY_URL or VALKEY_HOST.');
    process.exitCode = 1;
    return;
  }

  const logicalKey = 'smoke:test';
  const ttlSec = 60;

  console.log('[valkey-smoke] prefix=%s logicalKey=%s', env.valkey.keyPrefix, logicalKey);
  console.log('[valkey-smoke] actual key in server: %s%s', env.valkey.keyPrefix, logicalKey);

  try {
    await withTimeout('SET', cacheSet(logicalKey, `ok:${Date.now()}`, ttlSec));
    const read = await withTimeout('GET', cacheGet(logicalKey));

    if (read === null) {
      console.error('[valkey-smoke] READ failed (null). Is Valkey running? TLS/network correct?');
      process.exitCode = 1;
      await closeValkey().catch(() => undefined);
      return;
    }

    console.log('[valkey-smoke] READ ok:', read);
    await withTimeout('DEL', cacheDel(logicalKey));
    console.log('[valkey-smoke] done.');
  } catch (e) {
    console.error('[valkey-smoke]', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    await closeValkey().catch(() => undefined);
  }
}

void main();
