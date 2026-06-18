import { NextResponse } from 'next/server';
import { getAutoHealthData, getMorningData, getDailyData } from '@/lib/sheets';

export async function GET() {
  const results: Record<string, unknown> = {};

  try { results.autoHealth = await getAutoHealthData('1'); }
  catch (e) { results.autoHealthError = String(e); }

  try { results.morning = (await getMorningData('S1')).slice(-1); }
  catch (e) { results.morningError = String(e); }

  try { results.daily = (await getDailyData('S1')).slice(-1); }
  catch (e) { results.dailyError = String(e); }

  results.env = {
    hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
  };

  return NextResponse.json(results);
}
