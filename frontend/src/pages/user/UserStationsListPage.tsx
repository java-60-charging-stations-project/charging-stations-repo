import StationsTable from "@/components/StationsTable";
import { fetchStations } from "@/services/api/userApi";

const UserStationsListPage = () => {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-center">Charging stations</h1>
      </div>
      <div className="text-xs">
        <h1>Stations</h1>
        <StationsTable
          fetchFn={fetchStations}
          detailPath={(id) => `/user/stations/${id}`}
          showStateFilter={false}
        />
      </div>
    </>
  );
};

export default UserStationsListPage;
