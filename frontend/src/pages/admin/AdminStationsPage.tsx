import NavButton from "@/components/NavButton";
import SimpleButton from "@/components/SimpleButton";
import StationsTable from "@/components/StationsTable";
import { changeStationState, deleteStation, fetchStations } from "@/services/api/adminApi";
import { getErrorMessage } from "@/services/api/errorUtils";
import { getLogger } from "@/services/logging";
import type { StationBase } from "@/types/stations";
import { useState } from "react";

const logger = getLogger("AdminStationsPage");

interface AdminStationActionsProps {
    station: StationBase;
    refresh: () => void;
}

function AdminStationActions({ station, refresh }: AdminStationActionsProps) {
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleActivate = async () => {
        try {
            setError(null);
            setSuccess(null);
            setUpdating(true);
            await changeStationState(station.id, {
                oldState: "INACTIVE",
                newState: "OUT_OF_SERVICE",
                updatedAt: station.updatedAt,
            });
            logger.debug("Activated station", station.id);
            setSuccess("Activated");
            refresh();
        } catch (err) {
            logger.error("Activate error", err);
            setError(getErrorMessage(err));
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        try {
            setError(null);
            setSuccess(null);
            setUpdating(true);
            await deleteStation(station.id);
            logger.debug("Deleted station", station.id);
            setSuccess("Deleted");
            refresh();
        } catch (err) {
            logger.error("Delete error", err);
            setError(getErrorMessage(err));
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex gap-1">
                <SimpleButton
                    caption="To support"
                    color="tertiary"
                    isDisabled={station.state !== "INACTIVE" || updating}
                    size="xs"
                    handleClick={handleActivate}
                    className="w-full"
                />
                <SimpleButton
                    caption="Delete"
                    color="tertiary"
                    isDisabled={station.state !== "INACTIVE" || updating}
                    size="xs"
                    handleClick={handleDelete}
                    className="w-full"
                />
            </div>
            {error && <span className="text-red-600">{error}</span>}
            {success && <span className="text-green-600">{success}</span>}
        </div>
    );
}

const AdminStationsPage = () => {
    return (
        <div className="text-xs">
            <h1>Stations</h1>
            <StationsTable
                fetchFn={fetchStations}
                detailPath={(id) => `/admin/stations/create/${id}`}
                renderActions={(station, refresh) => (
                    <AdminStationActions station={station} refresh={refresh} />
                )}
            />
            <div className="mt-2">
                <NavButton
                    to="/admin/stations/create"
                    caption="Create a new station"
                    color="secondary"
                    size="xs"
                />
            </div>
        </div>
    );
};

export default AdminStationsPage;
