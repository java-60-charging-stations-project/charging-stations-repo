import { useCallback, useEffect, useState, type FC } from "react";
import type { StationPort, StationState } from "@/types/stations";
import StationPortCard from "./StationPortCard";
import { getLogger } from "@/services/logging/logger";
import SimpleButton from "../SimpleButton";
import { config } from "@/config/env";

const logger = getLogger("PortsView");

const LABEL = "w-1/3 shrink-0 pr-2 text-right";

export interface PortsViewProps {
    stationId: string;
    stationState: StationState;
    enabled: boolean;
    fetchPortsFn?: (stationId: string) => Promise<StationPort[]>;
    deletePortFn?: (stationId: string, portId: string) => Promise<void>;
    /** When true, loads ports once when the component mounts. */
    fetchOnMount?: boolean;
    /** When true, shows the manual fetch control on the right side of the header row. */
    showFetchButton?: boolean;
}

const PortsView: FC<PortsViewProps> = ({
    stationId,
    stationState,
    enabled,
    fetchPortsFn,
    fetchOnMount = false,
    showFetchButton = true,
}) => {
    const [ports, setPorts] = useState<StationPort[]>([]);
    const [isLoading, setIsLoading] = useState(fetchOnMount);
    const [error, setError] = useState<string | null>(null);

    const fetchPorts = useCallback(async (): Promise<void> => {
        if (!fetchPortsFn) return;
        setIsLoading(true);
        setError(null);
        try {
            const nextPorts = await fetchPortsFn(stationId);
            setPorts(nextPorts);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, [fetchPortsFn, stationId]);

    useEffect(() => {
        if (!fetchOnMount || !fetchPortsFn) return;
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            setError(null);
            try {
                const nextPorts = await fetchPortsFn(stationId);
                if (!cancelled) setPorts(nextPorts);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err.message : String(err),
                    );
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [fetchOnMount, fetchPortsFn, stationId]);

    const canDeletePort: boolean = enabled && stationState === "OUT_OF_SERVICE";
    const maxPorts = config.maxPortsPerStation;
    const receivedCount = ports.length;
    const countDisplay =
        isLoading && receivedCount === 0 ? "…" : String(receivedCount);

    return (
        <div className="flex flex-col gap-2 text-xs w-full">
            <div className="mb-1 flex items-center flex-wrap">
                <label className={LABEL}>Ports count</label>
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                    <span className="text-neutral-800 tabular-nums">
                        {countDisplay} of {maxPorts}
                    </span>
                    {showFetchButton && (
                        <SimpleButton
                            caption="Fetch ports"
                            handleClick={() => {
                                void fetchPorts();
                            }}
                            isLoading={isLoading}
                            isDisabled={!enabled || !fetchPortsFn}
                            size="xs"
                            color="tertiary"
                        />
                    )}
                </div>
                {error && (
                    <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">
                        {error}
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-2">
                {ports.map((port) => (
                    <StationPortCard
                        key={port.portId}
                        port={port}
                        canDelete={canDeletePort}
                        onDelete={() => {
                            logger.debug(`Deleting port ${port.portId}`);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default PortsView;
