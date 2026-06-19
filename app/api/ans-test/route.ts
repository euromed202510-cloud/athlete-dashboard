import { NextRequest, NextResponse } from 'next/server';
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
  const id = searchParams.get('id') ?? '6';
  const stratosId = process.env.STRATOS_SHEETS_ID;
  if (!stratosId) return NextResponse.json({ error: 'STRATOS_SHEETS_ID not set' });

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: stratosId, range: "'ANS データ'!A:G" });
  const rows = (res.data.values as string[][]) ?? [];
  const matching = rows.filter(r => r[0] && String(r[0]).trim() === String(id).trim());
  const sample = rows.slice(0, 3);
  return NextResponse.json({ totalRows: rows.length, matchingForId: matching.length, lastMatch: matching.slice(-3), headerSample: sample });
}
