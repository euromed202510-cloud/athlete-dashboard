import CoachContent from '@/components/CoachContent';

export const dynamic = 'force-dynamic';

export default function CoachPage({
  searchParams,
}: {
  searchParams: { user?: string };
}) {
  const user = searchParams.user ?? 'S1';
  return <CoachContent user={user} />;
}
