import ScoreRing from './ScoreRing';
import TrendChart from './TrendChart';
import SubCard from './SubCard';

async function getDashboardData(user = 'S1') {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/dashboard?user=${user}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

function getHour() {
  return new Date().getHours();
}

function greeting() {
  const h = getHour();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function TodayContent({ user = 'S1' }: { user?: string }) {
  const data = await getDashboardData(user);

  const score = data?.score ?? null;
  const trend = data?.trend ?? [];
  const baselines = data?.baselines ?? {};
  const today = data?.today ?? {};

  const daily = today?.daily ?? null;
  const morning = today?.morning ?? null;

  const actionIcon = score?.actionIcon ?? '—';
  const action = score?.action ?? 'データを取得中...';

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4 flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="text-xs tracking-widest" style={{ color: 'var(--subtext)' }}>
          {new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
        </p>
        <h1 className="text-xl font-semibold mt-0.5">{greeting()}, Yuki</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--subtext)' }}>
          {score
            ? `System ${score.status === 'PEAK' ? 'fully engaged' : score.status === 'GOOD' ? 'nominal' : score.status === 'CAUTION' ? 'under load' : 'in recovery'}.`
            : 'Awaiting data sync...'}
        </p>
      </div>

      {/* Body Bar */}
      <div
        className="rounded-xl p-3 grid grid-cols-4 gap-2"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {[
          { label: 'RHR', value: daily?.rhr ? `${daily.rhr}` : '—', unit: 'bpm' },
          { label: 'SpO2', value: daily?.spo2 ? `${daily.spo2}` : '—', unit: '%' },
          { label: 'RESP', value: daily?.breathRate ? `${daily.breathRate}` : '—', unit: '/min' },
          { label: 'TEMP', value: daily?.skinTemp != null ? `${daily.skinTemp > 0 ? '+' : ''}${daily.skinTemp}` : '—', unit: '℃' },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <span style={{ fontSize: '9px', color: 'var(--subtext)', letterSpacing: '0.06em' }}>{item.label}</span>
            <span className="font-bold" style={{ fontSize: '1rem', color: 'var(--text)' }}>{item.value}</span>
            <span style={{ fontSize: '9px', color: 'var(--subtext)' }}>{item.unit}</span>
          </div>
        ))}
      </div>

      {/* TOTAL SCORE */}
      <div
        className="rounded-xl p-4 flex flex-col items-center gap-4"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="w-full flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--subtext)' }}>TOTAL SCORE</span>
          <span className="text-xs" style={{ color: 'var(--subtext)' }}>HRV {daily?.hrv ? `${daily.hrv}ms` : '—'}</span>
        </div>

        {score ? (
          <ScoreRing score={score.total} status={score.status} />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ border: '8px solid var(--border)' }}>
              <span style={{ fontSize: '2rem', color: 'var(--subtext)' }}>—</span>
            </div>
          </div>
        )}

        {/* Trend */}
        <div className="w-full">
          <TrendChart data={trend} />
        </div>

        {/* Baselines */}
        <div className="w-full grid grid-cols-3 gap-2">
          {[
            { label: '7D BASE', value: baselines['7d'] != null ? `${baselines['7d']}` : '—' },
            { label: '30D BASE', value: baselines['30d'] != null ? `${baselines['30d']}` : '—' },
            { label: 'Δ24H', value: baselines.delta24h != null ? `${baselines.delta24h > 0 ? '+' : ''}${baselines.delta24h}` : '—' },
          ].map(b => (
            <div key={b.label} className="flex flex-col items-center gap-0.5 rounded-lg py-2" style={{ background: 'var(--bg)' }}>
              <span style={{ fontSize: '9px', color: 'var(--subtext)', letterSpacing: '0.06em' }}>{b.label}</span>
              <span className="font-bold text-sm">{b.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sub Cards 2x3 */}
      <div className="grid grid-cols-2 gap-3">
        <SubCard
          title="SLEEP"
          icon="💤"
          score={daily?.sleepDuration != null ? Math.round(Math.min(100, (daily.sleepDuration / 8) * 100)) : null}
          label={daily?.sleepDuration != null ? `${daily.sleepDuration.toFixed(1)}h` : 'No data'}
          detail={daily?.deepSleep != null ? `Deep: ${daily.deepSleep.toFixed(1)}h` : '—'}
        />
        <SubCard
          title="COGNITIVE"
          icon="🧠"
          score={morning?.reactionTime != null ? Math.round(Math.max(0, Math.min(100, ((400 - morning.reactionTime) / 200) * 100))) : null}
          label={morning?.reactionTime != null ? (morning.reactionTime < 250 ? 'Sharp' : morning.reactionTime < 320 ? 'Normal' : 'Dull') : 'No data'}
          detail={morning?.reactionTime != null ? `RT: ${morning.reactionTime}ms` : '—'}
        />
        <SubCard
          title="STRESS LOAD"
          icon="🌡️"
          score={morning?.fatigue != null ? Math.round(Math.max(0, 100 - morning.fatigue * 10)) : null}
          label={morning?.fatigue != null ? (morning.fatigue <= 3 ? 'Low' : morning.fatigue <= 6 ? 'Moderate' : 'High') : 'No data'}
          detail={morning?.fatigue != null ? `Fatigue: ${morning.fatigue}/10` : '—'}
        />
        <SubCard
          title="ADAPTABILITY"
          icon="📈"
          score={data?.hrv30dAvg && daily?.hrv ? Math.round(Math.min(100, (daily.hrv / data.hrv30dAvg) * 50 + 50)) : null}
          label={data?.hrv30dAvg && daily?.hrv ? (daily.hrv > data.hrv30dAvg ? 'Adapting' : 'Stable') : 'No data'}
          detail={data?.hrv30dAvg ? `30d avg: ${data.hrv30dAvg}ms` : '—'}
        />
        <SubCard
          title="BIO AGE"
          icon="🔬"
          score={null}
          label="N/A"
          detail="Future feature"
        />
        <SubCard
          title="CIRCADIAN"
          icon="🕐"
          score={null}
          label="No data"
          detail="Wake time tracking"
        />
      </div>

      {/* Action Matrix */}
      <div
        className="rounded-xl p-4 flex flex-col gap-2"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--subtext)' }}>TODAY'S ACTION</span>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '1.5rem' }}>{actionIcon.split(' ')[0]}</span>
          <div>
            <div className="font-bold text-sm">{actionIcon.includes(' ') ? actionIcon.split(' ').slice(1).join(' ') : actionIcon}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--subtext)' }}>{action}</div>
          </div>
        </div>
        {score && (
          <div className="flex gap-3 mt-1">
            <div className="text-xs" style={{ color: 'var(--subtext)' }}>
              HRV: <span style={{ color: score.hrvLevel === 'HIGH' ? 'var(--green)' : score.hrvLevel === 'LOW' ? 'var(--red)' : 'var(--text)' }}>
                {score.hrvLevel ?? '—'}
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--subtext)' }}>
              CMJ: <span style={{ color: score.cmjLevel === 'HIGH' ? 'var(--green)' : score.cmjLevel === 'LOW' ? 'var(--red)' : 'var(--text)' }}>
                {score.cmjLevel ?? '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
