import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SECRET_TOKEN = process.env.HEALTH_IMPORT_TOKEN ?? 'athlete2026';
const SHEET_NAME = 'AutoHealth';
const HEADER = ['Date', 'ID', 'HRV (ms)', 'RHR (bpm)', 'SpO2 (%)', 'Resp Rate (/min)', 'Wrist Temp (℃)', 'Sleep Total (h)', 'Deep Sleep (h)', 'REM Sleep (h)'];

function getAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY ?? '';
  if (!privateKey.includes('BEGIN')) {
    privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
  }
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (token !== SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, id = 'S1', hrv, rhr, spo2, respRate, wristTemp, sleepTotal, deepSleep, remSleep } = body;

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // AutoHealthシートの既存データを取得
    let existingValues: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!A:J` });
      existingValues = (res.data.values as string[][]) ?? [];
    } catch {
      // シートが存在しない場合はヘッダーを追加して作成
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADER] },
      });
      existingValues = [HEADER];
    }

    const newRow = [date, id, hrv ?? '', rhr ?? '', spo2 ?? '', respRate ?? '', wristTemp ?? '', sleepTotal ?? '', deepSleep ?? '', remSleep ?? ''];

    // 同じ日付+IDの行があれば更新
    let updatedRow = -1;
    for (let i = 1; i < existingValues.length; i++) {
      if (existingValues[i][0] === date && existingValues[i][1] === id) {
        updatedRow = i + 1;
        break;
      }
    }

    if (updatedRow > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A${updatedRow}:J${updatedRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [newRow] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAME}!A:J`,
        valueInputOption: 'RAW',
        requestBody: { values: [newRow] },
      });
    }

    return NextResponse.json({ success: true, date, id });
  } catch (err) {
    console.error('Health import error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
