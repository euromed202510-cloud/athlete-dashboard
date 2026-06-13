'use client';

interface DataPoint {
  date: string;
  score: number;
}

interface Props {
  data: DataPoint[];
}

export default function TrendChart({ data }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-16" style={{ color: 'var(--subtext)', fontSize: '12px' }}>
        データ不足
      </div>
    );
  }

  const w = 300;
  const h = 60;
  const pad = 8;

  const scores = data.map(d => d.score);
  const min = Math.max(0, Math.min(...scores) - 10);
  const max = Math.min(100, Math.max(...scores) + 10);

  const xScale = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const yScale = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.score)}`)
    .join(' ');

  const areaD = `${pathD} L${xScale(data.length - 1)},${h} L${xScale(0)},${h} Z`;

  const latest = data[data.length - 1];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: '64px' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Today dot */}
        <circle
          cx={xScale(data.length - 1)}
          cy={yScale(latest.score)}
          r="3"
          fill="var(--gold)"
        />
      </svg>
      {/* Day labels */}
      <div className="flex justify-between px-1 mt-1">
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: '9px', color: 'var(--subtext)' }}>
            {i === data.length - 1 ? 'TODAY' : d.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}
