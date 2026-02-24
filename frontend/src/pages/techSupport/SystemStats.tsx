import { useState, useCallback } from 'react';
import { techSupportAPI } from '@/api/client';
import { usePolling } from '@/hooks/usePolling';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Stats {
  activeSessions: number;
  totalStations: number;
  totalPorts: number;
  occupiedPorts: number;
  portOccupancyPercent: number;
  faultyStations: number;
  stationsByStatus: Record<string, number>;
}

export default function SystemStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await techSupportAPI.getStats();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchStats, 10000, true);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <div className="text-center py-12 text-gray-500">Failed to load stats</div>;

  const cards = [
    { label: 'Active Sessions', value: stats.activeSessions, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Stations', value: stats.totalStations, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Ports', value: stats.totalPorts, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Occupied Ports', value: stats.occupiedPorts, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Port Occupancy', value: `${stats.portOccupancyPercent}%`, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Faulty Stations', value: stats.faultyStations, color: stats.faultyStations > 0 ? 'text-red-600' : 'text-green-600', bg: stats.faultyStations > 0 ? 'bg-red-50' : 'bg-green-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Statistics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-6`}>
            <p className="text-sm font-medium text-gray-600 mb-1">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">Stations by Status</h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(stats.stationsByStatus).map(([status, count]) => (
            <div key={status} className="text-center">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-gray-500">{status}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">Auto-refreshes every 10 seconds</p>
    </div>
  );
}
