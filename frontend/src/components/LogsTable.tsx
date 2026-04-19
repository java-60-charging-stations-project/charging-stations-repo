import { useGetLogsQuery, useResolveLogMutation } from "@/store/apiSlice";
import Paginator from "./Paginator";
import { useState, type FC } from "react";
import LogEntry from "./LogEntry";
import type { LogRecord, LogResolveRequest } from "@/types/logs";
import { getLogger } from "@/services/logging";
import { toast } from "react-toastify";
import { usePaginationParams } from "@/hooks/usePaginationParams";
import type { UserRole } from "@/types";

const logger = getLogger("logs");

function extractErrorMessage(error: unknown): string {
    if (!error) return 'Unknown error';

    if (typeof error === 'object' && error !== null) {
        const err = error as { data?: { message?: string }; message?: string };
        if (err.data?.message) {
        return err.data.message;
        }
        if (err.message) {
        return err.message;
        }
    }

    return String(error);
};

type LogsTableProps = {
    pollingIntervalMs?: number;
    role: UserRole;
};

const LogsTable: FC<LogsTableProps> = ({ role, pollingIntervalMs = 10_000 }) => {
    const { page, pageSize, setPage } = usePaginationParams();
    const [resolveId, setResolveId] = useState<string | null>(null);
    const [onResolveMutation, { isLoading: isResolving }] = useResolveLogMutation();
    const {
        data: logsResponse,
        isError: isLoadError,
        error: loadError,
    } = useGetLogsQuery({ role, page, pageSize }, {
        pollingInterval: pollingIntervalMs,
        skipPollingIfUnfocused: true,
        refetchOnReconnect: true,
    });

    if (isLoadError || !logsResponse) {
        return <p className="text-red-600 font-bold border-2 border-yellow-500 p-2 rounded mb-2">
                    Error: {loadError?.message ?? "No data received"}
                </p>
    }
    
    const { data: logs, meta } = logsResponse;
    
    const resolveLogEntry = async (log_id: string) => {
        try {
            logger.debug(`.LogsTable Resolving log_id=${log_id}`);
            setResolveId(log_id);
            const request: LogResolveRequest = { role, log_id, resolve_time: new Date().toISOString() };
            const response = await onResolveMutation(request).unwrap();
            logger.debug(`.LogsTable Log entry log_id=${log_id} resolved with the response: `, response);
        }
        catch (err) {
            logger.error(`.LogsTable Error resolving log_id=${log_id}`, err);
            throw err;
        }
        finally {
            setResolveId(null);
        }
    }

    const onResolve = (log_id: string) => {
        toast.promise(
            resolveLogEntry(log_id),
            {
                pending: 'Resolving log record',
                success: 'Log record resolved',
                error: {
                    render({ data }) {
                        return `Error resolving log ${log_id}: ${extractErrorMessage(data)}`;
                    },
                }
            },
            {
                position: "bottom-right",
            }
        );
    };

    const buildLogEntry = (logRecord: LogRecord): React.ReactNode => {
        return (
            <LogEntry
                key={ logRecord.log_id }
                logRecord={ logRecord }
                onResolve={ () => onResolve(logRecord.log_id) }
                isResolving={ isResolving && resolveId === logRecord.log_id }
            />
        );
    };

    return (
        <div className="w-full space-y-2">
            { logs.map((log: LogRecord)=> buildLogEntry(log))}
            <Paginator
                totalPages={meta?.totalPages ?? 1}
                activePage={page}
                onPageChange={(_page: number) => setPage(_page) } />
        </div>
    );
};

export default LogsTable;