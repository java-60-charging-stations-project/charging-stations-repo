import type { UserRole } from ".";

export type LogAudience = 'support' | 'admin';

export type LogRecord = {
    log_id: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR";
    message: string;
    service: string;
    source_service?: string;
    event: string;
    audience: LogAudience;
    caller_id: string;
    resolver_id?: string;
    request_id?: string;
    timestamp: string;
    resolve_time?: string;
};

export type LogRequestFilterParams = {
    dateFrom?: string;
    dateTo?: string;
    resolved?: boolean;
};

export type LogRequest = {
    role: UserRole;
    page: number;
    pageSize: number;
    filterParams?: LogRequestFilterParams;
};

export type LogResolveRequest = {
    role: UserRole;
    resolve_time: string;
    log_id: string;
};