import NavButton from "@/components/NavButton";
import SimpleButton from "@/components/SimpleButton";
import { changeStationState, deleteStation, fetchStations } from "@/services/api/adminApi";
import { getErrorMessage } from "@/services/api/errorUtils";
import { getLogger } from "@/services/logging";
import type { StationBase } from "@/types/stations";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const logger = getLogger("AdminStationsPage");

function StationTableHeader(): React.ReactNode {
  return (
    <thead>
      <tr>
        <th>Name</th>
        <th>Owner</th>
        <th>City</th>
        <th>Address</th>
        <th>State</th>
        <th>Actions</th>
      </tr>
    </thead>
  );
}

const AdminStationsPage = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState<StationBase[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [updating, setUpdating] = useState<boolean>(false);
  
  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await fetchStations();
      logger.debug("data", data);
      setStations(data);
    }
    catch (error) {
      logger.error("error", error);
      setError(getErrorMessage(error));
      setSuccess(null);
    }
    finally {
      setLoading(false);
    }
  };

  const apiActivate = async (stationId: string, updatedAt: string) => {
    try {
      setError(null);
      setSuccess(null);
      setUpdating(true);
      const result = await changeStationState(stationId, {
        oldState: "INACTIVE",
        newState: "OUT_OF_SERVICE",
        updatedAt,
      });
      logger.debug("result", result);
      
      setUpdateCount((c) => c + 1);
      setSuccess("Station activated successfully");
    }
    catch (error) {
      logger.error("error", error);
      setError(getErrorMessage(error));
    }
    finally {
      setUpdating(false);
    }
  };

  const apiDelete = async (stationId: string) => {
    try {
      setError(null);
      setSuccess(null);
      setUpdating(true);
      await deleteStation(stationId);
      logger.debug("DELETED SUCCESSFULLY");
      setStations(stations.filter((station) => station.id !== stationId));
      setUpdateCount((c) => c + 1);
      setSuccess("Station deleted successfully");
    }
    catch (error) {
      logger.error("error", error);
      setError(getErrorMessage(error));
    }
    finally {
      setUpdating(false);
    }
  };

  function StationTableRow({ station }: { station: StationBase }): React.ReactNode {
    return (
      <tr>
        <td>
          <button
            className="text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
            onClick={() => navigate(`/admin/stations/create/${station.id}`)}
          >
            {station.name}
          </button>
        </td>
        <td>{station.owner}</td>
        <td>{station.city}</td>
        <td>{station.address}</td>
        <td>{station.state}</td>
        <td>
          <div className="w-full flex gap-2 justify-around">
            <SimpleButton 
                caption="To support"
                color="tertiary"
                isDisabled={station.state !== "INACTIVE" || updating}
                size="xs"
                handleClick={() => apiActivate(station.id, station.updatedAt)}
                className="w-full"
            />
            <SimpleButton
                caption="Delete"
                color="tertiary"
                isDisabled={station.state !== "INACTIVE" || updating}
                size="xs"
                handleClick={() => apiDelete(station.id)}
                className="w-full"
            />
          </div>
        </td>
      </tr>
    );
  }
  
  useEffect(() => { loadStations(); }, [updateCount]);

  return (
    <div className="text-xs">
      <h1>Stations</h1>
      {loading && <p>Loading...</p>}
      {error && (
        <p className="text-error-600 font-bold text-lg border-2 border-warning-500 p-4 rounded">
          Error: {error}
        </p>
      )}
      {success && (
        <p className="text-success-600 font-bold text-lg border-2 border-success-950 p-4 rounded">
          {success}
        </p>
      )}
      <table>
        <StationTableHeader />
        <tbody>
          {stations.map((station) => (
            <StationTableRow key={station.id} station={station} />
          ))}
        </tbody>
      </table>
      <NavButton to="/admin/stations/create" caption="Create a new station" color="secondary" size="xs" />
    </div>
  );
};

export default AdminStationsPage;
