import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { checkHealth } from '@/store/slices/healthSlice';
import { useAuth } from '@/hooks/useAuth';
import type { AppDispatch, RootState } from '@/store';

interface CardItem {
  to: string;
  label: string;
  desc: string;
  gradient: string;
  glow: string;
  icon: React.ReactNode;
}

const cards: CardItem[] = [
  {
    to: '/stations',
    label: 'Станции',
    desc: 'Список зарядных станций',
    gradient: 'linear-gradient(135deg, #30D158, #34C759)',
    glow: 'rgba(48,209,88,0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/sessions/current',
    label: 'Текущая зарядка',
    desc: 'Активная сессия',
    gradient: 'linear-gradient(135deg, #0A84FF, #5AC8FA)',
    glow: 'rgba(10,132,255,0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/sessions/history',
    label: 'История',
    desc: 'Архив сессий',
    gradient: 'linear-gradient(135deg, #BF5AF2, #9B59B6)',
    glow: 'rgba(191,90,242,0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const techCards: CardItem[] = [
  {
    to: '/support/dashboard',
    label: 'Мониторинг',
    desc: 'Статистика нагрузки',
    gradient: 'linear-gradient(135deg, #FF9F0A, #FF6B35)',
    glow: 'rgba(255,159,10,0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const adminCards: CardItem[] = [
  {
    to: '/admin/dashboard',
    label: 'Администрирование',
    desc: 'Управление ролями',
    gradient: 'linear-gradient(135deg, #FF453A, #FF6B6B)',
    glow: 'rgba(255,69,58,0.25)',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

function DashCard({ to, label, desc, gradient, glow, icon }: CardItem) {
  return (
    <Link
      to={to}
      className="glass rounded-3xl p-6 card-hover block group"
      style={{ '--glow': glow } as React.CSSProperties}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: gradient, boxShadow: `0 6px 20px ${glow}` }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-ios-label text-base">{label}</h3>
      <p className="text-sm mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>{desc}</p>
    </Link>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { response, loading, error, lastChecked } = useSelector((state: RootState) => state.health);
  const { user, isAdmin, isTechSupport } = useAuth();

  const handleHealthCheck = () => dispatch(checkHealth(undefined));
  const handleFullHealthCheck = () => dispatch(checkHealth({ full: true }));

  const allCards: CardItem[] = [
    ...cards,
    ...((isTechSupport || isAdmin) ? techCards : []),
    ...(isAdmin ? adminCards : []),
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-ios-label tracking-tight">
            Привет, {user?.email?.split('@')[0] || 'пользователь'} 👋
          </h1>
        </div>
        <p className="text-base" style={{ color: 'rgba(60,60,67,0.55)' }}>
          Система управления зарядными станциями
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {allCards.map((card) => (
          <DashCard key={card.to} {...card} />
        ))}
      </div>

      {/* Health check */}
      <div className="glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold text-ios-label mb-5">Состояние системы</h2>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <button
            onClick={handleHealthCheck}
            disabled={loading}
            className="btn-ios-primary disabled:opacity-50"
          >
            {loading ? 'Проверка...' : '⚡ Health Check'}
          </button>
          <button
            onClick={handleFullHealthCheck}
            disabled={loading}
            className="btn-ios-blue disabled:opacity-50"
          >
            {loading ? 'Проверка...' : '🔍 Full Health Check'}
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-2xl text-sm mb-4 animate-fade-in"
            style={{ background: 'rgba(255,69,58,0.1)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.2)' }}>
            <p className="font-semibold">Ошибка</p>
            <p className="mt-0.5 opacity-80">{error as string}</p>
          </div>
        )}

        {response && (
          <div className="rounded-2xl overflow-hidden animate-fade-in"
            style={{
              border: `1px solid ${(response as { status: string }).status === 'ok' ? 'rgba(48,209,88,0.3)' : 'rgba(255,159,10,0.3)'}`,
              background: (response as { status: string }).status === 'ok' ? 'rgba(48,209,88,0.06)' : 'rgba(255,159,10,0.06)'
            }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ background: (response as { status: string }).status === 'ok' ? '#30D158' : '#FF9F0A' }} />
                <span className="font-semibold text-ios-label">
                  {(response as { status: string }).status === 'ok' ? '✓ Система работает' : '⚠ Degraded'}
                </span>
              </div>
              <span className="text-sm" style={{ color: 'rgba(60,60,67,0.5)' }}>
                {(response as { totalResponseTimeMs?: number }).totalResponseTimeMs}ms
              </span>
            </div>
            <pre className="text-xs px-5 py-4 overflow-x-auto max-h-56 overflow-y-auto"
              style={{ background: 'rgba(28,28,30,0.9)', color: '#30D158', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {JSON.stringify(response, null, 2)}
            </pre>
            {lastChecked && (
              <p className="text-xs px-5 py-3" style={{ color: 'rgba(60,60,67,0.45)' }}>
                Проверено: {new Date(lastChecked as string).toLocaleString('ru-RU')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
