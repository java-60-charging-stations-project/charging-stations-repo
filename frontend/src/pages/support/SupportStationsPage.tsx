import StationsTable from "@/components/StationsTable";
import { fetchStations } from "@/services/api/supportApi";

const SupportStationsPage = () => {
    return (
        <>
            <div>
                <h1 className="text-2xl font-bold text-center">Technical support stations management</h1>
            </div>
            <div className="text-xs">
                <h1>Stations</h1>
                <StationsTable
                    fetchFn={fetchStations}
                    detailPath={(id) => `/support/stations/view/${id}`}
                />
            </div>
        </>
    );
};

export default SupportStationsPage;
