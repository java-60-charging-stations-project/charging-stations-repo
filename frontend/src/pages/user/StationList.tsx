import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stationsAPI } from '@/api/client';
import { useI18n } from '@/i18n/I18nContext';
import { STATION_FALLBACKS } from '@/i18n/stationFallbacks';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
}

function getLocalized(station: Station, field: 'name' | 'address', langCode: string): string {
  const i18n = field === 'name' ? station.name_i18n : station.address_i18n;
  const fromApi = i18n && typeof i18n === 'object' && i18n[langCode];
  if (fromApi) return fromApi;
  const fallback = STATION_FALLBACKS[station.stationId]?.[field]?.[langCode];
  if (fallback) return fallback;
  return station[field];
}

export default function StationList() {
  const { t, langCode } = useI18n();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadStations();
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
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ios-label tracking-tight">{t('stations.title')}</h1>
          <p className="text-base mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
            {t('stations.subtitle')}
          </p>
        </div>

        <div className="relative w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
            className="input-ios appearance-none pr-10 cursor-pointer sm:min-w-[180px]"
          >
            <option value="">{t('stations.filterAll')}</option>
            <option value="ACTIVE">{t('stations.filterActive')}</option>
            <option value="MAINTENANCE">{t('stations.filterMaint')}</option>
            <option value="OUT_OF_ORDER">{t('stations.filterOutOfOrder')}</option>
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none" style={{ color: 'rgba(60,60,67,0.45)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {stations.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6" style={{ background: 'rgba(120,120,128,0.08)' }}>
            <svg className="w-10 h-10" style={{ color: 'rgba(60,60,67,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ios-label mb-2">{t('stations.empty')}</h2>
          <p style={{ color: 'rgba(60,60,67,0.45)' }}>{t('stations.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {stations.map((station) => (
            <Link
              key={station.stationId}
              to={`/stations/${station.stationId}`}
              className="glass rounded-3xl p-6 card-hover block group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="pr-3">
                  <h3 className="font-bold text-lg text-ios-label leading-tight group-hover:text-blue-500 transition-colors">
                    {getLocalized(station, 'name', langCode)}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
                    {getLocalized(station, 'address', langCode)}
                  </p>
                </div>
                <StatusBadge status={station.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center mt-6">
                <div className="rounded-2xl p-2.5 transition-colors" style={{ background: 'rgba(120,120,128,0.06)' }}>
                  <div className="text-lg font-bold text-ios-label">{station.totalPorts}</div>
                  <div className="text-xs font-medium" style={{ color: 'rgba(60,60,67,0.45)' }}>{t('stations.ports')}</div>
                </div>
                <div className="rounded-2xl p-2.5 transition-colors" style={{ background: 'rgba(120,120,128,0.06)' }}>
                  <div className="text-lg font-bold text-ios-label">{station.powerKw}<span className="text-sm font-medium ml-0.5">kW</span></div>
                  <div className="text-xs font-medium" style={{ color: 'rgba(60,60,67,0.45)' }}>{t('stations.power')}</div>
                </div>
                <div className="rounded-2xl p-2.5 transition-colors" style={{ background: 'rgba(48,209,88,0.08)' }}>
                  <div className="text-lg font-bold" style={{ color: '#28B14C' }}>${station.tariffPerKwh}</div>
                  <div className="text-xs font-medium" style={{ color: '#30D158' }}>{t('stations.perKwh')}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
