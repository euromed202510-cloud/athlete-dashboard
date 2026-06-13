'use client';

interface Props {
  title: string;
  score: number | null;
  label: string;
  detail: string;
  icon: string;
}

export default function SubCard({ title, score, label, detail, icon }: Props) {
  const color = score == null
    ? 'var(--subtext)'
    : score >= 75 ? 'var(--green)'
    : score >= 50 ? 'var(--blue)'
    : score >= 30 ? 'var(--gold)'
    : 'var(--red)';

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: '10px', color: 'var(--subtext)', fontWeight: 600, letterSpacing: '0.08em' }}>
          {icon} {title}
        </span>
        {score != null && (
          <span style={{ fontSize: '10px', color, fontWeight: 700 }}>{score}</span>
        )}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>
        {score != null ? `${score}/100` : 'N/A'}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--subtext)' }}>{label}</div>
      <div style={{ fontSize: '9px', color: 'var(--subtext)', opacity: 0.7 }}>{detail}</div>
    </div>
  );
}
