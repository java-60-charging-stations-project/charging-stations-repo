/**
 * Quick check that Valkey/Redis is reachable with current env.
 * Usage (PowerShell):
 *   $env:VALKEY_ENABLED='true'; $env:VALKEY_HOST='127.0.0.1'; npx ts-node --transpile-only scripts/valkey-smoke.ts
 *
 * Requires a running Valkey or Redis on VALKEY_HOST:VALKEY_PORT (default 6379).
 */
import { env } from '../src/config/env';
import { cacheDel, cacheGet, cacheSet } from '../src/cache';
import { closeValkey } from '../src/cache/valkeyClient';

async function main(): Promise<void> {
  if (!env.valkey.enabled) {
    console.error(
      '[valkey-smoke] VALKEY_ENABLED is not true. Example: VALKEY_ENABLED=true VALKEY_HOST=127.0.0.1',
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

  await cacheSet(logicalKey, `ok:${Date.now()}`, ttlSec);
  const read = await cacheGet(logicalKey);

  if (read === null) {
    console.error('[valkey-smoke] READ failed (null). Is Valkey running? Is networking/TLS correct?');
    process.exitCode = 1;
    await closeValkey().catch(() => undefined);
    return;
  }

  console.log('[valkey-smoke] READ ok:', read);
  await cacheDel(logicalKey);
  console.log('[valkey-smoke] done.');
  await closeValkey().catch(() => undefined);
}

void main();
