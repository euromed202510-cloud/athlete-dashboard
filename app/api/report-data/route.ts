import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SECRET_TOKEN = process.env.HEALTH_IMPORT_TOKEN ?? 'athlete2026';

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY ?? '';
  if (!privateKey.includes('BEGIN')) privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  if (privateKey.includes('\\n')) privateKey = privateKey.replace(/\\n/g, '\n');
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

// レポート生成用に全シートの生データを返す
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== SECRET_TOKEN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const mainId = process.env.GOOGLE_SHEETS_ID;
  const stratosId = process.env.STRATOS_SHEETS_ID;

  const get = async (spreadsheetId: string | undefined, range: string) => {
    if (!spreadsheetId) return [];
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      return (res.data.values as string[][]) ?? [];
    } catch {
      return [];
    }
  };

  const [morning, night, autoHealth, workout, ans, stratosMorning, stratosNight] = await Promise.all([
    get(mainId, '朝!A:Z'),
    get(mainId, '夜!A:Z'),
    get(mainId, 'AutoHealth!A:J'),
    get(mainId, 'Workout!A:I'),
    get(stratosId, "'ANS データ'!A:G"),
    get(stratosId, '朝!A:Z'),
    get(stratosId, '夜!A:Z'),
  ]);

  return NextResponse.json({ morning, night, autoHealth, workout, ans, stratosMorning, stratosNight });
}
