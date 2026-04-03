import StationsTable from "@/components/StationsTable";
import { fetchStations } from "@/services/api/supportApi";
import { useCallback } from "react";


const SupportStationsPage = () => {
    const detailPath = useCallback((stationId: string) => `/support/stations/view/${stationId}`, []);
    return (
        <>
            <div>
                <h1 className="text-2xl font-bold text-center">Technical support stations management</h1>
            </div>
            <div className="text-xs">
                <h1>Stations</h1>
                <StationsTable
                    fetchFn={fetchStations}
                    detailPath={detailPath}
                />
            </div>
        </>
    );
};

export default SupportStationsPage;
