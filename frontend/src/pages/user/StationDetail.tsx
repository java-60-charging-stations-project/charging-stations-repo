import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stationsAPI, sessionsAPI } from '@/api/client';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Port {
  portId: string;
  portNumber: number;
  status: string;
}

interface Station {
  stationId: string;
  name: string;
  address: string;
  status: string;
  totalPorts: number;
  powerKw: number;
  tariffPerKwh: number;
  latitude: number;
  longitude: number;
  ports?: Port[];
}

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [battery, setBattery] = useState<number>(60);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadStation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadStation = async () => {
    try {
      const { data } = await stationsAPI.get(id as string);
      setStation(data.station);
    } catch (err) {
      console.error('Failed to load station:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCharging = async (portId: string) => {
    setStarting(true);
    setError('');
    try {
      await sessionsAPI.start({ stationId: id as string, portId, batteryCapacityKwh: battery });
      navigate('/sessions/current');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to start charging');
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!station) return <div className="text-center py-12 text-gray-500">Station not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/stations')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center">
        &larr; Back to stations
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{station.name}</h1>
            <p className="text-gray-500 mt-1">{station.address}</p>
          </div>
          <StatusBadge status={station.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{station.totalPorts}</div>
            <div className="text-sm text-gray-500">Total Ports</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{station.powerKw} kW</div>
            <div className="text-sm text-gray-500">Power</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">${station.tariffPerKwh}</div>
            <div className="text-sm text-gray-500">per kWh</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">
              {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
            </div>
            <div className="text-sm text-gray-500">Coordinates</div>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        {station.status === 'ACTIVE' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Battery Capacity (kWh)</label>
            <input
              type="number"
              value={battery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBattery(Number(e.target.value))}
              min="10"
              max="200"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Charging Ports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(station.ports || []).map((port) => (
          <div key={port.portId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Port #{port.portNumber}</span>
              <StatusBadge status={port.status} />
            </div>
            {port.status === 'FREE' && station.status === 'ACTIVE' && (
              <button
                onClick={() => handleStartCharging(port.portId)}
                disabled={starting}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
              >
                {starting ? 'Starting...' : 'Start Charging'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
