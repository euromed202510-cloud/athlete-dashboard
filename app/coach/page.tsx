export default function CoachPage() {
  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <h1 className="text-lg font-bold tracking-widest mb-4" style={{ color: 'var(--subtext)' }}>COACH</h1>
      <div className="rounded-xl p-6 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--subtext)' }}>Phase 2 で実装予定</p>
        <p className="text-xs mt-1" style={{ color: 'var(--subtext)', opacity: 0.6 }}>Claude API によるAIコーチング</p>
      </div>
    </div>
  );
}
