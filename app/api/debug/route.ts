import { NextRequest, NextResponse } from 'next/server';
import { getAutoHealthData, getMorningData, getDailyData } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get('user') ?? 'S1';
  const id = user.replace(/^S/, '');
  const results: Record<string, unknown> = {};

  try { results.autoHealth = (await getAutoHealthData(id)).slice(-3); }
  catch (e) { results.autoHealthError = String(e); }

  try { results.morning = (await getMorningData(user)).slice(-1); }
  catch (e) { results.morningError = String(e); }

  try { results.daily = (await getDailyData(user)).slice(-1); }
  catch (e) { results.dailyError = String(e); }

  results.env = {
    hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
    hasStratosId: !!process.env.STRATOS_SHEETS_ID,
  };

  return NextResponse.json(results);
}
