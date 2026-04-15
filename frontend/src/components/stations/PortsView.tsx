import { useCallback, useMemo, useState, type FC } from "react";
import type { StationPort, StationPortCreate, StationState } from "@/types/stations";
import StationPortCard from "./StationPortCard";
import { getLogger } from "@/services/logging/logger";
import { config } from "@/config/env";
import EasySpinner from "../EasySpinner";
import Modal from "../Modal";
import SimpleButton from "../SimpleButton";
import { useAddStationPortsMutation, useDeleteStationPortMutation, useGetStationPortsQuery, useUpdateStationPortStateMutation } from "@/store/apiSlice";

const MAX_PORTS = config.maxPortsPerStation;

const logger = getLogger("PortsView");

export interface PortsViewProps {
    stationId: string;
    stationState: StationState;
    enabled?: boolean;
}

const PortsView: FC<PortsViewProps> = ({
    stationId,
    stationState,
    enabled = true,
}) => {
    const [newPorts, setNewPorts] = useState<StationPortCreate[]>([]);
    const [newPortCode, setNewPortCode] = useState("");
    const [editPortId, setEditPortId] = useState<string | null>(null);
    const [deletePortId, setDeletePortId] = useState<string | null>(null);
    
    const [modalError, setModalError] = useState<string | null>(null);
    const [addPortsMutation, { isLoading: isAdding, error: addError, isError: isAddError }] = useAddStationPortsMutation();
    const [deletePortMutation, { isLoading: isDeleting, error: deleteError, isError: isDeleteError }] = useDeleteStationPortMutation();
    const [updatePortStateMutation, { isLoading: isUpdating, error: updateError, isError: isUpdateError }] = useUpdateStationPortStateMutation();
    const {data: portsData, isLoading, error: loadError, refetch: refetchPorts} = useGetStationPortsQuery(stationId);
    
    const ports = useMemo<StationPort[]>(() => portsData?.ports ?? [], [portsData]);
    
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
        if (newPorts.length === 0) return;
        logger.debug(`Adding ports count: ${newPorts.length}`);
        try {
            const response = await addPortsMutation({ stationId, body: {ports: newPorts} }).unwrap();
            const addedPorts = response.ports;
            logger.debug(`Ports successfully added: ${addedPorts.length}`);
            setNewPorts([]);
        } catch (err) {
            console.error(err);
        }
    }, [stationId, newPorts, addPortsMutation]);

    const deletePort = useCallback(async (portId: string) => {
        logger.debug(`Deleting port ${portId}`);
        setDeletePortId(portId);
        setEditPortId(null);
        try {
            await deletePortMutation({ stationId, portId }).unwrap();
            logger.debug(`Port ${portId} deleted`);
            setDeletePortId(null);
        } catch (err) {
            console.error(err);
        }
    }, [stationId, deletePortMutation]);

    const updatePortState = useCallback(async (port: StationPort, newState: "FREE" | "DISABLED") => {
        logger.debug(`Updating port ${port.portId} state to ${newState}`);
        setEditPortId(port.portId);
        setDeletePortId(null);
        try {
            const response = await updatePortStateMutation({ stationId, body: {
                portCode: port.portCode,
                oldState: port.status,
                newState,
            } }).unwrap();
            logger.debug(`Port ${port.portId} state updated to ${response.newState}`);
            setEditPortId(null);
        } catch (err) {
            console.error(err);
        }
    }, [stationId, updatePortStateMutation]);

    const canEditPort: boolean = enabled && stationState === "OUT_OF_SERVICE";
    const isLocked = isLoading || isUpdating || isDeleting || isAdding;
    const error = loadError?.message || addError?.message || deleteError?.message || updateError?.message;
    
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
                    handleClick={() => void refetchPorts()}
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
                        isUpdating={editPortId === port.portId && isUpdating}
                        isLocked={isLocked}
                        canEdit={canEditPort}
                        onDelete={() => void deletePort(port.portId)}
                        onTurnOn={() => void updatePortState(port, "FREE")}
                        onTurnOff={() => void updatePortState(port, "DISABLED")}
                    />
                    {(
                        (editPortId === port.portId && isUpdateError) || (deletePortId === port.portId && isDeleteError)
                    ) && (
                        <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">
                            {deletePortId === port.portId ? deleteError?.message : updateError?.message}
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
                {isAddError && (
                    <p className="w-full text-right text-red-500 text-xs mt-0.5 pr-0">
                        {addError?.message}
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
