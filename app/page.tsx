import { Suspense } from 'react';
import TodayContent from '@/components/TodayContent';

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <TodayContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--subtext)' }}>
      <div className="text-center">
        <div className="text-2xl mb-2">⚡</div>
        <div className="text-sm tracking-widest">LOADING...</div>
      </div>
    </div>
  );
}
