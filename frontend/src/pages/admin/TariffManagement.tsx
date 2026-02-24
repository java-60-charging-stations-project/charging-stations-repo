import { useState, useEffect } from 'react';
import { stationsAPI, adminAPI } from '@/api/client';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Station {
  stationId: string;
  name: string;
  address: string;
  powerKw: number;
  tariffPerKwh: number;
}

export default function TariffManagement() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTariff, setNewTariff] = useState<string>('');

  useEffect(() => { loadStations(); }, []);

  const loadStations = async () => {
    try {
      const { data } = await stationsAPI.list();
      setStations(data.stations);
    } catch (err) {
      console.error('Failed to load stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (stationId: string) => {
    try {
      await adminAPI.updateTariff(stationId, Number(newTariff));
      setEditingId(null);
      loadStations();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Failed to update tariff');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tariff Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Power</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Tariff</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stations.map((s) => (
              <tr key={s.stationId} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium">{s.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.address}</td>
                <td className="px-6 py-4 text-sm">{s.powerKw} kW</td>
                <td className="px-6 py-4">
                  {editingId === s.stationId ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newTariff}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTariff(e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-medium text-green-600">${s.tariffPerKwh}/kWh</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === s.stationId ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(s.stationId)} className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(s.stationId); setNewTariff(String(s.tariffPerKwh)); }}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                      Edit Tariff
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
