import StationsTable from "@/components/StationsTable";
import { fetchStations } from "@/services/api/supportApi";

const SupportStationsPage = () => {
    return (
        <div className="text-xs">
            <h1>Stations</h1>
            <StationsTable
                fetchFn={fetchStations}
                detailPath={(id) => `/support/stations/view/${id}`}
            />
        </div>
    );
};

export default SupportStationsPage;
