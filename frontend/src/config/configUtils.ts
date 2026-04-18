
export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError'; 
    }
};

export class EnvConfigurationError extends ConfigurationError {
    constructor(message: string) {
        super(message);
        this.name = 'EnvConfigurationError'; 
    }
};

function extractEnvValue(parameterName: string): string | undefined {
    const value = import.meta.env[parameterName];
    if (value === undefined) return undefined;

    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
};

export function getStringParameter(parameterName: string, fallback?: string): string | undefined {
    const envValue = extractEnvValue(parameterName);
    
    return envValue ?? fallback;
};

export function requireStringParameter(parameterName: string, fallback?: string): string {
    const envValue = extractEnvValue(parameterName);
    
    if (envValue === undefined) {
        if (fallback !== undefined) {
            return fallback;
        }
        throw new EnvConfigurationError(`Missing required env variable: ${parameterName}`);
    }

    return envValue;
};

export function requireNumberParameter( parameterName: string, fallback?: number): number {
    const envValue = extractEnvValue(parameterName);

    if (envValue === undefined) {
        if (fallback !== undefined) {
            return fallback;
        }
        throw new EnvConfigurationError(`Missing required env variable: ${parameterName}`);
    }

    const parsedValue = Number(envValue);

    if (!Number.isFinite(parsedValue)) {
        throw new EnvConfigurationError(`Invalid number for env variable ${parameterName}: "${envValue}"`);
    }

    return parsedValue;
};

export function requireBooleanParameter(parameterName: string, fallback?: boolean): boolean {
    const envValue = extractEnvValue(parameterName);

    if (envValue === undefined) {
        if (fallback !== undefined) return fallback;
        throw new EnvConfigurationError(`Missing required env variable: ${parameterName}`);
    }

    const normalized = envValue.toLowerCase();

    if (normalized === "true" ||
        normalized === "1" ||
        normalized === "y" ||
        normalized === "yes"
    ) return true;
    if (normalized === "false" ||
        normalized === "0" ||
        normalized === "n" ||
        normalized === "no"
    ) return false;

    throw new EnvConfigurationError(
        `Invalid boolean for env variable ${parameterName}: "${envValue}"`
    );
};