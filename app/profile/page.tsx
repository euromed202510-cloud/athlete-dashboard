export default function ProfilePage() {
  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-lg font-bold tracking-widest mb-4" style={{ color: 'var(--subtext)' }}>PROFILE</h1>
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {[
          { label: 'Subject', value: 'Yuki — #S1' },
          { label: 'Device', value: 'Apple Watch Series 10' },
          { label: 'Study Phase', value: 'Week 1〜2 (Baseline)' },
          { label: 'Data Start', value: '2026-04-12' },
          { label: 'Spreadsheet ID', value: '1n4FKz...' },
        ].map(item => (
          <div key={item.label} className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--subtext)' }}>{item.label}</span>
            <span className="text-xs font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
