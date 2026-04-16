import { useCallback, useId, useState, type FC } from "react";
import type { StationPort } from "@/types/stations";
import { PortStateBadge } from "../StatusBadge";
import SimpleButton from "../SimpleButton";
import EasySpinner from "../EasySpinner";
import ToggleSwitch from "../ToggleSwitch";

export interface StationPortCardProps {
    port: StationPort;
    isUpdating: boolean;
    isLocked: boolean;
    /** Allows deleting the port (requires station OUT_OF_SERVICE) */
    canDelete?: boolean;
    onDelete?: () => void;
    onTurnOn?: () => void;
    onTurnOff?: () => void;
}

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

const DetailLine = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between gap-3 py-0.5">
        <span className="shrink-0 text-neutral-500">{label}</span>
        <span className="min-w-0 break-all text-right text-neutral-900">{value}</span>
    </div>
);

const StationPortCard: FC<StationPortCardProps> = ({
    port,
    isUpdating,
    isLocked,
    canDelete,
    onDelete,
    onTurnOn,
    onTurnOff,
}) => {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const panelId = useId();
    const toggleDetails = useCallback(() => setDetailsOpen((v) => !v), []);

    if (isUpdating) {
        return (
            <div className="w-full flex justify-center items-center">
                <EasySpinner size="sm" />
            </div>
        );
    }

    const isOn = port.status !== "DISABLED";
    const hint = isOn ? "Turn the port OFF" : "Turn the port ON";

    return (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-2 text-xs">
            <div className="flex flex-row items-center gap-2">
                <ToggleSwitch
                    value={isOn}
                    onChange={(checked) => {
                        if (checked) {
                            onTurnOn?.();
                        } else {
                            onTurnOff?.();
                        }
                    }}
                    hint={hint}
                    disabled={isLocked}
                />
                <span className="flex-1 font-bold text-neutral-800">{port.portCode}</span>
                <PortStateBadge state={port.status} />
            </div>

            <div className="border-t border-neutral-100 pt-1">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-700">Details</span>
                    <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-neutral-50 text-base leading-none text-neutral-700 hover:bg-neutral-100"
                        aria-expanded={detailsOpen}
                        aria-controls={panelId}
                        onClick={toggleDetails}
                        disabled={isLocked}
                    >
                        <span className="sr-only">{detailsOpen ? "Hide port details" : "Show port details"}</span>
                        <span aria-hidden>{detailsOpen ? "−" : "+"}</span>
                    </button>
                </div>
                {detailsOpen && (
                    <div id={panelId} className="mt-2 space-y-0.5 rounded border border-dashed border-neutral-200 bg-neutral-50/80 px-2 py-1.5">
                        <DetailLine label="Port ID" value={port.portId} />
                        <DetailLine label="Last meter (kW)" value={port.lastMeterKw} />
                        <DetailLine label="Created" value={formatDateTime(port.createdAt)} />
                        <DetailLine label="Updated" value={formatDateTime(port.updatedAt)} />
                        {canDelete && onDelete && port.status === "DISABLED" && (
                            <div className="flex justify-end pt-1">
                                <SimpleButton
                                    caption="Delete port"
                                    handleClick={onDelete}
                                    size="xs"
                                    color="tertiary"
                                    isDisabled={isLocked}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StationPortCard;
