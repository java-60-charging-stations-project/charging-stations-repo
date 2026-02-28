import { useState, useCallback, useRef } from 'react';
import { sessionsAPI } from '@/api/client';
import { usePolling } from '@/hooks/usePolling';
import { useI18n } from '@/i18n/I18nContext';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Session {
  sessionId: string;
  status: string;
  chargePercent: number;
  energyConsumedKwh: number;
  totalCost: number;
  tariffPerKwh: number;
  batteryCapacityKwh: number;
  stationId: string;
  portId: string;
}

interface EnergyParticlesProps {
  active: boolean;
}

function EnergyParticles({ active }: EnergyParticlesProps) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="energy-particle"
          style={{
            animationDelay: `${i * 0.6}s`,
            background: ['#30D158', '#0A84FF', '#5AC8FA', '#30D158', '#BF5AF2'][i],
          }}
        />
      ))}
    </div>
  );
}

interface CompletedOverlayProps {
  show: boolean;
}

function CompletedOverlay({ show }: CompletedOverlayProps) {
  if (!show) return null;

  const confettiColors = ['#30D158', '#0A84FF', '#FF9F0A', '#BF5AF2', '#FF453A', '#5AC8FA'];

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            background: confettiColors[i % confettiColors.length],
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 30}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
      <div className="charge-complete-bounce">
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #30D158, #34C759)', boxShadow: '0 8px 30px rgba(48,209,88,0.4)' }}>
          <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" className="check-draw" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function ChargingSession() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [stopping, setStopping] = useState<boolean>(false);
  const [justCompleted, setJustCompleted] = useState<boolean>(false);
  const [justStarted, setJustStarted] = useState<boolean>(false);
  const prevStatus = useRef<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const { data } = await sessionsAPI.getActive();
      const newSession: Session | null = data.session;

      if (prevStatus.current === null && newSession?.status) {
        setJustStarted(true);
        setTimeout(() => setJustStarted(false), 2000);
      }
      if (prevStatus.current && ['STARTED', 'IN_PROGRESS'].includes(prevStatus.current) &&
        newSession?.status === 'COMPLETED') {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 3000);
      }
      prevStatus.current = newSession?.status || null;

      setSession(newSession);
    } catch (err) {
      console.error('Failed to fetch active session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchSession, 3000, true);

  const handleStop = async () => {
    if (!session) return;
    setStopping(true);
    try {
      await sessionsAPI.stop(session.sessionId);
      fetchSession();
    } catch (err) {
      console.error('Failed to stop session:', err);
    } finally {
      setStopping(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!session) {
    return (
      <div className="text-center py-20 page-enter">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6"
          style={{ background: 'rgba(120,120,128,0.08)' }}>
          <svg className="w-12 h-12" style={{ color: 'rgba(60,60,67,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-ios-label mb-2">{t('charging.noSession')}</h2>
        <p style={{ color: 'rgba(60,60,67,0.45)' }}>{t('charging.noSessionHint')}</p>
      </div>
    );
  }

  const percent = session.chargePercent || 0;
  const isCharging = ['STARTED', 'IN_PROGRESS'].includes(session.status);
  const isComplete = session.status === 'COMPLETED';

  const strokeColor = percent >= 80 ? '#30D158' : percent >= 50 ? '#0A84FF' : '#FF9F0A';
  const glowColor = percent >= 80 ? 'rgba(48,209,88,0.3)' : percent >= 50 ? 'rgba(10,132,255,0.3)' : 'rgba(255,159,10,0.3)';

  return (
    <div className={`max-w-2xl mx-auto page-enter ${justStarted ? 'animate-[scaleIn_0.5s_ease-out]' : ''}`}>
      <h1 className="text-2xl font-bold text-ios-label mb-6 tracking-tight">
        {isCharging ? t('charging.active') : isComplete ? t('charging.complete') : t('charging.session')}
      </h1>

      <div className="glass rounded-3xl p-8 relative overflow-hidden">
        <CompletedOverlay show={justCompleted} />

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-medium" style={{ color: 'rgba(60,60,67,0.45)' }}>{t('charging.sessionId')}</p>
            <p className="font-mono text-sm text-ios-label mt-0.5">{session.sessionId?.slice(0, 12)}...</p>
          </div>
          <StatusBadge status={session.status} />
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative w-52 h-52">
            {isCharging && (
              <div className="absolute inset-2 rounded-full charging-glow" style={{ background: 'transparent' }} />
            )}

            {isCharging && (
              <div className="absolute inset-0 rounded-full charging-pulse-ring"
                style={{ border: `2px solid ${strokeColor}`, opacity: 0.3 }} />
            )}

            <EnergyParticles active={isCharging} />

            <svg className="w-52 h-52 transform -rotate-90 relative z-10" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(120,120,128,0.1)" strokeWidth="7" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={strokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${percent * 2.64} 264`}
                style={{
                  transition: 'stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.5s',
                  filter: `drop-shadow(0 0 8px ${glowColor})`,
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              {isCharging && (
                <div className="charging-bolt mb-1" style={{ color: strokeColor }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              )}
              {isComplete && (
                <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="#30D158" strokeWidth={2.5} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span className="text-4xl font-bold text-ios-label">{percent.toFixed(1)}%</span>
              <span className="text-xs font-medium" style={{ color: 'rgba(60,60,67,0.45)' }}>{t('charging.charged')}</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="w-full rounded-full h-2.5" style={{ background: 'rgba(120,120,128,0.1)' }}>
            <div
              className={`h-2.5 rounded-full ${isCharging ? 'progress-shimmer' : ''}`}
              style={{
                width: `${percent}%`,
                background: `linear-gradient(90deg, ${strokeColor}, ${percent >= 80 ? '#5AC8FA' : percent >= 50 ? '#30D158' : '#0A84FF'})`,
                transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)',
                boxShadow: `0 0 12px ${glowColor}`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { key: 'consumed', label: t('charging.consumed'), value: `${session.energyConsumedKwh.toFixed(2)} kWh`, color: '#0A84FF' },
            { key: 'cost', label: t('charging.cost'), value: `$${session.totalCost.toFixed(2)}`, color: '#30D158' },
            { key: 'tariff', label: t('charging.tariff'), value: `$${session.tariffPerKwh}/kWh`, color: '#FF9F0A' },
            { key: 'capacity', label: t('charging.capacity'), value: `${session.batteryCapacityKwh} kWh`, color: '#BF5AF2' },
          ].map(({ key, label, value, color }) => (
            <div key={key} className="rounded-2xl p-4" style={{ background: 'rgba(120,120,128,0.06)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'rgba(60,60,67,0.45)' }}>{label}</p>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm mb-6 px-1" style={{ color: 'rgba(60,60,67,0.5)' }}>
          <span>{t('charging.station')}: {session.stationId?.slice(0, 8)}...</span>
          <span>{t('charging.port')}: {session.portId}</span>
        </div>

        {isCharging && (
          <button
            onClick={handleStop}
            disabled={stopping}
            className="btn-ios-red w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stopping ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('charging.stopping')}
              </span>
            ) : t('charging.stopCharging')}
          </button>
        )}
      </div>
    </div>
  );
}
