import { useCallback, useId, useState, type FC } from "react";
import type { StationPort } from "@/types/stations";
import { PortStateBadge } from "../StatusBadge";
import SimpleButton from "../SimpleButton";

export interface StationPortCardProps {
    port: StationPort;
    canDelete?: boolean;
    onDelete?: () => void;
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

const StationPortCard: FC<StationPortCardProps> = ({ port, canDelete, onDelete }) => {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const panelId = useId();
    const toggleDetails = useCallback(() => setDetailsOpen((v) => !v), []);

    return (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-2 text-xs">
            <div className="flex flex-row items-center justify-between gap-2">
                <span className="font-medium text-neutral-800">Code: {port.portCode}</span>
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
                        <div className="flex items-center justify-between">
                            {canDelete && onDelete && (
                                <SimpleButton
                                    caption="Delete port"
                                    handleClick={onDelete}
                                    size="xs"
                                    color="tertiary"
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StationPortCard;
