import { NextRequest, NextResponse } from 'next/server';
import { getAutoHealthData, getMorningData, getDailyData } from '@/lib/sheets';
import { google } from 'googleapis';

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY ?? '';
  if (!privateKey.includes('BEGIN')) privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

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

  // ANS raw debug
  try {
    const stratosId = process.env.STRATOS_SHEETS_ID;
    if (stratosId) {
      const auth = getAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: stratosId, range: "'ANS データ'!A:G" });
      const rows = (res.data.values as string[][]) ?? [];
      const matchingRows = rows.filter(r => r[0] && String(r[0]) === String(id));
      results.ansRaw = { totalRows: rows.length, matchingForId: matchingRows.length, lastMatch: matchingRows.slice(-2) };
    }
  } catch (e) { results.ansError = String(e); }

  results.env = {
    hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
    hasStratosId: !!process.env.STRATOS_SHEETS_ID,
    stratosId: process.env.STRATOS_SHEETS_ID,
  };

  return NextResponse.json(results);
}
