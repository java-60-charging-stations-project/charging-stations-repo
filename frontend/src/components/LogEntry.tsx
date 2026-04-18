import { useCallback, useState, type FC } from "react";
import ToggleSwitch from "./ToggleSwitch";

type LogEntryProps = {
    logRecord: LogRecord;
}

const LogEntry: FC<LogEntryProps> = ({ logRecord }) => {
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
    } = LogEntry;
    const isResolved: boolean = !!resolver_id;
    const source = (source_service === "") ? service : source_service;
    const toggleDetails = useCallback(() => setDetailsOpen((prevValue) => !prevValue), []);
    return (
        <div className="w-max flex-row">
            <ToggleSwitch
                value={isResolved}
                disabled={!isResolved}
                hint={isResolved ? "Resolved" : "Unresolved"}
                onChange={()=>{}}
            />
            <span>{timestamp}</span>
            <span>{source}</span>
        </div>
    );
};

export default LogEntry;