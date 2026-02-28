import { useState, useEffect } from 'react';
import { sessionsAPI } from '@/api/client';
import { useI18n } from '@/i18n/I18nContext';
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
  const { t, dateLocale } = useI18n();
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
    <div className="page-enter max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ios-label tracking-tight">{t('history.title')}</h1>
        <p className="text-base mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
          {t('history.subtitle')}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6" style={{ background: 'rgba(120,120,128,0.08)' }}>
            <svg className="w-10 h-10" style={{ color: 'rgba(60,60,67,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ios-label mb-2">{t('history.empty')}</h2>
          <p style={{ color: 'rgba(60,60,67,0.45)' }}>{t('history.emptyHint')}</p>
        </div>
      ) : (
        <div className="glass rounded-4xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr>
                  {[t('history.session'), t('history.station'), t('history.status'), t('history.charge'), t('history.consumed'), t('history.cost'), t('history.date')].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: 'rgba(60,60,67,0.45)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {sessions.map((s) => (
                  <tr key={s.sessionId} className="transition-colors hover:bg-black/[0.02]">
                    <td className="px-6 py-4 text-sm font-mono text-ios-label whitespace-nowrap">
                      {s.sessionId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-ios-label whitespace-nowrap">
                      <div className="font-medium truncate max-w-[120px]" title={s.stationId}>{s.stationId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-ios-label whitespace-nowrap">
                      {s.chargePercent.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: '#0A84FF' }}>
                      {s.energyConsumedKwh.toFixed(2)} kWh
                    </td>
                    <td className="px-6 py-4 text-sm font-bold whitespace-nowrap" style={{ color: '#28B14C' }}>
                      ${s.totalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap" style={{ color: 'rgba(60,60,67,0.6)' }}>
                      {new Date(s.createdAt).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
