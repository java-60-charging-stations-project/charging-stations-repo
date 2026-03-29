import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchStationById, fetchStationPorts, deleteStationPort, addStationPorts } from "@/services/api/supportApi";
import type { StationState } from "@/types/stations";
import NavButton from "@/components/NavButton";
import PortsView from "@/components/stations/PortsView";
import { useAuth } from "@/hooks/useAuth";

const StationPortsViewPage = () => {
    const { stationId } = useParams<{ stationId: string }>();
    const { userRole } = useAuth();
    const [stationState, setStationState] = useState<StationState | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!stationId) return;
        let cancelled = false;
        (async () => {
            try {
                const station = await fetchStationById(stationId);
                if (!cancelled) {
                    setStationState(station.state);
                    setLoadError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setStationState(null);
                    setLoadError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load station",
                    );
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [stationId]);

    if (!stationId) {
        return (
            <div className="max-w-md mx-auto mt-5 p-4 text-xs text-red-500">
                Missing station id.
            </div>
        );
    }

    const backToStationPath = `/support/stations/view/${stationId}`;

    return (
        <div className="max-w-md mx-auto mt-5 p-4 text-[9px] leading-tight rounded-lg shadow-md flex flex-col space-y-3">
            <div>
                <NavButton to={backToStationPath} caption="← Back to station" />
            </div>
            <h2 className="text-center text-lg font-bold">Station ports</h2>
            {loadError && (
                <p className="text-red-500 text-xs">{loadError}</p>
            )}
            {stationState && (
                <PortsView
                    stationId={stationId}
                    stationState={stationState}
                    enabled={userRole === "SUPPORT"}
                    fetchPortsFn={fetchStationPorts}
                    deletePortFn={deleteStationPort}
                    addPortsFn={addStationPorts}
                />
            )}
        </div>
    );
};

export default StationPortsViewPage;
