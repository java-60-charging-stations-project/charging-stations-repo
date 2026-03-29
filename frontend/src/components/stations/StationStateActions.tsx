import { useState, type FC } from "react";
import {
    changeStationState as adminChangeStationState,
    deleteStation,
} from "@/services/api/adminApi";
import { changeStationState as supportChangeStationState } from "@/services/api/supportApi";
import type { StationState } from "@/types/stations";
import { StationStateBadge } from "@/components/StatusBadge";

export interface StationStateActionsProps {
    stationId: string;
    stationState: StationState;
    updatedAt: string;
    userRole: string | null;
    maxPowerKw: number;
    peakRate: number;
    offPeakRate: number;
    onStateChanged: () => Promise<void>;
    onDeleted: () => void;
}

const StationStateActions: FC<StationStateActionsProps> = ({
    stationId, stationState, updatedAt, userRole,
    maxPowerKw, peakRate, offPeakRate,
    onStateChanged, onDeleted,
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const changeStateFn = userRole === "ADMIN" ? adminChangeStationState : supportChangeStationState;

    const handleChangeState = async (newState: StationState) => {
        setError(null);
        setIsProcessing(true);
        try {
            await changeStateFn(stationId, { oldState: stationState, newState, updatedAt });
            await onStateChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Operation failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        setError(null);
        setIsProcessing(true);
        try {
            await deleteStation(stationId);
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleActivate = () => {
        const issues: string[] = [];
        if (!maxPowerKw || maxPowerKw <= 0) issues.push("Max power (kW) must be greater than 0");
        if (!peakRate || peakRate <= 0) issues.push("High rate must be greater than 0");
        if (!offPeakRate || offPeakRate <= 0) issues.push("Low rate must be greater than 0");
        if (issues.length > 0) {
            setError(issues.join(". "));
            return;
        }
        void handleChangeState("ACTIVE");
    };

    const renderActions = () => {
        if (userRole === "ADMIN" && stationState === "INACTIVE") {
            return (
                <>
                    <button type="button" className="px-2 py-1 rounded-md bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleChangeState("OUT_OF_SERVICE")}>
                        To support
                    </button>
                    <button type="button" className="px-2 py-1 rounded-md bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleDelete()}>
                        Delete
                    </button>
                </>
            );
        }
        if (userRole === "SUPPORT" && stationState === "OUT_OF_SERVICE") {
            return (
                <>
                    <button type="button" className="px-2 py-1 rounded-md bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleChangeState("INACTIVE")}>
                        To admin
                    </button>
                    <button type="button" className="px-2 py-1 rounded-md bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={handleActivate}>
                        Activate
                    </button>
                </>
            );
        }
        if (userRole === "SUPPORT" && stationState === "ACTIVE") {
            return (
                <button type="button" className="px-2 py-1 rounded-md bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={isProcessing} onClick={() => void handleChangeState("OUT_OF_SERVICE")}>
                    Deactivate
                </button>
            );
        }
        return null;
    };

    const actions = renderActions();

    return (
        <div className="mt-3 border-t border-neutral-200 pt-3 text-xs">
            <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">State:</span>
                <StationStateBadge state={stationState} />
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Actions:</span>
                    {actions}
                </div>
            )}
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
    );
};

export default StationStateActions;
