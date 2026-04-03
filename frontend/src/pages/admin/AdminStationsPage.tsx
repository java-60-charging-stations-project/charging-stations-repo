import NavButton from "@/components/NavButton";
import StationsTable from "@/components/StationsTable";
import { fetchStations } from "@/services/api/adminApi";
import { useCallback } from "react";

const AdminStationsPage = () => {
    const detailPath = useCallback((stationId: string) => `/admin/stations/view/${stationId}`, []);
    return (
        <>
            <div>
                <h1 className="text-2xl font-bold text-center">Administrator stations management</h1>
            </div>
            <div className="text-xs">
                <h1>Stations</h1>
                <StationsTable
                    fetchFn={fetchStations}
                    detailPath={detailPath}
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
        </>
    );
};

export default AdminStationsPage;
