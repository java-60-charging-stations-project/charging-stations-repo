import { useCallback, useState, type FC } from "react";
import ToggleSwitch from "./ToggleSwitch";
import type { LogRecord } from "@/types/logs";

type LogEntryProps = {
    logRecord: LogRecord;
};

const DetailLine = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between gap-3 py-0.5">
        <span className="shrink-0 text-neutral-500">{label}</span>
        <span className="min-w-0 break-all text-right text-neutral-900">{value}</span>
    </div>
);

const LogEntry: FC<LogEntryProps> = ({ logRecord }) => {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const {
        log_id,
        message,
        service,
        source_service = "",
        event,
        resolver_id="-",
        resolve_time ="-",
        timestamp,
    } = logRecord;
    const isResolved: boolean = !!resolver_id;
    const source = (source_service === "") ? service : source_service;
    const toggleDetails = useCallback(() => setDetailsOpen((prevValue) => !prevValue), []);
    
    const containerClass = `w-max flex flex-row items-center gap-2 p-2 rounded${isResolved ? 'bg-green-50' : 'bg-red-50'}`;
    const textClass = isResolved? "font-normal text-base" : "font-bold text-[20px]";
    return (
        <div  className={containerClass}>
            <ToggleSwitch
                value={isResolved}
                disabled={!isResolved}
                hint={isResolved ? "Resolved" : "Unresolved"}
                onChange={()=>{}}
            />
            <span className={textClass}>{timestamp}</span>
            <span className={textClass}>{source}</span>
            <button
                className="flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-neutral-50 text-base leading-none text-neutral-700 hover:bg-neutral-100"
                onClick={toggleDetails}
            >
                <span>{detailsOpen? "-": "+"}</span>
            </button>
            { detailsOpen && (
                <div className="mt-2 space-y-0.5 rounded border border-dashed border-neutral-200 bg-neutral-50/80 px-2 py-1.5">
                    <DetailLine label="Log entry ID" value={log_id} />
                    <DetailLine label="Message" value={message} />
                    <DetailLine label="Event" value={event} />
                    <DetailLine label="Resolved by" value={resolve_time} />
                    <DetailLine label="Happened at" value={timestamp} />
                    <DetailLine label="Resolved at" value={timestamp} />
                </div>
            )}
        </div>
    );
};

export default LogEntry;