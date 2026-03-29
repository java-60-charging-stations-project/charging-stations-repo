import { useCallback, useEffect, useState, type FC } from "react";
import type { StationPort, StationPortCreate, StationState } from "@/types/stations";
import StationPortCard from "./StationPortCard";
import { getLogger } from "@/services/logging/logger";
import { config } from "@/config/env";
import EasySpinner from "../EasySpinner";
import Modal from "../Modal";
import SimpleButton from "../SimpleButton";

const MAX_PORTS = config.maxPortsPerStation;

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
    addPortsFn?: (stationId: string, ports: StationPortCreate[]) => Promise<StationPort[]>;
}

const PortsView: FC<PortsViewProps> = ({
    stationId,
    stationState,
    enabled,
    fetchPortsFn,
    deletePortFn,
    addPortsFn,
}) => {
    const [ports, setPorts] = useState<StationPort[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [addError, setAddError] = useState<string | null>(null);
    const [newPorts, setNewPorts] = useState<StationPortCreate[]>([]);
    const [newPortCode, setNewPortCode] = useState("");
    const [editState, setEditState] = useState<PortEditState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    
    const loadPorts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const nextPorts = await fetchPortsFn(stationId);
            setPorts(nextPorts);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setIsLoading(false);
        }
    }, [fetchPortsFn, stationId]);
    
    useEffect(() => {
        void loadPorts();
    }, [loadPorts]);

    const addPortCreateItem = useCallback(() => {
        const trimmedPortCode = newPortCode.trim();
        if (!trimmedPortCode) {
            setModalError("Port code is required");
            return;
        }
        const projectedPortsCount = ports.length + newPorts.length;
        if (projectedPortsCount > MAX_PORTS) {
            setModalError(`Maximum number of ports reached: ${MAX_PORTS}. Please remove some ports first.`);
            return;
        }
        if (ports.some((port: StationPort) => port.portCode === trimmedPortCode)) {
            setModalError(`Port code ${trimmedPortCode} already exists in the station`);
            return;
        }
        if (newPorts.some((port: StationPortCreate) => port.portCode === trimmedPortCode)) {
            setModalError(`Port code ${trimmedPortCode} already exists in the new ports list`);
            return;
        }
        setNewPorts((prev: StationPortCreate[]) => [...prev, { portCode: trimmedPortCode }]);
        setNewPortCode("");
    }, [newPortCode, ports, newPorts]);

    const addPorts = useCallback(async () => {
        if (!addPortsFn) return;
        if (newPorts.length === 0) return;
        logger.debug(`Adding ports`);
        setIsLoading(true);
        setAddError(null);
        try {
            const response = await addPortsFn(stationId, newPorts);
            logger.debug(`Ports successfully added: ${response.length}`);
            //setPorts((prev) => [...prev, ...response.ports]);
            setNewPorts([]);
            loadPorts();
        } catch (err) {
            setAddError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, [stationId, addPortsFn, loadPorts, newPorts]);

    const deletePort = useCallback(async (portId: string) => {
        if (!deletePortFn) return;
        logger.debug(`Deleting port ${portId}`);
        setEditState({ portId, isUpdating: true, error: null });
        try {
            await deletePortFn(stationId, portId);
            logger.debug(`Port ${portId} deleted`);
            //await loadPorts();
            setPorts((prev: StationPort[]) => prev.filter((port: StationPort) => port.portId !== portId));
            logger.debug(`Port ${portId} manually removed from list`);
            setEditState(null);
        } catch (err) {
            setEditState({ portId, isUpdating: false, error: err instanceof Error ? err.message : String(err) });
        }
    }, [stationId, deletePortFn]);

    const canDeletePort: boolean = enabled && stationState === "OUT_OF_SERVICE";
    const isLocked = isLoading || (editState?.isUpdating ?? false);
    
    if (error) {
        return (
            <div className="flex flex-col gap-2 text-xs w-full">
                <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">
                    {error}
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (<div className="w-full flex justify-center items-center">
            <EasySpinner size="lg" />
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2 text-xs w-full">
            <div className="mb-1 flex justify-between items-center flex-wrap">
                <h3 className="text-sm font-bold">{`Ports: ${ports.length} of ${MAX_PORTS}`}</h3>
                <SimpleButton
                    caption="Reload"
                    handleClick={() => void loadPorts()}
                    size="xs"
                    color="secondary"
                    isDisabled={isLocked}
                />
            </div>
            <div className="flex flex-col gap-2">
                {ports.map((port: StationPort) => (
                    <div key={port.portId} className="flex flex-col gap-2">
                    <StationPortCard
                        port={port}
                        isUpdating={editState?.portId === port.portId && editState.isUpdating}
                        isLocked={isLocked}
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
                {ports.length === 0 && (
                    <p className="w-full text-center text-neutral-500 text-xs mt-0.5 pr-0">
                        No ports found
                    </p>
                )}
                {enabled && (
                    <>
                        <div className="w-full flex justify-end gap-2">
                            <SimpleButton
                                caption="Add new ports"
                                handleClick={addPorts}
                                size="xs"
                                color="primary"
                                isDisabled={isLocked || newPorts.length === 0}
                            />
                        </div>
                        <h3 className="text-sm font-bold">{"New port codes to add:"}</h3>
                        <div className="w-full flex items-center gap-2">
                            <div className="w-full flex items-center gap-2">
                                <label htmlFor="new-port-code">New code</label>
                                <input
                                    id="new-port-code"
                                    type="text"
                                    value={newPortCode}
                                    onChange={(event) => setNewPortCode(event.target.value)}
                                    disabled={isLocked}
                                    className="px-2 py-1 border rounded text-xs"
                                />
                            </div>
                            <SimpleButton
                                caption="Add"
                                handleClick={addPortCreateItem}
                                size="xs"
                                color="secondary"
                                isDisabled={isLocked || newPortCode.trim().length === 0}
                            />
                        </div>
                        {newPorts.map((port: StationPortCreate, idx: number) => (
                            <div key={port.portCode} className="w-full flex justify-between gap-2">
                                <p className="text-xs">{port.portCode}</p>
                                <SimpleButton
                                    caption="Remove"
                                    handleClick={() => {
                                        setNewPorts(
                                            (prev: StationPortCreate[]) => [...prev.slice(0, idx), ...prev.slice(idx + 1)]
                                        );
                                    }}
                                    size="xs"
                                    color="secondary"
                                />
                            </div>
                        ))}
                    </>
                )}
                {addError && (
                    <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">
                        {addError}
                    </p>
                )}
            </div>
            <Modal
                isOpen={modalError !== null}
                onClose={() => setModalError(null)}
                showCloseButton={true}
                title="Error adding ports"
                children={<div className="w-full text-center text-red-500 text-xs mt-0.5 pr-0">{modalError}</div>}
            />
        </div>
    );
};

export default PortsView;
