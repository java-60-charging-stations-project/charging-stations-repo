export default function Settings() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ios-label tracking-tight">Settings</h1>
        <p className="text-base mt-1" style={{ color: 'rgba(60,60,67,0.55)' }}>
          Notifications and preferences
        </p>
      </div>

      <div className="glass rounded-3xl p-6 max-w-lg">
        <div className="space-y-5">
          {[
            { label: 'Email notifications', desc: 'Receive charging session updates via email', enabled: true },
            { label: 'Session reminders', desc: 'Remind me when charging is complete', enabled: false },
            { label: 'Cost alerts', desc: 'Alert when session cost exceeds a threshold', enabled: false },
          ].map(({ label, desc, enabled }) => (
            <div key={label} className="flex items-center justify-between py-3"
              style={{ borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
              <div>
                <p className="text-sm font-semibold text-ios-label">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(60,60,67,0.5)' }}>{desc}</p>
              </div>
              <div className={`w-12 h-7 rounded-full transition-colors duration-200 flex items-center px-1 cursor-pointer ${enabled ? 'justify-end' : 'justify-start'}`}
                style={{ background: enabled ? '#30D158' : 'rgba(120,120,128,0.2)' }}>
                <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs mt-6 text-center" style={{ color: 'rgba(60,60,67,0.4)' }}>
          Settings are saved automatically
        </p>
      </div>
    </div>
  )
}
