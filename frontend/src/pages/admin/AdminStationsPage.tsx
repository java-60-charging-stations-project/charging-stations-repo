import NavButton from "@/components/NavButton";
import StationsTable from "@/components/StationsTable";
import { fetchStations } from "@/services/api/adminApi";

const AdminStationsPage = () => {
    return (
        <div className="text-xs">
            <h1>Stations</h1>
            <StationsTable
                fetchFn={fetchStations}
                detailPath={(id) => `/admin/stations/view/${id}`}
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
