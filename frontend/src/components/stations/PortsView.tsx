import { useCallback, useEffect, useState, type FC } from "react";
import type { StationPort, StationState } from "@/types/stations";
import StationPortCard from "./StationPortCard";
import { getLogger } from "@/services/logging/logger";
import { config } from "@/config/env";

const logger = getLogger("PortsView");

interface PortEditState {
    portId: string;
    isUpdating: boolean;
    error?: string | null;
}

export interface PortsViewProps {
    stationId: string;
    stationState: StationState;
    enabled: boolean;
    fetchPortsFn: (stationId: string) => Promise<StationPort[]>;
    deletePortFn?: (stationId: string, portId: string) => Promise<void>;
}

const PortsView: FC<PortsViewProps> = ({
    stationId,
    stationState,
    enabled,
    fetchPortsFn,
    deletePortFn,
}) => {
    const [ports, setPorts] = useState<StationPort[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [editState, setEditState] = useState<PortEditState | null>(null);

    const deletePort = useCallback(async (portId: string) => {
        if (!deletePortFn) return;
        logger.debug(`Deleting port ${portId}`);
        setEditState({ portId, isUpdating: true, error: null });
        try {
            await deletePortFn(stationId, portId);
            logger.debug(`Port ${portId} deleted`);
            setEditState(null);
        } catch (err) {
            setEditState({ portId, isUpdating: false, error: err instanceof Error ? err.message : String(err) });
        }finally {
            setEditState((prev) => prev ? { ...prev, isUpdating: false } : null);
        }
    }, [stationId, deletePortFn]);

    useEffect(() => {
        let cancelled = false;
        async function loadPorts() {
            setError(null);
            try {
                const nextPorts = await fetchPortsFn(stationId);
                if (!cancelled) setPorts(nextPorts);
            } catch (err) {
                if (!cancelled)
                    setError(err instanceof Error ? err.message : String(err));
            }
        }
        void loadPorts();
        return () => {
            cancelled = true;
        };
    }, [fetchPortsFn, stationId]);

    const canDeletePort: boolean = enabled && stationState === "OUT_OF_SERVICE";
    const maxPorts = config.maxPortsPerStation;
    
    if (error) {
        return (
            <div className="flex flex-col gap-2 text-xs w-full">
                <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">
                    {error}
                </p>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2 text-xs w-full">
            <div className="mb-1 flex items-center flex-wrap">
                <h2>{`Ports: ${ports.length} of ${maxPorts}`}</h2>         
            </div>
            <div className="flex flex-col gap-2">
                {ports.map((port) => (
                    <div key={port.portId} className="flex flex-col gap-2">
                    <StationPortCard
                        port={port}
                        isUpdating={editState?.portId === port.portId && editState.isUpdating}
                        canDelete={canDeletePort}
                        onDelete={() => deletePort(port.portId)}
                    />
                    {editState?.portId === port.portId && editState.error && (
                        <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">
                            {editState.error}
                        </p>
                    )}
                </div>
                ))}
            </div>
        </div>
    );
};

export default PortsView;
