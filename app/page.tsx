import { Suspense } from 'react';
import TodayContent from '@/components/TodayContent';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { user: userParam } = await searchParams;
  const user = userParam ?? 'S1';
  return (
    <Suspense fallback={<LoadingState />}>
      <TodayContent user={user} />
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
