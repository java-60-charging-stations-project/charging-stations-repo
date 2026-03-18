import { fetchStations } from "@/services/api/adminApi";
import { getErrorMessage } from "@/services/api/errorUtils";
import type { StationBase } from "@/types/stations";
import { useEffect, useState } from "react";

function StationTableHeader(): React.ReactNode {
  return (
    <thead>
      <tr>
        <th>Code</th>
        <th>Name</th>
        <th>Owner</th>
        <th>City</th>
        <th>Address</th>
        <th>Phone</th>
        <th>Email</th>
        <th>State</th>
        <th>Rate</th>
      </tr>
    </thead>
  );
}

function StationTableRow({ station }: { station: StationBase }): React.ReactNode {
  const peakRate = station.ratePlan?.peakRate ?? 0;
  const offPeakRate = station.ratePlan?.offPeakRate ?? 0;
  const rate = `${peakRate}/${offPeakRate} ${station.ratePlan?.currencyCode ?? '?'}`;
  return (
    <tr>
      <td>{station.code}</td>
      <td>{station.name}</td>
      <td>{station.owner}</td>
      <td>{station.city}</td>
      <td>{station.address}</td>
      <td>{station.phone}</td>
      <td>{station.email}</td>
      <td>{station.state}</td>
      <td>{rate}</td>
    </tr>
  );
}

const AdminStationsPage = () => {
  const [stations, setStations] = useState<StationBase[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadStations = async () => {
    try {
      setLoading(true);
      const data = await fetchStations();
      setStations(data);
    }
    catch (error) {
      setError(getErrorMessage(error));
    }
    finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { loadStations(); }, []);

  return (
    <div>
      <h1>Stations</h1>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <table>
        <StationTableHeader />
        <tbody>
          {stations.map((station) => (
            <StationTableRow key={station.id} station={station} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminStationsPage;
