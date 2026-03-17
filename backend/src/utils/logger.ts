import { env } from "../config/env";
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = typeof LOG_LEVELS[number];

const levels: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function parseLogLevel(value: string | undefined): Level {
  if (LOG_LEVELS.includes(value as Level)) {
    return value as Level;
  }
  return 'info';
}

export function createLogger(scope: string, minLevel: Level = parseLogLevel(env.logLevel)) {
  const min = levels[minLevel] ?? levels.info;

  function should(level: Level) {
    return (levels[level] ?? 999) >= min;
  }

  function fmt(level: Level, message: string, meta?: unknown) {
    const base = { ts: new Date().toISOString(), level, scope, message };
    return meta === undefined ? JSON.stringify(base) : JSON.stringify({ ...base, meta });
  }

  return {
    debug: (message: string, meta?: unknown) => should('debug') && console.log(fmt('debug', message, meta)),
    info: (message: string, meta?: unknown) => should('info') && console.log(fmt('info', message, meta)),
    warn: (message: string, meta?: unknown) => should('warn') && console.warn(fmt('warn', message, meta)),
    error: (message: string, meta?: unknown) => should('error') && console.error(fmt('error', message, meta))
  };
}
