import { type FC } from "react";
import type { StationBase, StationState } from "@/types/stations";
import { StationStateBadge } from "@/components/StatusBadge";
import { useDeleteStationMutation, useUpdateStationStateMutation } from "@/store/apiSlice";
import type { UserRole } from "@/types";

export interface StationStateActionsProps {
    station: StationBase;
    userRole: UserRole;
}

const StationStateActions: FC<StationStateActionsProps> = ({station, userRole,}) => {
    const [updateStationStateMutation, { isLoading: isUpdating, error: updateError }] = useUpdateStationStateMutation();
    const [deleteStationMutation, { isLoading: isDeleting, error: deleteError }] = useDeleteStationMutation();

    const isProcessing = isUpdating || isDeleting;
    const error = updateError?.message || deleteError?.message;
    
    const handleChangeState = async (newState: StationState) => {
        await updateStationStateMutation({
                stationId: station.id,
                role: userRole,
                body: {
                    oldState: station.state,
                    newState,
                    updatedAt: station.updatedAt,
                },
            });
    };

    const handleDelete = async () => {
        await deleteStationMutation(station.id);
    };

    const renderActions = () => {
        if (userRole === "ADMIN" && station.state === "INACTIVE") {
            return (
                <>
                    <button
                        type="button"
                        className="px-2 py-1 rounded-md bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isProcessing}
                        onClick={() => void handleChangeState("OUT_OF_SERVICE")}
                    >
                        To support
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 rounded-md bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isProcessing}
                        onClick={() => void handleDelete()}
                    >
                        Delete
                    </button>
                </>
            );
        }
        if (userRole === "SUPPORT" && station.state === "OUT_OF_SERVICE") {
            return (
                <>
                    <button
                        type="button"
                        className="px-2 py-1 rounded-md bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isProcessing}
                        onClick={() => void handleChangeState("INACTIVE")}
                    >
                        To admin
                    </button>
                    <button
                        type="button"
                        className="px-2 py-1 rounded-md bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isProcessing}
                        onClick={() => void handleChangeState("ACTIVE")}
                    >
                        Activate
                    </button>
                </>
            );
        }
        if (userRole === "SUPPORT" && station.state === "ACTIVE") {
            return (
                <button
                    type="button"
                    className="px-2 py-1 rounded-md bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessing}
                    onClick={() => void handleChangeState("OUT_OF_SERVICE")}
                >
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
                <StationStateBadge state={station.state} />
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
