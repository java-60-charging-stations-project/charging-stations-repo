"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const levels = { debug: 10, info: 20, warn: 30, error: 40 };
function createLogger(scope, minLevel = 'info') {
    const min = levels[minLevel] ?? levels.info;
    function should(level) {
        return (levels[level] ?? 999) >= min;
    }
    function fmt(level, message, meta) {
        const base = { ts: new Date().toISOString(), level, scope, message };
        return meta === undefined ? JSON.stringify(base) : JSON.stringify({ ...base, meta });
    }
    return {
        debug: (message, meta) => should('debug') && console.log(fmt('debug', message, meta)),
        info: (message, meta) => should('info') && console.log(fmt('info', message, meta)),
        warn: (message, meta) => should('warn') && console.warn(fmt('warn', message, meta)),
        error: (message, meta) => should('error') && console.error(fmt('error', message, meta))
    };
}
