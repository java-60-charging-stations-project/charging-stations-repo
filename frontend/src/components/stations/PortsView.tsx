import { useCallback, useState, type FC } from "react";
import type { StationPort, StationState } from "@/types/stations";
import StationPortCard from "./StationPortCard";
import { getLogger } from "@/services/logging/logger";

const logger = getLogger("PortsView");


export interface PortsViewProps {
    stationId: string;
    stationState: StationState;
    enabled: boolean;
    initialPortsCount: number;
    fetchPortsFn?: (stationId: string) => Promise<StationPort[]>;
    deletePortFn?: (stationId: string, portId: string) => Promise<void>;
};

const PortsView: FC<PortsViewProps> = ({ 
    stationId, stationState, enabled, initialPortsCount, fetchPortsFn
}) => {
    const [ports, setPorts] = useState<StationPort[]>([]);
    const [portsCount, setPortsCount] = useState(initialPortsCount);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const fetchPorts = useCallback(async (): Promise<void> => {
        if (fetchPortsFn && enabled) {
            setIsLoading(true);
            setError(null);
            try {
                const ports = await fetchPortsFn(stationId);
                setPorts(ports);
                setPortsCount(ports.length);
            } catch (error) {
                setError(error as string);
            } finally {
                setIsLoading(false);
            }
        }
    }, [fetchPortsFn, enabled, stationId]);
    const canDeletePort: boolean = enabled && (stationState === "OUT_OF_SERVICE");
    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-neutral-800">Station Ports</h2>
            <div className="flex flex-row justify-between items-center">
                <span className="font-medium text-neutral-800">{`Ports count:${portsCount}`}</span>
                {error && <span className="text-red-500">{error}</span>}
                {isLoading && <span className="text-neutral-500">Loading...</span>}
                <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-neutral-50 text-base leading-none text-neutral-700 hover:bg-neutral-100"
                    onClick={fetchPorts}
                >
                    <span className="sr-only">Fetch ports</span>
                </button>
            </div>
            <div className="flex flex-col gap-2">
                {ports.map((port) => (
                    <StationPortCard
                        key={port.portId}
                        port={port}
                        canDelete={canDeletePort}
                        onDelete={() => {logger.debug(`Deleting port ${port.portId}`)}} />
                ))}
            </div>
        </div>
    );
};

export default PortsView;