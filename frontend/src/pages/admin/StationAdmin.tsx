import { useState, useEffect } from 'react';
import { stationsAPI, adminAPI } from '@/api/client';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Station {
  stationId: string;
  name: string;
  address: string;
  status: string;
  powerKw: number;
  tariffPerKwh: number;
}

interface StationForm {
  name: string;
  address: string;
  latitude: string | number;
  longitude: string | number;
  totalPorts: number;
  powerKw: number;
  tariffPerKwh: number;
}

const emptyForm: StationForm = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  totalPorts: 2,
  powerKw: 150,
  tariffPerKwh: 0.35,
};

export default function StationAdmin() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [form, setForm] = useState<StationForm>(emptyForm);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await adminAPI.createStation({
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setForm(emptyForm);
      setShowForm(false);
      loadStations();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Failed to create station');
    } finally {
      setCreating(false);
    }
  };

  const handleCommission = async (stationId: string) => {
    try {
      await adminAPI.commissionStation(stationId);
      loadStations();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Failed to commission station');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Station Administration</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ New Station'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold mb-4">Create New Station</h2>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input name="name" value={form.name as string} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input name="address" value={form.address as string} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input name="latitude" type="number" step="any" value={form.latitude as number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input name="longitude" type="number" step="any" value={form.longitude as number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Ports</label>
              <input name="totalPorts" type="number" min="1" max="20" value={form.totalPorts} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Power (kW)</label>
              <input name="powerKw" type="number" min="1" value={form.powerKw} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tariff ($/kWh)</label>
              <input name="tariffPerKwh" type="number" step="0.01" min="0.01" value={form.tariffPerKwh} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={creating} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium">
                {creating ? 'Creating...' : 'Create Station'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Power</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tariff</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stations.map((s) => (
              <tr key={s.stationId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.address}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-sm">{s.powerKw} kW</td>
                <td className="px-4 py-3 text-sm">${s.tariffPerKwh}/kWh</td>
                <td className="px-4 py-3">
                  {s.status === 'NEW' && (
                    <button onClick={() => handleCommission(s.stationId)} className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 font-medium">
                      Commission
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
