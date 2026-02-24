import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stationsAPI } from '@/api/client';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Station {
  stationId: string;
  name: string;
  address: string;
  status: string;
  totalPorts: number;
  powerKw: number;
  tariffPerKwh: number;
}

export default function StationList() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadStations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadStations = async () => {
    try {
      const { data } = await stationsAPI.list(filter || undefined);
      setStations(data.stations);
    } catch (err) {
      console.error('Failed to load stations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Charging Stations</h1>
        <select
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
        >
          <option value="">All Stations</option>
          <option value="ACTIVE">Active</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OUT_OF_ORDER">Out of Order</option>
        </select>
      </div>

      {stations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No stations found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station) => (
            <Link
              key={station.stationId}
              to={`/stations/${station.stationId}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition hover:border-green-300"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{station.name}</h3>
                <StatusBadge status={station.status} />
              </div>
              <p className="text-sm text-gray-500 mb-4">{station.address}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{station.totalPorts}</div>
                  <div className="text-xs text-gray-500">Ports</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-900">{station.powerKw}</div>
                  <div className="text-xs text-gray-500">kW</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-green-600">${station.tariffPerKwh}</div>
                  <div className="text-xs text-gray-500">/kWh</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
