import { useAuth } from "@/hooks/useAuth";
import { useGetLogsQuery, useResolveLogMutation } from "@/store/apiSlice";
import Paginator from "./Paginator";
import { useState, type FC } from "react";
import LogEntry from "./LogEntry";
import type { LogRecord, LogResolveRequest } from "@/types/logs";
import { getLogger } from "@/services/logging";
import { toast } from "react-toastify";
import { usePaginationParams } from "@/hooks/usePaginationParams";

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
}

type LogsTableProps = {
    pollingIntervalMs?: number;
};

const LogsTable: FC<LogsTableProps> = ({pollingIntervalMs = 10_000}) => {
    const { userRole } = useAuth();
    const role = userRole!;
    const { page, pageSize, setPage } = usePaginationParams();
    const [resolveId, setResolveId] = useState<string | null>(null);
    const [onResolveMutation, { isLoading: isResolving }] = useResolveLogMutation();
    const {
        data: logsResponse,
        isError: isLoadError,
        error: loadError,
    } = useGetLogsQuery({ role, page, pageSize}, {
        pollingInterval: pollingIntervalMs,
        skipPollingIfUnfocused: true,
        refetchOnReconnect: true,
    });
    const logs = logsResponse?.data;
    const meta = logsResponse?.meta;

    const resolveLogEntry = async (log_id: string) => {
        try {
            setResolveId(log_id);
            const request: LogResolveRequest = { role, log_id, resolve_time: new Date().toISOString() };
            const response = await onResolveMutation(request).unwrap();
            logger.debug(`Log entry log_id=${log_id} resolved with the response: `, response);
        }
        catch (err) {
            logger.error(`Error resolving log_id=${log_id}`, err);
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

    if (isLoadError) {
        return <p className="text-red-600 font-bold border-2 border-yellow-500 p-2 rounded mb-2">
                    Error: {loadError.message}
                </p>
    }
    return (
        <>
            {
                logs && logs.map((logRec: LogRecord) => (
                    <LogEntry
                        key={logRec.log_id}
                        logRecord={logRec}
                        onResolve={() => onResolve(logRec.log_id)}
                        isResolving={ isResolving && resolveId === logRec.log_id }
                    />
                )
            )}
            <Paginator
                totalPages={meta?.totalPages ?? 1}
                activePage={page}
                onPageChange={(_page: number) => setPage(_page) } />
        </>
    );
};

export default LogsTable;