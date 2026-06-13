import { NextResponse } from 'next/server';
import { getMorningData, getNightData, getDailyData } from '@/lib/sheets';
import { calcRecoveryScore } from '@/lib/recovery';

export const revalidate = 300; // 5 min cache

export async function GET() {
  try {
    const [morning, night, daily] = await Promise.all([
      getMorningData(),
      getNightData(),
      getDailyData(),
    ]);

    // Sort by date
    const sortByDate = <T extends { date: string }>(arr: T[]) =>
      [...arr].sort((a, b) => a.date.localeCompare(b.date));

    const sortedMorning = sortByDate(morning);
    const sortedNight = sortByDate(night);
    const sortedDaily = sortByDate(daily);

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    // Also try Japanese date format matching
    const findToday = <T extends { date: string }>(arr: T[]) =>
      arr.find(r => r.date === todayStr || r.date.replace(/\//g, '-') === todayStr);

    const todayMorning = findToday(sortedMorning) ?? sortedMorning[sortedMorning.length - 1];
    const todayNight = findToday(sortedNight) ?? sortedNight[sortedNight.length - 1];
    const todayDaily = findToday(sortedDaily) ?? sortedDaily[sortedDaily.length - 1];

    const score = calcRecoveryScore(
      { morning: todayMorning, night: todayNight, daily: todayDaily },
      { morning: sortedMorning, night: sortedNight, daily: sortedDaily }
    );

    // Last 7 days scores for trend chart
    const last7 = sortedDaily.slice(-7).map(d => {
      const m = sortedMorning.find(r => r.date === d.date);
      const n = sortedNight.find(r => r.date === d.date);
      const s = calcRecoveryScore(
        { morning: m, night: n, daily: d },
        { morning: sortedMorning, night: sortedNight, daily: sortedDaily }
      );
      return { date: d.date, score: s.total };
    });

    // Baseline metrics
    const hrvValues = sortedDaily.map(r => r.hrv).filter((v): v is number => v !== null);
    const last7Avg = last7.length ? Math.round(last7.reduce((a, b) => a + b.score, 0) / last7.length) : null;
    const last30Daily = sortedDaily.slice(-30);
    const last30Avg = last30Daily.length
      ? Math.round(
          last30Daily.map(d => {
            const m = sortedMorning.find(r => r.date === d.date);
            const n = sortedNight.find(r => r.date === d.date);
            return calcRecoveryScore({ morning: m, night: n, daily: d }, { morning: sortedMorning, night: sortedNight, daily: sortedDaily }).total;
          }).reduce((a, b) => a + b, 0) / last30Daily.length
        )
      : null;

    const prevScore = last7.length >= 2 ? last7[last7.length - 2]?.score : null;
    const delta24h = prevScore != null ? score.total - prevScore : null;

    return NextResponse.json({
      score,
      today: {
        morning: todayMorning ?? null,
        night: todayNight ?? null,
        daily: todayDaily ?? null,
      },
      trend: last7,
      baselines: {
        '7d': last7Avg,
        '30d': last30Avg,
        delta24h,
      },
      hrv30dAvg: hrvValues.length ? Math.round(hrvValues.slice(-30).reduce((a, b) => a + b, 0) / Math.min(hrvValues.length, 30)) : null,
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
