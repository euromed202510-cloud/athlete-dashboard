'use client';

interface Props {
  score: number;
  status: 'PEAK' | 'GOOD' | 'CAUTION' | 'REST';
}

const statusColor = {
  PEAK: 'var(--gold)',
  GOOD: 'var(--green)',
  CAUTION: 'var(--blue)',
  REST: 'var(--red)',
};

export default function ScoreRing({ score, status }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = statusColor[status];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
          {/* Progress */}
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold" style={{ fontSize: '2.5rem', lineHeight: 1, color }}>
            {score}
          </span>
          <span className="text-xs tracking-widest mt-0.5" style={{ color: 'var(--subtext)' }}>
            /100
          </span>
        </div>
      </div>
      <span
        className="text-xs font-bold tracking-widest px-3 py-1 rounded-full"
        style={{ background: color + '22', color, border: `1px solid ${color}44` }}
      >
        {status}
      </span>
    </div>
  );
}
