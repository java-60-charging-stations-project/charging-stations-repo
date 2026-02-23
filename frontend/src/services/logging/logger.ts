import { config } from '@/config/env'

const LOG_LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40
};

type LogLevel = keyof typeof LOG_LEVELS;

type LogHandler = (message: string, ...others: unknown[]) => void;

const DEFAULT_LEVEL: LogLevel = "info";
const MAIN_LOGGER_NAME: string = "app";

const LOG_HANDLERS = {
    debug: (...args) => console.log(...args),
    info:  (...args) => console.log(...args),
    warn:  (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
} satisfies Record<LogLevel, LogHandler>;

function getLogLevel(value: string | undefined): LogLevel {
    const level = DEFAULT_LEVEL;
    if (value == undefined) {
        console.log(`No log level provided. Falling back to defaults: "${level}"`);
        return level;
    }
    const normalized: string = value.toLowerCase();
    if (Object.keys(LOG_LEVELS).includes(normalized)) {
        console.log(`Log level set to "${normalized}"`)
        return (normalized as LogLevel);
    }
    console.warn(`Invalid log level value provided: "${value}". Falling back to defaults: "${level}"`);
    return level;
}

class Logger {
    private readonly logLevel: LogLevel;
    private readonly name: string;
    
    constructor(name: string, logLevel: LogLevel) {
        this.logLevel = logLevel;
        this.name = name;
    }
    
    private formatMessage(level: LogLevel, message: string): string {
        return `[${this.name}] [${level.toUpperCase()}] ${message}`;
    }

    private log(level: LogLevel, message: string, ...others: unknown[]) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.logLevel]) {
            return;
        }
        const handler = LOG_HANDLERS[level];
        const formatted = this.formatMessage(level, message);
        
        handler(formatted, ...others);
    }

    public getName(): string {
        return this.name;
    }

    public getLogLevel(): LogLevel {
        return this.logLevel;
    }

    public debug(message: string, ...others: unknown[]) {
        this.log('debug', message, ...others);
    }

    public info(message: string, ...others: unknown[]) {
        this.log('info', message, ...others);
    }

    public warn(message: string, ...others: unknown[]) {
        this.log('info', message, ...others);
    }

    public error(message: string, ...others: unknown[]) {
        this.log('error', message, ...others);
    }
}

const LOG_LEVEL = getLogLevel(config.logLevel);
const appLogger = new Logger(MAIN_LOGGER_NAME, LOG_LEVEL);

const LOGGER_MAP: Map<string, Logger> = new Map<string, Logger>();

LOGGER_MAP.set(appLogger.getName(), appLogger);

export function getLogger(name?: string): Logger {
    if (!name) {
        return appLogger;
    }
    if (!LOGGER_MAP.has(name)) {
        const logger = new Logger(name, LOG_LEVEL);
        LOGGER_MAP.set(name, logger);
    }
    return LOGGER_MAP.get(name)!;
}