import { useCallback, useState, type FC } from "react";
import ToggleSwitch from "./ToggleSwitch";
import type { LogRecord } from "@/types/logs";

type LogEntryProps = {
    logRecord: LogRecord;
    onResolve: () => void;
    isResolving: boolean;
};

const DetailLine = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between gap-3 py-0.5">
        <span className="shrink-0 text-neutral-500">{label}</span>
        <span className="min-w-0 break-all text-right text-neutral-900">{value}</span>
    </div>
);

const formatTimestamp = (isoTimestamp?: string): string => {
    if (!isoTimestamp) return "-";
    const parsedDate = new Date(isoTimestamp);
    if (Number.isNaN(parsedDate.getTime())) return isoTimestamp;

    return parsedDate.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const LogEntry: FC<LogEntryProps> = ({ logRecord, onResolve, isResolving }) => {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const {
        log_id,
        message,
        service,
        source_service = "",
        event,
        resolver_id,
        resolve_time,
        timestamp,
    } = logRecord;
    const isResolved: boolean = !!resolver_id;
    const source = (source_service === "") ? service : source_service;
    const toggleDetails = useCallback(() => setDetailsOpen((prevValue) => !prevValue), []);

    const formattedTimestamp = formatTimestamp(timestamp);

    const headerTextClass = isResolved ? "font-normal" : "font-bold";
    const containerClass = isResolved
        ? "w-full rounded-md border border-green-200 bg-green-50 px-3 py-2"
        : "w-full rounded-md border border-red-200 bg-red-50 px-3 py-2";

    return (
        <div className={containerClass}>
            <div className={`flex w-full px-2 items-center gap-3 ${headerTextClass}`}>
                <ToggleSwitch
                    value={isResolved}
                    disabled={isResolving && !isResolved}
                    hint={isResolved ? "Resolved" : "Unresolved"}
                    onChange={(checked: boolean) => checked && onResolve()}
                />
                <span className="shrink-0 whitespace-nowrap text-sm text-neutral-700">{formattedTimestamp}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-900" title={message}>{message}</span>
                <button
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-neutral-300 bg-neutral-50 text-base leading-none text-neutral-700 hover:bg-neutral-100"
                    onClick={toggleDetails}
                    aria-label={detailsOpen ? "Hide details" : "Show details"}
                >
                    <span>{detailsOpen ? "-" : "+"}</span>
                </button>
            </div>
            {detailsOpen && (
                <div className="mt-2 rounded border border-neutral-200 bg-white/90 p-2 text-sm">
                    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                    <DetailLine label="Log entry ID" value={log_id} />
                    <DetailLine label="Source" value={source} />
                    <DetailLine label="Event" value={event} />
                    <DetailLine label="Resolved by" value={resolver_id ?? "-"} />
                    <DetailLine label="Happened at" value={formattedTimestamp} />
                    <DetailLine label="Resolved at" value={formatTimestamp(resolve_time)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogEntry;