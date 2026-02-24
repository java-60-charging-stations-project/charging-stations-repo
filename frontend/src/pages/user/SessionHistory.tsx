import { useState, useEffect } from 'react';
import { sessionsAPI } from '@/api/client';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Session {
  sessionId: string;
  stationId: string;
  status: string;
  chargePercent: number;
  energyConsumedKwh: number;
  totalCost: number;
  createdAt: string;
}

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await sessionsAPI.getHistory();
      setSessions(data.sessions);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Charging History</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No charging sessions yet</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charge</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Energy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((s) => (
                <tr key={s.sessionId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono">{s.sessionId}</td>
                  <td className="px-6 py-4 text-sm">{s.stationId}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                  <td className="px-6 py-4 text-sm">{s.chargePercent.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-sm">{s.energyConsumedKwh.toFixed(2)} kWh</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">${s.totalCost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
