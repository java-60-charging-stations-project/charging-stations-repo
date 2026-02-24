import { useState, useEffect } from 'react';
import { stationsAPI, techSupportAPI, sessionsAPI } from '@/api/client';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Station {
  stationId: string;
  name: string;
  address: string;
  status: string;
  totalPorts: number;
}

interface ActiveSession {
  sessionId: string;
  userId: string;
  stationId: string;
  chargePercent?: number;
}

export default function StationManagement() {
  const [stations, setStations] = useState<Station[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [stationRes, sessionRes] = await Promise.all([
        stationsAPI.list(),
        sessionsAPI.getAll('IN_PROGRESS').catch(() => ({ data: { sessions: [] } })),
      ]);
      setStations(stationRes.data.stations);
      setSessions(sessionRes.data.sessions);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (stationId: string, newStatus: string) => {
    try {
      await techSupportAPI.setStationMode(stationId, newStatus);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Failed to change mode');
    }
  };

  const handleForceStop = async (sessionId: string) => {
    if (!confirm('Force stop this session?')) return;
    try {
      await techSupportAPI.forceStopSession(sessionId);
      loadData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Failed to stop session');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Station Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold">Stations</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ports</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stations.map((s) => (
              <tr key={s.stationId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.address}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-sm">{s.totalPorts}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {s.status === 'ACTIVE' && (
                      <>
                        <button onClick={() => handleModeChange(s.stationId, 'MAINTENANCE')} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Maintenance</button>
                        <button onClick={() => handleModeChange(s.stationId, 'OUT_OF_ORDER')} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200">Out of Order</button>
                      </>
                    )}
                    {(s.status === 'MAINTENANCE' || s.status === 'OUT_OF_ORDER') && (
                      <button onClick={() => handleModeChange(s.stationId, 'ACTIVE')} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">Activate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold">Active Sessions ({sessions.length})</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No active sessions</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charge</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((s) => (
                <tr key={s.sessionId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{s.sessionId}</td>
                  <td className="px-4 py-3 text-sm">{s.userId}</td>
                  <td className="px-4 py-3 text-sm">{s.stationId}</td>
                  <td className="px-4 py-3 text-sm">{s.chargePercent?.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleForceStop(s.sessionId)} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200">Force Stop</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
