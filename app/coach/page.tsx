import CoachContent from '@/components/CoachContent';

export const dynamic = 'force-dynamic';

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user: userParam } = await searchParams;
  const user = userParam ?? 'S1';
  return <CoachContent user={user} />;
}
