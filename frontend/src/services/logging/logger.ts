import {config} from '../config/env'

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
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
} as Record<LogLevel, LogHandler>;

function getLogLevel(value: string | undefined): LogLevel {
    const level = DEFAULT_LEVEL;
    if (value == undefined) {
        console.log('Level value is undefined. Attach default log level: ', level)
        return level;
    }
    const normalized: string = value.toLowerCase();
    if (normalized in LOG_LEVELS) {
        return (normalized as LogLevel);
    }
    console.warn('Wrong log level value received: ', value, 'Attach default log level: ', level)
    return level;
}

class Logger {
    private logLevel: LogLevel;
    private name: string;
    
    constructor(name: string, logLevel: LogLevel) {
        this.logLevel = logLevel;
        this.name = name;
    }
    
    private formatMessage(message: string): string {
        const elements = [];
        elements.push(this.name);
        elements.push(this.logLevel.toString().toUpperCase());
        elements.push(message);

        return elements.join(' ')
    }

    private log(level: LogLevel, message: string, ...others: unknown[]) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.logLevel]) {
            return;
        }
        const handler = LOG_HANDLERS[level];
        const formatted = this.formatMessage(message);
        
        handler(formatted, ...others);
    }

    public getName(): string {
        return this.name;
    }

    public getLogLevel(): LogLevel {
        return this.logLevel;
    }

    public debug(message: string, ...others: unknown[]) {
        this.log('debug', message, others);
    }

    public info(message: string, ...others: unknown[]) {
        this.log('info', message, others);
    }

    public warn(message: string, ...others: unknown[]) {
        this.log('info', message, others);
    }

    public error(message: string, ...others: unknown[]) {
        this.log('error', message, others);
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