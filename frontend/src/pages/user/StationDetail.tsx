import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { stationsAPI, sessionsAPI } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import { STATION_FALLBACKS } from '@/i18n/stationFallbacks';
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
  name_i18n?: Record<string, string>;
  address_i18n?: Record<string, string>;
  status: string;
  totalPorts: number;
  powerKw: number;
  tariffPerKwh: number;
  latitude: number;
  longitude: number;
  ports?: Port[];
}

function getLocalized(station: Station, field: 'name' | 'address', langCode: string): string {
  const i18n = field === 'name' ? station.name_i18n : station.address_i18n;
  const fromApi = i18n && typeof i18n === 'object' && i18n[langCode];
  if (fromApi) return fromApi;
  const fallback = STATION_FALLBACKS[station.stationId]?.[field]?.[langCode];
  if (fallback) return fallback;
  return station[field];
}

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, langCode } = useI18n();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [battery, setBattery] = useState<number>(60);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadStation();
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
      setError(axiosErr.response?.data?.message || t('detail.startError'));
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!station) {
    return (
      <div className="text-center py-20 page-enter">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6" style={{ background: 'rgba(120,120,128,0.08)' }}>
          <svg className="w-10 h-10" style={{ color: 'rgba(60,60,67,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-ios-label mb-2">{t('detail.notFound')}</h2>
        <button onClick={() => navigate('/stations')} className="btn-ios-secondary mt-4">
          {t('detail.backToList')}
        </button>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/stations')}
        className="flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity mb-6"
        style={{ color: '#0A84FF' }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t('detail.backAll')}
      </button>

      <div className="glass rounded-4xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 pointer-events-none opacity-[0.03] w-64 h-64 mix-blend-multiply"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }} />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ios-label tracking-tight mb-2">{getLocalized(station, 'name', langCode)}</h1>
              <p className="text-base" style={{ color: 'rgba(60,60,67,0.55)' }}>{getLocalized(station, 'address', langCode)}</p>
            </div>
            <StatusBadge status={station.status} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('detail.totalPorts'), value: station.totalPorts },
              { label: t('detail.power'), value: `${station.powerKw} kW` },
              { label: t('detail.costKwh'), value: `$${station.tariffPerKwh}`, color: '#28B14C' },
              { label: t('detail.coords'), value: `${station.latitude.toFixed(2)}, ${station.longitude.toFixed(2)}` },
            ].map((stat, i) => (
              <div key={i} className="rounded-3xl p-4 flex flex-col justify-center items-start sm:items-center text-left sm:text-center" style={{ background: 'rgba(120,120,128,0.06)' }}>
                <div className="text-xl font-bold mb-1" style={{ color: stat.color || '#1C1C1E' }}>{stat.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(60,60,67,0.45)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-2xl text-sm font-medium animate-fade-in flex items-center gap-3"
              style={{ background: 'rgba(255,69,58,0.1)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.2)' }}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {isAuthenticated && station.status === 'ACTIVE' && (
            <div className="bg-white/50 backdrop-blur-md rounded-3xl p-5 border border-white/60 mb-2">
              <label className="block text-sm font-semibold mb-3" style={{ color: 'rgba(60,60,67,0.7)' }}>
                {t('detail.batteryLabel')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={battery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBattery(Number(e.target.value))}
                  min="10" max="200"
                  className="input-ios max-w-[140px] text-lg font-bold"
                />
                <span className="text-sm font-medium" style={{ color: 'rgba(60,60,67,0.45)' }}>{t('detail.batteryHint')}</span>
              </div>
            </div>
          )}

          {!isAuthenticated && station.status === 'ACTIVE' && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-3xl gap-4" style={{ background: 'rgba(10,132,255,0.08)' }}>
              <div className="flex items-center gap-3 text-sm font-medium" style={{ color: '#007AFF' }}>
                <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('detail.loginPrompt')}
              </div>
              <Link to={`/login?redirect=/stations/${id}`} className="btn-ios-blue shrink-0 w-full sm:w-auto text-center">
                {t('detail.loginBtn')}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 px-1">
        <h2 className="text-xl font-bold text-ios-label">{t('detail.chargingPorts')}</h2>
        <span className="font-semibold text-sm px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(120,120,128,0.12)', color: 'rgba(60,60,67,0.6)' }}>
          {station.ports?.length || 0}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(station.ports || []).map((port) => (
          <div key={port.portId} className="glass rounded-3xl p-5 flex flex-col h-full card-hover">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-lg text-ios-label tracking-tight">{t('detail.port')} #{port.portNumber}</span>
              <StatusBadge status={port.status} />
            </div>

            <div className="mt-auto">
              {port.status === 'FREE' && station.status === 'ACTIVE' ? (
                isAuthenticated ? (
                  <button
                    onClick={() => handleStartCharging(port.portId)}
                    disabled={starting}
                    className="btn-ios-primary w-full shadow-[0_4px_15px_rgba(48,209,88,0.3)] hover:shadow-[0_6px_20px_rgba(48,209,88,0.4)] disabled:opacity-50"
                  >
                    {starting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('detail.starting')}
                      </span>
                    ) : t('detail.startCharging')}
                  </button>
                ) : (
                  <Link
                    to={`/login?redirect=/stations/${id}`}
                    className="btn-ios-secondary block w-full text-center"
                  >
                    {t('detail.loginRequired')}
                  </Link>
                )
              ) : (
                <button disabled className="btn-ios w-full text-center cursor-not-allowed opacity-60" style={{ background: 'rgba(120,120,128,0.1)', color: 'rgba(60,60,67,0.6)' }}>
                  {port.status === 'OCCUPIED' ? t('detail.occupied') : t('detail.unavailable')}
                </button>
              )}
            </div>
          </div>
        ))}
        {(!station.ports || station.ports.length === 0) && (
          <div className="col-span-full py-10 text-center rounded-3xl" style={{ border: '2px dashed rgba(120,120,128,0.2)' }}>
            <p className="font-medium" style={{ color: 'rgba(60,60,67,0.5)' }}>{t('detail.noPorts')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
